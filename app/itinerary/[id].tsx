/**
 * Itinerary Detail Screen
 * Shows full details: cover image, stats, hotspot list, map preview, start button.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Pressable,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, DifficultyColors, Spacing, TouchTarget } from '@/constants/theme';
import { getItinerary, getRouteGeoJSON } from '@/src/data';
import { useRouteStore, loadPersistedSession, clearPersistedSession } from '@/src/stores/useRouteStore';
import { useLocationStore } from '@/src/stores/useLocationStore';
import { useVisitStore } from '@/src/stores/useVisitStore';
import { requestLocationPermission, getCurrentPosition } from '@/src/services/location';
import { haversineDistance } from '@/src/utils/geo';
import { openNativeNavigation } from '@/src/services/navigation';
import type { Hotspot } from '@/src/types';

function HotspotListItem({
  hotspot,
  isVisited,
}: {
  hotspot: Hotspot;
  isVisited: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.hotspotItem}>
      <View
        style={[
          styles.hotspotSequence,
          {
            backgroundColor: hotspot.isActive
              ? Brand.accent + '20'
              : Brand.gray200,
          },
        ]}
      >
        {isVisited ? (
          <Ionicons name="checkmark" size={16} color={Brand.success} />
        ) : (
          <ThemedText
            style={[
              styles.hotspotSequenceText,
              { color: hotspot.isActive ? Brand.accent : Brand.gray500 },
            ]}
          >
            {hotspot.sequence}
          </ThemedText>
        )}
      </View>
      <View style={styles.hotspotInfo}>
        <ThemedText style={styles.hotspotTitle} numberOfLines={1}>
          {hotspot.title}
        </ThemedText>
        <ThemedText style={styles.hotspotDesc} numberOfLines={1}>
          {hotspot.shortDescription}
        </ThemedText>
      </View>
      {hotspot.isActive && (
        <View style={styles.activeBadge}>
          <ThemedText style={styles.activeBadgeText}>{t('itinerary.active')}</ThemedText>
        </View>
      )}
    </View>
  );
}

export default function ItineraryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const itinerary = getItinerary(id!);
  const startRoute = useRouteStore((s) => s.startRoute);
  const resumeRoute = useRouteStore((s) => s.resumeRoute);
  const setPermission = useLocationStore((s) => s.setPermission);
  const isHotspotVisited = useVisitStore((s) => s.isHotspotVisited);
  const markItineraryStarted = useVisitStore((s) => s.markItineraryStarted);
  const [isStarting, setIsStarting] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    if (!itinerary) return;
    loadPersistedSession(itinerary.id).then((session) => {
      setHasSession(session !== null && session.visitedHotspotIds.length > 0);
    });
  }, [itinerary?.id]);

  const handleClearSession = useCallback(async () => {
    if (!itinerary || !hasSession) return;
    await clearPersistedSession(itinerary.id);
    setHasSession(false);
  }, [itinerary, hasSession]);

  const handleStartRoute = useCallback(async () => {
    if (!itinerary || isStarting) return;
    setIsStarting(true);

    try {
      // Request permissions
      const hasPermission = await requestLocationPermission();
      setPermission(hasPermission, !hasPermission);

      if (!hasPermission) {
        Alert.alert(
          t('itinerary.gpsPermissionTitle'),
          t('itinerary.gpsPermissionMessage'),
        );
        setIsStarting(false);
        return;
      }

      const geojson = getRouteGeoJSON(itinerary);
      if (!geojson) {
        Alert.alert(t('itinerary.errorTitle'), t('itinerary.routeDataUnavailable'));
        setIsStarting(false);
        return;
      }

      // Resume persisted progress or start fresh
      const session = await loadPersistedSession(itinerary.id);
      if (session && session.visitedHotspotIds.length > 0) {
        resumeRoute(itinerary, geojson, session);
      } else {
        startRoute(itinerary, geojson);
      }
      await markItineraryStarted(itinerary.id);

      // Check distance to starting point
      const position = await getCurrentPosition();
      if (position) {
        const distToStart = haversineDistance(
          position.latitude,
          position.longitude,
          itinerary.startingPoint.latitude,
          itinerary.startingPoint.longitude,
        );

        if (distToStart > 200) {
          // Far from start — offer external navigation
          Alert.alert(
            t('itinerary.reachStartTitle'),
            t('itinerary.reachStartMessage', {
              distance: (distToStart / 1000).toFixed(1),
            }),
            [
              {
                text: t('itinerary.openMaps'),
                onPress: () => {
                  openNativeNavigation(
                    itinerary.startingPoint.latitude,
                    itinerary.startingPoint.longitude,
                    itinerary.startingPoint.name,
                  );
                  // Navigate to route screen (will monitor for arrival)
                  router.push(`/route/${itinerary.id}`);
                },
              },
              {
                text: t('itinerary.goToMap'),
                onPress: () => router.push(`/route/${itinerary.id}`),
              },
            ],
          );
        } else {
          // Near start — go directly to route map
          router.push(`/route/${itinerary.id}`);
        }
      } else {
        // Couldn't get position — go to route map anyway
        router.push(`/route/${itinerary.id}`);
      }
    } finally {
      setIsStarting(false);
    }
  }, [itinerary, isStarting, startRoute, resumeRoute, setPermission, markItineraryStarted, router, t]);

  if (!itinerary) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>{t('itinerary.notFound')}</ThemedText>
      </ThemedView>
    );
  }

  const hours = Math.floor(itinerary.estimatedDurationMinutes / 60);
  const mins = itinerary.estimatedDurationMinutes % 60;
  const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  const activeCount = itinerary.hotspots.filter((h) => h.isActive).length;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          {itinerary.coverImage ? (
            <Image
              source={{ uri: itinerary.coverImage }}
              style={styles.heroImage}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder]}>
              <Ionicons name="bicycle" size={80} color={Brand.accent + '60'} />
            </View>
          )}
        </View>

        <View style={styles.content}>
          {/* Title */}
          <ThemedText style={styles.title}>{itinerary.title}</ThemedText>
          <ThemedText style={styles.description}>
            {itinerary.description}
          </ThemedText>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="resize-outline" size={18} color={Brand.accent} />
              <ThemedText style={styles.statValue}>
                {itinerary.distanceKm} km
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={18} color={Brand.accent} />
              <ThemedText style={styles.statValue}>{durationStr}</ThemedText>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="trending-up" size={18} color={Brand.accent} />
              <ThemedText style={styles.statValue}>
                {itinerary.elevationGainM}m
              </ThemedText>
            </View>
          </View>

          {/* Difficulty + Terrain */}
          <View style={styles.tagsRow}>
            <View
              style={[
                styles.diffBadge,
                {
                  backgroundColor:
                    (DifficultyColors[itinerary.difficulty] ?? Brand.gray400) + '20',
                  borderColor: DifficultyColors[itinerary.difficulty] ?? Brand.gray400,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.diffBadgeText,
                  {
                    color: DifficultyColors[itinerary.difficulty] ?? Brand.gray400,
                  },
                ]}
              >
                {t(`difficulty.${itinerary.difficulty}`, itinerary.difficulty)}
              </ThemedText>
            </View>
            {itinerary.terrain.map((ter) => (
              <View key={ter} style={styles.terrainTag}>
                <ThemedText style={styles.terrainText}>
                  {t(`terrain.${ter}`, ter)}
                </ThemedText>
              </View>
            ))}
          </View>

          {/* Starting Point */}
          <View style={styles.startingPointBox}>
            <Ionicons name="flag" size={20} color={Brand.success} />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.startLabel}>{t('itinerary.startingPoint')}</ThemedText>
              <ThemedText style={styles.startName}>
                {itinerary.startingPoint.name}
              </ThemedText>
            </View>
          </View>

          {/* Hotspot List */}
          <View style={styles.hotspotSection}>
            <ThemedText style={styles.sectionTitle}>
              {t('itinerary.hotspotCount', {
                count: itinerary.hotspots.length,
                active: activeCount,
              })}
            </ThemedText>
            {itinerary.hotspots.map((hs) => (
              <HotspotListItem
                key={hs.id}
                hotspot={hs}
                isVisited={isHotspotVisited(hs.id)}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Start Route Button */}
      <View
        style={[
          styles.startButtonContainer,
          { paddingBottom: insets.bottom + Spacing.md },
        ]}
      >
        <Pressable
          onPress={handleClearSession}
          disabled={!hasSession}
          style={({ pressed }) => [
            styles.clearButton,
            !hasSession && styles.clearButtonDisabled,
            { opacity: pressed && hasSession ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="trash-outline" size={16} color={hasSession ? '#C0392B' : Brand.gray400} />
          <ThemedText style={[styles.clearButtonText, !hasSession && styles.clearButtonTextDisabled]}>
            {t('itinerary.clearSession', 'Clear saved progress')}
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={handleStartRoute}
          disabled={isStarting}
          style={({ pressed }) => [
            styles.startButton,
            {
              opacity: pressed || isStarting ? 0.8 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          <Ionicons name="navigate" size={22} color={Brand.primary} />
          <ThemedText style={styles.startButtonText}>
            {isStarting ? t('itinerary.starting') : t('itinerary.startRoute')}
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContainer: {
    height: 260,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    backgroundColor: Brand.accent + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: Spacing.md,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: Brand.gray600,
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  diffBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  diffBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  terrainTag: {
    backgroundColor: Brand.gray100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  terrainText: {
    fontSize: 13,
    color: Brand.gray600,
  },
  startingPointBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Brand.success + '10',
    padding: Spacing.md,
    borderRadius: 10,
    marginBottom: Spacing.lg,
  },
  startLabel: {
    fontSize: 12,
    color: Brand.gray500,
  },
  startName: {
    fontSize: 14,
    fontWeight: '600',
  },
  hotspotSection: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  hotspotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Brand.gray200,
  },
  hotspotSequence: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hotspotSequenceText: {
    fontSize: 14,
    fontWeight: '600',
  },
  hotspotInfo: {
    flex: 1,
  },
  hotspotTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  hotspotDesc: {
    fontSize: 12,
    color: Brand.gray500,
  },
  activeBadge: {
    backgroundColor: Brand.accent + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeBadgeText: {
    fontSize: 11,
    color: Brand.accent,
    fontWeight: '600',
  },
  startButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Brand.highlight,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    minHeight: TouchTarget.minSize,
  },
  startButtonText: {
    color: Brand.primary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  clearButtonDisabled: {
    opacity: 0.4,
  },
  clearButtonText: {
    fontSize: 13,
    color: '#C0392B',
    fontWeight: '500',
  },
  clearButtonTextDisabled: {
    color: Brand.gray400,
  },
});
