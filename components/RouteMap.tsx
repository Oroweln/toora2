/**
 * RouteMap — MapLibre GL map with offline MBTiles raster base layer,
 * route polyline, hotspot markers, and live user position.
 */

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { StyleSheet, View, Platform, ActivityIndicator } from 'react-native';
import { Asset } from 'expo-asset';

import { Brand, RouteColors, Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import type { Hotspot, UserLocation } from '@/src/types';

// MapLibre is native-only — guarded by Platform check at render time.
let MapLibreGL: typeof import('@maplibre/maplibre-react-native');
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  MapLibreGL = require('@maplibre/maplibre-react-native');
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RouteMapProps {
  /** Route polyline as [lng, lat][] */
  routeCoords: [number, number][];
  /** Full list of hotspots for the itinerary */
  hotspots: Hotspot[];
  /** IDs of currently geofence-unlocked hotspots */
  unlockedHotspotIds: Set<string>;
  /** IDs of already-visited hotspots */
  visitedHotspotIds: Set<string>;
  /** Live user location (null before first fix) */
  currentLocation: UserLocation | null;
  /** Called when user taps a hotspot marker */
  onHotspotPress: (hotspot: Hotspot) => void;
}

// ---------------------------------------------------------------------------
// MBTiles asset loader
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-require-imports
const MBTILES_MODULE = require('../assets/campania.mbtiles');

async function loadMBTilesPath(): Promise<string | null> {
  try {
    const asset = Asset.fromModule(MBTILES_MODULE);
    await asset.downloadAsync();
    if (!asset.localUri) return null;
    // Strip file:// prefix → bare path for mbtiles:// scheme
    return asset.localUri.replace(/^file:\/\//, '');
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute bounding box from coordinates for the initial camera. */
function computeBounds(coords: [number, number][]): {
  ne: [number, number];
  sw: [number, number];
} {
  let minLng = Infinity,
    maxLng = -Infinity,
    minLat = Infinity,
    maxLat = -Infinity;
  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return {
    ne: [maxLng, maxLat],
    sw: [minLng, minLat],
  };
}

function hotspotColor(
  hs: Hotspot,
  unlockedIds: Set<string>,
  visitedIds: Set<string>,
): string {
  if (unlockedIds.has(hs.id)) return RouteColors.hotspotActive;
  if (visitedIds.has(hs.id)) return RouteColors.hotspotVisited;
  if (hs.isActive) return RouteColors.hotspotLocked;
  return RouteColors.hotspotWaypoint;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RouteMap({
  routeCoords,
  hotspots,
  unlockedHotspotIds,
  visitedHotspotIds,
  currentLocation,
  onHotspotPress,
}: RouteMapProps) {
  const [mbtilesPath, setMbtilesPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const cameraRef = useRef<any>(null);

  // Load the MBTiles asset on mount
  useEffect(() => {
    let cancelled = false;
    loadMBTilesPath().then((path) => {
      if (cancelled) return;
      if (path) {
        setMbtilesPath(path);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Route polyline as GeoJSON
  const routeGeoJSON = useMemo(
    (): GeoJSON.FeatureCollection => ({
      type: 'FeatureCollection',
      features:
        routeCoords.length > 0
          ? [
              {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: routeCoords,
                },
              },
            ]
          : [],
    }),
    [routeCoords],
  );

  // Hotspot markers as GeoJSON — rebuilt when unlock/visit sets change
  const hotspotGeoJSON = useMemo(
    (): GeoJSON.FeatureCollection => ({
      type: 'FeatureCollection',
      features: hotspots.map((hs) => ({
        type: 'Feature' as const,
        properties: {
          id: hs.id,
          sequence: hs.sequence,
          title: hs.title,
          isActive: hs.isActive,
          color: hotspotColor(hs, unlockedHotspotIds, visitedHotspotIds),
          strokeColor: unlockedHotspotIds.has(hs.id) ? '#FFFFFF' : 'transparent',
          radius: unlockedHotspotIds.has(hs.id) ? 10 : hs.isActive ? 8 : 6,
        },
        geometry: {
          type: 'Point',
          coordinates: [hs.longitude, hs.latitude],
        },
      })),
    }),
    [hotspots, unlockedHotspotIds, visitedHotspotIds],
  );

  // Camera bounds — fit the full route with some padding
  const bounds = useMemo(() => {
    if (routeCoords.length === 0) return null;
    return computeBounds(routeCoords);
  }, [routeCoords]);

  // User location as GeoJSON point (for a custom accuracy circle)
  const userGeoJSON = useMemo((): GeoJSON.FeatureCollection | null => {
    if (!currentLocation) return null;
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { accuracy: currentLocation.accuracy },
          geometry: {
            type: 'Point',
            coordinates: [currentLocation.longitude, currentLocation.latitude],
          },
        },
      ],
    };
  }, [currentLocation]);

  // MapLibre style object with MBTiles as the raster base layer
  const mapStyle = useMemo(() => {
    if (!mbtilesPath) return null;
    return {
      version: 8,
      sources: {
        campania: {
          type: 'raster',
          url: `mbtiles://${mbtilesPath}`,
          tileSize: 256,
        },
      },
      layers: [
        {
          id: 'campania-tiles',
          type: 'raster',
          source: 'campania',
        },
      ],
    };
  }, [mbtilesPath]);

  // Fallback style (plain background) when MBTiles fails to load
  const fallbackStyle = useMemo(
    () => ({
      version: 8,
      sources: {},
      layers: [
        {
          id: 'background',
          type: 'background',
          paint: { 'background-color': '#E8EDF2' },
        },
      ],
    }),
    [],
  );

  const handleHotspotPress = useCallback(
    (event: any) => {
      const feature = event.features?.[0];
      if (!feature?.properties?.id) return;
      const hs = hotspots.find((h) => h.id === feature.properties.id);
      if (hs) onHotspotPress(hs);
    },
    [hotspots, onHotspotPress],
  );

  // Web fallback — MapLibre React Native is native-only
  if (Platform.OS === 'web' || !MapLibreGL) {
    return (
      <View style={styles.fallback}>
        <ThemedText style={styles.fallbackText}>
          Map is available on iOS & Android
        </ThemedText>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.fallback}>
        <ActivityIndicator size="large" color={Brand.primary} />
        <ThemedText style={styles.fallbackText}>Loading offline map…</ThemedText>
      </View>
    );
  }

  const activeStyle = mapStyle ?? fallbackStyle;

  return (
    <MapLibreGL.MapView
      style={styles.map}
      mapStyle={activeStyle}
      logoEnabled={false}
      attributionEnabled={false}
      compassEnabled
      compassViewMargins={{ x: 16, y: 100 }}
    >
      {/* Camera — fit route bounds on mount */}
      {bounds && (
        <MapLibreGL.Camera
          ref={cameraRef}
          defaultSettings={{
            bounds: {
              ne: bounds.ne,
              sw: bounds.sw,
              paddingTop: 80,
              paddingBottom: 200,
              paddingLeft: 40,
              paddingRight: 40,
            },
          }}
          animationDuration={0}
        />
      )}

      {/* Route polyline */}
      <MapLibreGL.ShapeSource id="route-source" shape={routeGeoJSON}>
        <MapLibreGL.LineLayer
          id="route-line-casing"
          style={{
            lineColor: '#FFFFFF',
            lineWidth: RouteColors.routeLineWidth + 2,
            lineJoin: 'round',
            lineCap: 'round',
          }}
        />
        <MapLibreGL.LineLayer
          id="route-line"
          style={{
            lineColor: RouteColors.routeLine,
            lineWidth: RouteColors.routeLineWidth,
            lineJoin: 'round',
            lineCap: 'round',
          }}
        />
      </MapLibreGL.ShapeSource>

      {/* Hotspot markers */}
      <MapLibreGL.ShapeSource
        id="hotspot-source"
        shape={hotspotGeoJSON}
        onPress={handleHotspotPress}
      >
        {/* Outer stroke ring for unlocked hotspots */}
        <MapLibreGL.CircleLayer
          id="hotspot-stroke"
          style={{
            circleRadius: ['get', 'radius'] as unknown as number,
            circleColor: 'transparent',
            circleStrokeColor: ['get', 'strokeColor'] as unknown as string,
            circleStrokeWidth: 2,
          }}
        />
        {/* Filled circle */}
        <MapLibreGL.CircleLayer
          id="hotspot-fill"
          style={{
            circleRadius: ['get', 'radius'] as unknown as number,
            circleColor: ['get', 'color'] as unknown as string,
          }}
        />
        {/* Sequence number label */}
        <MapLibreGL.SymbolLayer
          id="hotspot-label"
          style={{
            textField: ['to-string', ['get', 'sequence']],
            textSize: 11,
            textColor: '#FFFFFF',
            textFont: ['Open Sans Bold'],
            textAllowOverlap: true,
            textIgnorePlacement: true,
          }}
        />
      </MapLibreGL.ShapeSource>

      {/* User location dot */}
      {userGeoJSON && (
        <MapLibreGL.ShapeSource id="user-location-source" shape={userGeoJSON}>
          {/* Accuracy halo */}
          <MapLibreGL.CircleLayer
            id="user-accuracy"
            style={{
              circleRadius: 20,
              circleColor: RouteColors.userDot + '20',
              circleStrokeColor: RouteColors.userDot + '40',
              circleStrokeWidth: 1,
            }}
          />
          {/* Position dot */}
          <MapLibreGL.CircleLayer
            id="user-dot"
            style={{
              circleRadius: 8,
              circleColor: RouteColors.userDot,
              circleStrokeColor: '#FFFFFF',
              circleStrokeWidth: 3,
            }}
          />
        </MapLibreGL.ShapeSource>
      )}
    </MapLibreGL.MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  fallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8EDF2',
    gap: Spacing.sm,
  },
  fallbackText: {
    fontSize: 14,
    color: Brand.gray500,
  },
});
