/**
 * RouteMap — MapLibre GL map with offline MBTiles vector tile base layer,
 * route polyline, hotspot markers, and live user position.
 *
 * The campania.mbtiles file contains OpenMapTiles-schema vector tiles (pbf)
 * covering the Campania/Sannio region at zoom 0-14. The style below paints
 * each vector layer (water, landcover, roads, buildings, labels, etc.).
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

  // Build MapLibre style with offline MBTiles vector source.
  // IMPORTANT: mbtiles:// must go in "tiles" array, NOT in "url" property.
  // "url" is for TileJSON endpoints; "tiles" is for direct tile access.
  const mapStyle = useMemo(() => {
    if (!mbtilesPath) return null;
    return {
      version: 8 as const,
      sources: {
        campania: {
          type: 'vector' as const,
          tiles: [`mbtiles://${mbtilesPath}`],
          maxzoom: 14,
        },
      },
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      layers: [
        // ── Background ──────────────────────────────────────────
        {
          id: 'background',
          type: 'background',
          paint: { 'background-color': '#F2EFE9' },
        },
        // ── Landcover ───────────────────────────────────────────
        // Single layer, color driven by class attribute
        {
          id: 'landcover',
          type: 'fill',
          source: 'campania',
          'source-layer': 'landcover',
          paint: {
            'fill-color': [
              'match', ['get', 'class'],
              'wood',   '#A8C98A',
              'forest', '#A8C98A',
              'grass',  '#C8DFA0',
              'scrub',  '#B8CF90',
              'farmland','#E2D9C2',
              '#D4DFC4', // default
            ],
            'fill-opacity': 0.7,
          },
        },
        // ── Landuse ─────────────────────────────────────────────
        {
          id: 'landuse',
          type: 'fill',
          source: 'campania',
          'source-layer': 'landuse',
          paint: {
            'fill-color': [
              'match', ['get', 'class'],
              'residential',  '#E0D8D0',
              'commercial',   '#ECD8CF',
              'industrial',   '#E4D0C8',
              'retail',       '#ECD8CF',
              'cemetery',     '#BFCFAB',
              'hospital',     '#F0D8D8',
              'military',     '#E0D8C8',
              'railway',      '#E8E0D8',
              '#E0D8D0', // default
            ],
            'fill-opacity': 0.6,
          },
        },
        // ── Parks ───────────────────────────────────────────────
        {
          id: 'park',
          type: 'fill',
          source: 'campania',
          'source-layer': 'park',
          paint: { 'fill-color': '#B0D490', 'fill-opacity': 0.6 },
        },
        // ── Water ───────────────────────────────────────────────
        {
          id: 'water',
          type: 'fill',
          source: 'campania',
          'source-layer': 'water',
          paint: { 'fill-color': '#88C4E0' },
        },
        // ── Waterways ───────────────────────────────────────────
        {
          id: 'waterway',
          type: 'line',
          source: 'campania',
          'source-layer': 'waterway',
          paint: {
            'line-color': '#88C4E0',
            'line-width': [
              'interpolate', ['linear'], ['zoom'],
              8, 0.5,
              14, 3,
            ],
          },
        },
        // ── Buildings ───────────────────────────────────────────
        {
          id: 'building',
          type: 'fill',
          source: 'campania',
          'source-layer': 'building',
          minzoom: 13,
          paint: {
            'fill-color': '#D4C8BC',
            'fill-opacity': [
              'interpolate', ['linear'], ['zoom'],
              13, 0.4,
              16, 0.7,
            ],
          },
        },
        {
          id: 'building-outline',
          type: 'line',
          source: 'campania',
          'source-layer': 'building',
          minzoom: 13,
          paint: { 'line-color': '#B8A898', 'line-width': 0.6 },
        },
        // ── Boundaries ──────────────────────────────────────────
        {
          id: 'boundary',
          type: 'line',
          source: 'campania',
          'source-layer': 'boundary',
          paint: {
            'line-color': '#9E7B9B',
            'line-width': [
              'match', ['get', 'admin_level'],
              2, 1.5,
              4, 1.0,
              0.6,
            ],
            'line-dasharray': [3, 2],
            'line-opacity': 0.7,
          },
        },
        // ── Transportation: road casings (drawn first, underneath) ──
        {
          id: 'road-casing',
          type: 'line',
          source: 'campania',
          'source-layer': 'transportation',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': [
              'match', ['get', 'class'],
              'motorway',  '#C24E6B',
              'trunk',     '#C87830',
              'primary',   '#C8A868',
              'secondary', '#C8BD8E',
              'tertiary',  '#CCCCCC',
              'minor',     '#CCCCCC',
              'service',   '#CCCCCC',
              'track',     '#CCCCCC',
              'rgba(0,0,0,0)', // hide casing for path/rail/ferry
            ],
            'line-width': [
              'interpolate', ['linear'], ['zoom'],
              5, ['match', ['get', 'class'],
                  'motorway', 1.5, 'trunk', 1.2, 'primary', 1, 0],
              10, ['match', ['get', 'class'],
                   'motorway', 4, 'trunk', 3.5, 'primary', 3,
                   'secondary', 2.5, 'tertiary', 2, 0],
              14, ['match', ['get', 'class'],
                   'motorway', 8, 'trunk', 7, 'primary', 6,
                   'secondary', 5, 'tertiary', 4, 'minor', 3,
                   'service', 2, 'track', 2, 0],
            ],
          },
        },
        // ── Transportation: road fills (drawn on top of casings) ──
        {
          id: 'road-fill',
          type: 'line',
          source: 'campania',
          'source-layer': 'transportation',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': [
              'match', ['get', 'class'],
              'motorway',  '#E892A2',
              'trunk',     '#F9B29C',
              'primary',   '#FCD6A4',
              'secondary', '#F7FABF',
              'tertiary',  '#FFFFFF',
              'minor',     '#FFFFFF',
              'service',   '#F8F8F8',
              'track',     '#F0EDE8',
              'path',      '#E8D4B0',
              'rail',      '#B0B0B0',
              'ferry',     '#88C4E0',
              '#E8E4E0', // fallback for any unlisted class
            ],
            'line-width': [
              'interpolate', ['linear'], ['zoom'],
              5, ['match', ['get', 'class'],
                  'motorway', 1, 'trunk', 0.8, 'primary', 0.6, 0],
              10, ['match', ['get', 'class'],
                   'motorway', 3, 'trunk', 2.5, 'primary', 2,
                   'secondary', 1.5, 'tertiary', 1, 0.3],
              14, ['match', ['get', 'class'],
                   'motorway', 6, 'trunk', 5, 'primary', 4.5,
                   'secondary', 4, 'tertiary', 3, 'minor', 2,
                   'service', 1.5, 'track', 1.5, 'path', 1, 'rail', 1, 0.8],
            ],
            'line-dasharray': [
              'match', ['get', 'class'],
              'path',  ['literal', [3, 2]],
              'rail',  ['literal', [4, 2]],
              'track', ['literal', [5, 2]],
              'ferry', ['literal', [6, 3]],
              ['literal', [1, 0]], // solid for normal roads
            ],
          },
        },
        // ── Aeroways ────────────────────────────────────────────
        {
          id: 'aeroway',
          type: 'line',
          source: 'campania',
          'source-layer': 'aeroway',
          paint: {
            'line-color': '#D0CFCB',
            'line-width': [
              'match', ['get', 'class'],
              'runway', 8,
              'taxiway', 4,
              2,
            ],
          },
        },
        // ── Labels: water names ─────────────────────────────────
        {
          id: 'water-name',
          type: 'symbol',
          source: 'campania',
          'source-layer': 'water_name',
          layout: {
            'text-field': ['coalesce', ['get', 'name:it'], ['get', 'name:latin'], ['get', 'name']],
            'text-font': ['Open Sans Italic'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 8, 10, 14, 14],
            'text-max-width': 8,
          },
          paint: {
            'text-color': '#4A7D99',
            'text-halo-color': 'rgba(255,255,255,0.8)',
            'text-halo-width': 1.2,
          },
        },
        // ── Labels: road names ──────────────────────────────────
        {
          id: 'road-label',
          type: 'symbol',
          source: 'campania',
          'source-layer': 'transportation_name',
          minzoom: 12,
          layout: {
            'text-field': ['coalesce', ['get', 'name:it'], ['get', 'name:latin'], ['get', 'name']],
            'text-font': ['Open Sans Regular'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 12, 9, 16, 13],
            'symbol-placement': 'line',
            'text-rotation-alignment': 'map',
            'text-max-angle': 30,
          },
          paint: {
            'text-color': '#555',
            'text-halo-color': 'rgba(255,255,255,0.9)',
            'text-halo-width': 1.5,
          },
        },
        // ── Labels: places ──────────────────────────────────────
        {
          id: 'place-label',
          type: 'symbol',
          source: 'campania',
          'source-layer': 'place',
          layout: {
            'text-field': ['coalesce', ['get', 'name:it'], ['get', 'name:latin'], ['get', 'name']],
            'text-font': ['Open Sans Bold'],
            'text-size': [
              'match', ['get', 'class'],
              'city',    ['literal', 16],
              'town',    ['literal', 13],
              'village', ['literal', 11],
              9,
            ],
            'text-max-width': 8,
          },
          paint: {
            'text-color': '#333',
            'text-halo-color': 'rgba(255,255,255,0.9)',
            'text-halo-width': 2,
          },
        },
        // ── Labels: mountain peaks ──────────────────────────────
        {
          id: 'mountain-peak',
          type: 'symbol',
          source: 'campania',
          'source-layer': 'mountain_peak',
          minzoom: 9,
          layout: {
            'text-field': ['coalesce', ['get', 'name:it'], ['get', 'name:latin'], ['get', 'name']],
            'text-font': ['Open Sans Italic'],
            'text-size': 10,
            'text-offset': [0, 0.8],
          },
          paint: {
            'text-color': '#7D5C34',
            'text-halo-color': 'rgba(255,255,255,0.8)',
            'text-halo-width': 1,
          },
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
