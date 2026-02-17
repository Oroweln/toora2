/**
 * RouteMap — MapLibre GL map with offline MBTiles vector tile base layer,
 * route polyline, hotspot markers, direction arrows, and live user position.
 *
 * The campania.mbtiles file contains OpenMapTiles-schema vector tiles (pbf)
 * covering the Campania/Sannio region at zoom 0-14. The style below paints
 * each vector layer (water, landcover, roads, buildings, labels, etc.).
 *
 * IMPORTANT: The JS→native bridge in maplibre-react-native silently drops
 * `filter` properties and style expressions (arrays like ['==', ...]).
 * Only simple literal values survive serialization. Do NOT add filters
 * or expressions to the style layers below — they will be silently ignored.
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

/**
 * Download the MBTiles asset and build the style object.
 * CRITICAL: No filters, no expressions — only flat literal values.
 * The glyphs URL MUST be present or the entire style silently fails.
 */
async function loadStyle(): Promise<Record<string, unknown> | null> {
  try {
    const asset = Asset.fromModule(MBTILES_MODULE);
    await asset.downloadAsync();
    if (!asset.localUri) return null;
    const mbtilesPath = asset.localUri.replace(/^file:\/\//, '');

    return {
      version: 8,
      sources: {
        campania: {
          type: 'vector',
          url: `mbtiles://${mbtilesPath}`,
        },
      },
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      layers: [
        { id: 'background', type: 'background',
          paint: { 'background-color': '#F2EFE9' } },
        { id: 'landcover', type: 'fill', source: 'campania',
          'source-layer': 'landcover',
          paint: { 'fill-color': '#C8DFA0', 'fill-opacity': 0.45 } },
        { id: 'landuse', type: 'fill', source: 'campania',
          'source-layer': 'landuse',
          paint: { 'fill-color': '#E0D8D0', 'fill-opacity': 0.35 } },
        { id: 'park', type: 'fill', source: 'campania',
          'source-layer': 'park',
          paint: { 'fill-color': '#B0D490', 'fill-opacity': 0.5 } },
        { id: 'water', type: 'fill', source: 'campania',
          'source-layer': 'water',
          paint: { 'fill-color': '#88C4E0' } },
        { id: 'waterway', type: 'line', source: 'campania',
          'source-layer': 'waterway',
          paint: { 'line-color': '#88C4E0', 'line-width': 1.5 } },
        { id: 'building', type: 'fill', source: 'campania',
          'source-layer': 'building',
          paint: { 'fill-color': '#D4C8BC', 'fill-opacity': 0.5 } },
        { id: 'boundary', type: 'line', source: 'campania',
          'source-layer': 'boundary',
          paint: { 'line-color': '#9E7B9B', 'line-width': 1 } },
        { id: 'road', type: 'line', source: 'campania',
          'source-layer': 'transportation',
          paint: { 'line-color': '#FFFFFF', 'line-width': 2 } },
        { id: 'aeroway', type: 'line', source: 'campania',
          'source-layer': 'aeroway',
          paint: { 'line-color': '#D0CFCB', 'line-width': 4 } },
        // Place name labels (cities, towns, villages)
        { id: 'place-label', type: 'symbol', source: 'campania',
          'source-layer': 'place',
          layout: {
            'text-field': '{name}',
            'text-font': ['Open Sans Regular'],
            'text-size': 13,
            'text-anchor': 'center',
            'text-max-width': 8,
          },
          paint: {
            'text-color': '#333333',
            'text-halo-color': '#FFFFFF',
            'text-halo-width': 1.5,
          } },
        // Road / street name labels
        { id: 'road-label', type: 'symbol', source: 'campania',
          'source-layer': 'transportation_name',
          layout: {
            'text-field': '{name}',
            'text-font': ['Open Sans Regular'],
            'text-size': 10,
            'symbol-placement': 'line',
            'text-rotation-alignment': 'map',
          },
          paint: {
            'text-color': '#666666',
            'text-halo-color': '#FFFFFF',
            'text-halo-width': 1,
          } },
        // Water body labels
        { id: 'water-label', type: 'symbol', source: 'campania',
          'source-layer': 'water_name',
          layout: {
            'text-field': '{name}',
            'text-font': ['Open Sans Regular'],
            'text-size': 11,
          },
          paint: {
            'text-color': '#4A90B8',
            'text-halo-color': '#FFFFFF',
            'text-halo-width': 1,
          } },
      ],
    };
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

/** Calculate bearing in degrees between two [lng, lat] points. */
function bearing(
  [lng1, lat1]: [number, number],
  [lng2, lat2]: [number, number],
): number {
  const toRad = Math.PI / 180;
  const toDeg = 180 / Math.PI;
  const dLng = (lng2 - lng1) * toRad;
  const φ1 = lat1 * toRad;
  const φ2 = lat2 * toRad;
  const y = Math.sin(dLng) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * toDeg + 360) % 360);
}

/** Haversine distance in meters between two [lng, lat] points. */
function haversineM(
  [lng1, lat1]: [number, number],
  [lng2, lat2]: [number, number],
): number {
  const R = 6371000;
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLng = (lng2 - lng1) * toRad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Sample points along the route polyline at regular intervals, returning
 * GeoJSON features with a `bearing` property for direction arrows.
 */
function sampleDirectionArrows(
  coords: [number, number][],
  intervalM: number,
): GeoJSON.Feature[] {
  if (coords.length < 2) return [];
  const arrows: GeoJSON.Feature[] = [];
  let accumulated = 0;

  for (let i = 1; i < coords.length; i++) {
    const segDist = haversineM(coords[i - 1], coords[i]);
    accumulated += segDist;
    if (accumulated >= intervalM) {
      accumulated = 0;
      const b = bearing(coords[i - 1], coords[i]);
      arrows.push({
        type: 'Feature',
        properties: { bearing: b },
        geometry: {
          type: 'Point',
          coordinates: coords[i],
        },
      });
    }
  }
  return arrows;
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
  const [mapStyle, setMapStyle] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const cameraRef = useRef<any>(null);

  // Load MBTiles asset and build style on mount
  useEffect(() => {
    let cancelled = false;
    loadStyle().then((style) => {
      if (cancelled) return;
      if (style) setMapStyle(style);
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

  // Direction arrows sampled along the route (~300m apart)
  const arrowsGeoJSON = useMemo(
    (): GeoJSON.FeatureCollection => ({
      type: 'FeatureCollection',
      features:
        routeCoords.length >= 2
          ? sampleDirectionArrows(routeCoords, 300)
          : [],
    }),
    [routeCoords],
  );

  // Start and end marker GeoJSON
  const startEndGeoJSON = useMemo((): {
    start: GeoJSON.FeatureCollection | null;
    end: GeoJSON.FeatureCollection | null;
  } => {
    if (routeCoords.length < 2)
      return { start: null, end: null };

    const startCoord = routeCoords[0];
    const endCoord = routeCoords[routeCoords.length - 1];

    return {
      start: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { label: 'P' },
            geometry: { type: 'Point', coordinates: startCoord },
          },
        ],
      },
      end: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { label: 'A' },
            geometry: { type: 'Point', coordinates: endCoord },
          },
        ],
      },
    };
  }, [routeCoords]);

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
          strokeColor: unlockedHotspotIds.has(hs.id) ? '#FFFFFF' : '#666666',
          radius: unlockedHotspotIds.has(hs.id) ? 12 : hs.isActive ? 10 : 8,
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

  // Fallback style (plain background) when style fails to build
  const fallbackStyle = useMemo(
    () => ({
      version: 8,
      sources: {},
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
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

      {/* Direction arrows along the route */}
      <MapLibreGL.ShapeSource id="arrows-source" shape={arrowsGeoJSON}>
        <MapLibreGL.SymbolLayer
          id="direction-arrows"
          style={{
            textField: '▸',
            textSize: 18,
            textColor: '#1A5A96',
            textRotate: ['get', 'bearing'] as unknown as number,
            textRotationAlignment: 'map',
            textAllowOverlap: true,
            textIgnorePlacement: true,
            textFont: ['Open Sans Bold'],
            textHaloColor: '#FFFFFF',
            textHaloWidth: 1,
          }}
        />
      </MapLibreGL.ShapeSource>

      {/* Start marker — green "P" (Partenza) */}
      {startEndGeoJSON.start && (
        <MapLibreGL.ShapeSource id="start-source" shape={startEndGeoJSON.start}>
          <MapLibreGL.CircleLayer
            id="start-circle-outer"
            style={{
              circleRadius: 16,
              circleColor: '#27AE60',
              circleStrokeColor: '#FFFFFF',
              circleStrokeWidth: 3,
            }}
          />
          <MapLibreGL.SymbolLayer
            id="start-label"
            style={{
              textField: 'P',
              textSize: 14,
              textColor: '#FFFFFF',
              textFont: ['Open Sans Bold'],
              textAllowOverlap: true,
              textIgnorePlacement: true,
            }}
          />
        </MapLibreGL.ShapeSource>
      )}

      {/* End marker — red "A" (Arrivo) */}
      {startEndGeoJSON.end && (
        <MapLibreGL.ShapeSource id="end-source" shape={startEndGeoJSON.end}>
          <MapLibreGL.CircleLayer
            id="end-circle-outer"
            style={{
              circleRadius: 16,
              circleColor: '#E74C3C',
              circleStrokeColor: '#FFFFFF',
              circleStrokeWidth: 3,
            }}
          />
          <MapLibreGL.SymbolLayer
            id="end-label"
            style={{
              textField: 'A',
              textSize: 14,
              textColor: '#FFFFFF',
              textFont: ['Open Sans Bold'],
              textAllowOverlap: true,
              textIgnorePlacement: true,
            }}
          />
        </MapLibreGL.ShapeSource>
      )}

      {/* Hotspot checkpoint markers */}
      <MapLibreGL.ShapeSource
        id="hotspot-source"
        shape={hotspotGeoJSON}
        onPress={handleHotspotPress}
      >
        {/* Outer stroke ring */}
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
            textSize: 12,
            textColor: '#FFFFFF',
            textFont: ['Open Sans Bold'],
            textAllowOverlap: true,
            textIgnorePlacement: true,
          }}
        />
        {/* Hotspot title label below the marker */}
        <MapLibreGL.SymbolLayer
          id="hotspot-title"
          style={{
            textField: ['get', 'title'],
            textSize: 10,
            textColor: '#333333',
            textFont: ['Open Sans Regular'],
            textOffset: [0, 2],
            textAnchor: 'top',
            textMaxWidth: 10,
            textHaloColor: '#FFFFFF',
            textHaloWidth: 1.5,
            textAllowOverlap: false,
            textOptional: true,
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
