/**
 * On-Route Map View — Primary navigation screen.
 * Shows MapLibre map with route polyline, user position, hotspot markers.
 * Implements Mode B: On-Route Navigation (internal, offline).
 */

import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RouteMap } from '@/components/RouteMap';
import { ThemedText } from '@/components/themed-text';
import { Brand, RouteColors, Spacing, TouchTarget } from '@/constants/theme';
import { getItinerary, getRouteCoordinates } from '@/src/data';
import {
  buildGeofenceRegions,
  isAtStartingPoint,
  isContentAccessible,
} from '@/src/services/geofence';
import { registerGeofences, startForegroundTracking, unregisterGeofences } from '@/src/services/location';
import { navigateToRoutePoint } from '@/src/services/navigation';
import {
  computeGuidance,
  estimateTimeMinutes,
  formatDistance,
} from '@/src/services/routeGuidance';
import { useLocationStore } from '@/src/stores/useLocationStore';
import { useRouteStore } from '@/src/stores/useRouteStore';
import { useVisitStore } from '@/src/stores/useVisitStore';
import type { Hotspot, UserLocation } from '@/src/types';
import { closestCoordIndex, haversineDistance } from '@/src/utils/geo';
import { GPSSmoother } from '@/src/utils/kalmanFilter';

export default function RouteMapScreen() {
  useKeepAwake(); // Prevent screen sleep during navigation

  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const itinerary = getItinerary(id!);
  const routeCoords = itinerary ? getRouteCoordinates(itinerary) : [];

  // Store state
  const {
    navigationMode,
    guidance,
    currentHotspotIndex,
    visitedHotspotIds,
    unlockedHotspotIds,
    hotspotEntryTimestamps,
    setNavigationMode,
    updateGuidance,
    markHotspotVisited,
    unlockHotspot,
    lockHotspot,
    recordHotspotEntry,
    completeRoute,
    exitRoute,
  } = useRouteStore();

  const { currentLocation, updateLocation } = useLocationStore();
  const { markVisited, setActiveRoute } = useVisitStore();

  // ─── Refs for mutable store values ─────────────────────────
  // Updating refs synchronously on every render ensures the GPS callback
  // (which has a stable closure over the refs) always reads the latest values
  // without needing to be re-registered whenever these values change.
  const navigationModeRef = useRef(navigationMode);
  navigationModeRef.current = navigationMode;

  const currentHotspotIndexRef = useRef(currentHotspotIndex);
  currentHotspotIndexRef.current = currentHotspotIndex;

  const visitedHotspotIdsRef = useRef(visitedHotspotIds);
  visitedHotspotIdsRef.current = visitedHotspotIds;

  const unlockedHotspotIdsRef = useRef(unlockedHotspotIds);
  unlockedHotspotIdsRef.current = unlockedHotspotIds;

  const hotspotEntryTimestampsRef = useRef(hotspotEntryTimestamps);
  hotspotEntryTimestampsRef.current = hotspotEntryTimestamps;

  const [offRouteSeconds, setOffRouteSeconds] = useState(0);
  const [followMode, setFollowMode] = useState(false);
  const followModeRef = useRef(false);
  const [compassHeading, setCompassHeading] = useState<number | null>(null);
  const [hotspotPopup, setHotspotPopup] = useState<Hotspot | null>(null);
  // Tracks which hotspots have already shown a popup this session — prevents
  // repeated GPS ticks from re-triggering the same popup.
  const shownPopupIdsRef = useRef(new Set<string>());
  const smootherRef = useRef(new GPSSmoother());
  const trackingRef = useRef<{ remove: () => void } | null>(null);

  // ─── Dev Mode — bypasses geofencing so all hotspots are tappable ──
  // TODO: set to false for production release
  const devMode = false;

  // ─── GPS Tracking ──────────────────────────────────────────
  useEffect(() => {
    if (!itinerary) return;

    setActiveRoute(itinerary.id);

    // Register native background geofences so the OS can wake the app
    // when the user enters/exits a hotspot region even when backgrounded.
    registerGeofences(buildGeofenceRegions(itinerary));

    trackingRef.current = startForegroundTracking((rawLocation: UserLocation) => {
      // Smooth GPS readings
      const smoothed = smootherRef.current.update(
        rawLocation.latitude,
        rawLocation.longitude,
        rawLocation.accuracy,
        rawLocation.timestamp,
      );

      const location: UserLocation = {
        ...rawLocation,
        latitude: smoothed.latitude,
        longitude: smoothed.longitude,
      };

      updateLocation(location);

      // Read latest values from refs — avoids stale closure bugs where
      // currentHotspotIndex / visitedHotspotIds change between GPS ticks
      // without this callback being re-registered.
      const navMode = navigationModeRef.current;
      const hotspotIdx = currentHotspotIndexRef.current;
      const visitedIds = visitedHotspotIdsRef.current;
      const unlockedIds = unlockedHotspotIdsRef.current;
      const entryTimestamps = hotspotEntryTimestampsRef.current;

      // Compute guidance
      if (routeCoords.length > 0) {
        const newGuidance = computeGuidance(
          location,
          routeCoords,
          itinerary,
          hotspotIdx,
          visitedIds,
        );
        updateGuidance(newGuidance);

        // Check starting point arrival
        if (navMode === 'navigating_to_start') {
          if (
            isAtStartingPoint(
              itinerary,
              location.latitude,
              location.longitude,
              location.accuracy,
            )
          ) {
            setNavigationMode('on_route');
          }
        }

        // Check hotspot geofences
        if (navMode === 'on_route') {
          for (const hs of itinerary.hotspots) {
            const accessible = isContentAccessible(
              hs,
              location.latitude,
              location.longitude,
              location.accuracy,
              entryTimestamps[hs.id],
            );

            if (accessible && !unlockedIds.has(hs.id)) {
              unlockHotspot(hs.id);
              recordHotspotEntry(hs.id);
              // Show popup — stay in follow mode, user dismisses to continue.
              if (!shownPopupIdsRef.current.has(hs.id)) {
                shownPopupIdsRef.current.add(hs.id);
                setHotspotPopup(hs);
              }
            } else if (!accessible && unlockedIds.has(hs.id)) {
              lockHotspot(hs.id);
            }
          }
        }
      }
    });

    return () => {
      trackingRef.current?.remove();
      unregisterGeofences();
    };
    // Intentionally depends only on itinerary?.id — mutable store values
    // are accessed via refs above so no re-registration is needed when they change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itinerary?.id]);

  // Subscribe to magnetometer heading only while follow mode is active.
  // Uses the same compass sensor that drives the GPS dot arrow in normal mode.
  useEffect(() => {
    if (!followMode) {
      setCompassHeading(null);
      return;
    }
    let sub: Location.LocationSubscription | null = null;
    let removed = false;
    (async () => {
      sub = await Location.watchHeadingAsync((heading) => {
        const h = heading.trueHeading >= 0 ? heading.trueHeading : heading.magHeading;
        if (h >= 0) setCompassHeading(h);
      });
      if (removed) sub.remove();
    })();
    return () => {
      removed = true;
      sub?.remove();
    };
  }, [followMode]);

  // Track off-route time
  useEffect(() => {
    if (guidance?.isOffRoute) {
      const timer = setInterval(() => {
        setOffRouteSeconds((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setOffRouteSeconds(0);
    }
  }, [guidance?.isOffRoute]);

  // ─── Handlers ──────────────────────────────────────────────
  const handleExitRoute = useCallback(() => {
    Alert.alert(t('route.exitTitle'), t('route.exitMessage'), [
      { text: t('route.cancel'), style: 'cancel' },
      {
        text: t('route.exit'),
        style: 'destructive',
        onPress: () => {
          exitRoute();
          setActiveRoute(null);
          router.back();
        },
      },
    ]);
  }, [exitRoute, setActiveRoute, router, t]);

  const handleHotspotTap = useCallback(
    (hs: Hotspot) => {
      if (!devMode && !hs.isActive) return;

      // Dev mode: bypass geofence — open any hotspot directly
      if (devMode || unlockedHotspotIds.has(hs.id)) {
        markHotspotVisited(hs.id);
        markVisited(hs.id);
        router.push(`/hotspot/${hs.id}?itineraryId=${itinerary!.id}${devMode ? '&devMode=1' : ''}`);
      } else {
        Alert.alert(
          t('route.contentLockedTitle'),
          t('route.contentLockedMessage', {
            distance: currentLocation
              ? formatDistance(
                  haversineDistance(
                    currentLocation.latitude,
                    currentLocation.longitude,
                    hs.latitude,
                    hs.longitude,
                  ),
                )
              : '?',
          }),
          [{ text: t('route.ok') }],
        );
      }
    },
    [devMode, unlockedHotspotIds, markHotspotVisited, markVisited, router, itinerary, currentLocation, t],
  );

  const handleNavigateBackToRoute = useCallback(() => {
    if (guidance?.nearestPointOnRoute) {
      navigateToRoutePoint(
        guidance.nearestPointOnRoute[1],
        guidance.nearestPointOnRoute[0],
      );
    }
  }, [guidance]);

  // Coords of the ahead path — from current position projected onto the route
  // to the next hotspot's coord. Rendered as a red highlight on the map.
  const highlightCoords = useMemo((): [number, number][] => {
    if (!guidance || !itinerary || routeCoords.length === 0) return [];
    // guidance.nextHotspotIndex already skips visited hotspots.
    // Also skip any currently-unlocked hotspot (user is physically standing at it)
    // so the line points ahead to the next unvisited, unreached target.
    const hotspots = itinerary.hotspots;
    let nextIdx = guidance.nextHotspotIndex;
    while (nextIdx < hotspots.length && unlockedHotspotIds.has(hotspots[nextIdx].id)) {
      nextIdx++;
    }
    if (nextIdx >= hotspots.length) return [];
    const nextHs = hotspots[nextIdx];
    const nearestIdx = guidance.currentSegmentIndex;
    const hotspotIdx = closestCoordIndex(nextHs.latitude, nextHs.longitude, routeCoords);
    if (hotspotIdx <= nearestIdx) return [];
    return [
      guidance.nearestPointOnRoute,
      ...routeCoords.slice(nearestIdx + 1, hotspotIdx + 1),
    ];
  }, [guidance, itinerary, routeCoords, unlockedHotspotIds]);

  if (!itinerary) {
    return (
      <View style={[styles.container, styles.center]}>
        <ThemedText>{t('route.notFound')}</ThemedText>
      </View>
    );
  }

  const nextHotspot = itinerary.hotspots[guidance?.nextHotspotIndex ?? currentHotspotIndex];
  const progress = visitedHotspotIds.size / itinerary.hotspots.length;

  // Check if route is complete (all active hotspots visited)
  const allActiveVisited = itinerary.hotspots
    .filter((h) => h.isActive)
    .every((h) => visitedHotspotIds.has(h.id));

  return (
    <View style={styles.container}>
      {/* Map Area — MapLibre GL with offline MBTiles */}
      <View style={styles.mapContainer}>
        <RouteMap
          routeCoords={routeCoords}
          hotspots={itinerary.hotspots}
          unlockedHotspotIds={
            devMode
              ? new Set(itinerary.hotspots.map((h) => h.id))
              : unlockedHotspotIds
          }
          visitedHotspotIds={visitedHotspotIds}
          onHotspotPress={handleHotspotTap}
          highlightCoords={highlightCoords}
          followMode={followMode}
          followHeading={compassHeading ?? undefined}
          onFollowModeBreak={() => {
            followModeRef.current = false;
            setFollowMode(false);
          }}
        />
        <Pressable
          onPress={() => {
            const next = !followMode;
            followModeRef.current = next;
            setFollowMode(next);
          }}
          style={[styles.followButton, followMode && styles.followButtonActive]}
          hitSlop={8}
        >
          <Ionicons
            name={followMode ? 'navigate' : 'navigate-outline'}
            size={24}
            color={followMode ? '#FFFFFF' : Brand.primary}
          />
        </Pressable>
      </View>

      {/* Top Bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.xs }]}>
        <Pressable
          onPress={handleExitRoute}
          style={styles.topButton}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
          <ThemedText style={styles.topButtonText}>{t('route.exit')}</ThemedText>
        </Pressable>

        {/* GPS accuracy indicator */}
        {currentLocation && currentLocation.accuracy > 30 && (
          <View style={styles.gpsWarning}>
            <Ionicons name="warning" size={16} color={Brand.warning} />
            <ThemedText style={styles.gpsWarningText}>{t('route.weakGps')}</ThemedText>
          </View>
        )}
      </View>

      {/* Off-Route Warning Banner */}
      {guidance?.isOffRoute && navigationMode === 'on_route' && (
        <View style={styles.offRouteBanner}>
          <Ionicons name="alert-circle" size={20} color="#fff" />
          <ThemedText style={styles.offRouteText}>
            {t('route.offRoute')}
          </ThemedText>
          {offRouteSeconds > 60 && (
            <Pressable
              onPress={handleNavigateBackToRoute}
              style={styles.offRouteButton}
            >
              <ThemedText style={styles.offRouteButtonText}>
                {t('route.backToRoute')}
              </ThemedText>
            </Pressable>
          )}
        </View>
      )}

      {/* Navigating to Start Banner */}
      {navigationMode === 'navigating_to_start' && (
        <View style={styles.navigatingBanner}>
          <Ionicons name="navigate" size={20} color="#fff" />
          <ThemedText style={styles.navigatingText}>
            {t('route.reachingStart')}
          </ThemedText>
        </View>
      )}

      {/* Bottom Info Card */}
      <View style={[styles.bottomCard, { paddingBottom: insets.bottom + Spacing.sm }]}>
        {nextHotspot && (
          <>
            <View style={styles.nextHotspotRow}>
              <ThemedText style={styles.nextLabel}>{t('route.nextStop')}</ThemedText>
              <ThemedText style={styles.nextName} numberOfLines={1}>
                {nextHotspot.title}
              </ThemedText>
            </View>
            <View style={styles.distanceRow}>
              <ThemedText style={styles.distanceText}>
                {guidance
                  ? formatDistance(guidance.distanceToNextHotspot)
                  : '...'}
              </ThemedText>
              <ThemedText style={styles.distanceDivider}>·</ThemedText>
              <ThemedText style={styles.distanceText}>
                ~{guidance ? estimateTimeMinutes(guidance.distanceToNextHotspot) : '?'}{' '}
                {t('units.min')}
              </ThemedText>
            </View>
          </>
        )}

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${progress * 100}%` }]}
            />
          </View>
          <ThemedText style={styles.progressText}>
            {t('route.stopsProgress', {
              visited: visitedHotspotIds.size,
              total: itinerary.hotspots.length,
            })}
          </ThemedText>
          {devMode && (
            <View style={styles.devBadge}>
              <ThemedText style={styles.devBadgeText}>DEV</ThemedText>
            </View>
          )}
        </View>

        {/* Complete button */}
        {allActiveVisited && (
          <Pressable
            onPress={() => {
              completeRoute();
              router.replace(`/complete/${itinerary.id}`);
            }}
            style={styles.completeButton}
          >
            <ThemedText style={styles.completeButtonText}>
              {t('route.routeCompleted')}
            </ThemedText>
          </Pressable>
        )}
      </View>

      {/* ── Hotspot arrival popup — shows automatically on geofence entry ── */}
      <Modal
        visible={hotspotPopup !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setHotspotPopup(null)}
      >
        <View style={styles.popupOverlay}>
          <View style={styles.popupCard}>
            <View style={styles.popupBadge}>
              <ThemedText style={styles.popupBadgeText}>
                {hotspotPopup?.sequence}
              </ThemedText>
            </View>
            <ThemedText style={styles.popupTitle} numberOfLines={2}>
              {hotspotPopup?.title}
            </ThemedText>
            {hotspotPopup?.shortDescription ? (
              <ThemedText style={styles.popupDesc} numberOfLines={3}>
                {hotspotPopup.shortDescription}
              </ThemedText>
            ) : null}
            <View style={styles.popupButtons}>
              <Pressable
                style={styles.popupButtonSecondary}
                onPress={() => setHotspotPopup(null)}
              >
                <ThemedText style={styles.popupButtonSecondaryText}>
                  {t('route.continue')}
                </ThemedText>
              </Pressable>
              <Pressable
                style={styles.popupButtonPrimary}
                onPress={() => {
                  const hs = hotspotPopup!;
                  markHotspotVisited(hs.id);
                  markVisited(hs.id);
                  setHotspotPopup(null);
                  router.push(`/hotspot/${hs.id}?itineraryId=${itinerary.id}`);
                }}
              >
                <ThemedText style={styles.popupButtonPrimaryText}>
                  {t('route.viewContent')}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F0F0',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  topButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: TouchTarget.minSize,
    minWidth: TouchTarget.minSize,
    justifyContent: 'center',
  },
  topButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  gpsWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Brand.warning + '30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  gpsWarningText: {
    fontSize: 12,
    color: Brand.warning,
    fontWeight: '600',
  },
  offRouteBanner: {
    position: 'absolute',
    top: 100,
    left: Spacing.md,
    right: Spacing.md,
    backgroundColor: RouteColors.offRouteWarning,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  offRouteText: {
    color: '#fff',
    fontWeight: '600',
    flex: 1,
  },
  offRouteButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  offRouteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  navigatingBanner: {
    position: 'absolute',
    top: 100,
    left: Spacing.md,
    right: Spacing.md,
    backgroundColor: Brand.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: 10,
  },
  navigatingText: {
    color: '#fff',
    fontWeight: '600',
  },
  bottomCard: {
    backgroundColor: '#fff',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  nextHotspotRow: {
    marginBottom: Spacing.xs,
  },
  nextLabel: {
    fontSize: 12,
    color: Brand.gray500,
  },
  nextName: {
    fontSize: 16,
    fontWeight: '700',
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  distanceText: {
    fontSize: 14,
    color: Brand.gray600,
    fontWeight: '500',
  },
  distanceDivider: {
    color: Brand.gray400,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: Brand.gray200,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Brand.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: Brand.gray500,
    fontWeight: '500',
  },
  completeButton: {
    backgroundColor: Brand.success,
    paddingVertical: Spacing.md,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: Spacing.sm,
    minHeight: TouchTarget.minSize,
    justifyContent: 'center',
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  followButton: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  followButtonActive: {
    backgroundColor: Brand.primary,
  },
  devBadge: {
    backgroundColor: '#E74C3C',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  devBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  popupOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  popupCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  popupBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  popupBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
  popupTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  popupDesc: {
    fontSize: 14,
    color: Brand.gray600,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  popupButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
  },
  popupButtonSecondary: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Brand.gray300,
    alignItems: 'center',
    minHeight: TouchTarget.minSize,
    justifyContent: 'center',
  },
  popupButtonSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: Brand.gray600,
  },
  popupButtonPrimary: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    backgroundColor: Brand.primary,
    alignItems: 'center',
    minHeight: TouchTarget.minSize,
    justifyContent: 'center',
  },
  popupButtonPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
