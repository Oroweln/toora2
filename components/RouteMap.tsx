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
  // "url" triggers TileJSON generation from the MBTiles metadata table,
  // which then constructs proper tile URL templates internally.
  const mapStyle = useMemo(() => {
    if (!mbtilesPath) return null;

    return {
      version: 8 as const,
      sources: {
        campania: {
          type: 'vector' as const,
          url: `mbtiles://${mbtilesPath}`,
        },
      },
      // NOTE: Style expressions (match, interpolate, get, coalesce) crash
      // silently in this maplibre-react-native version. All paint/layout
      // values below MUST be simple literals. For per-class styling we use
      // separate layers with legacy filters instead.
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      layers: [
        // ── Background ──────────────────────────────────────────
        { id: 'background', type: 'background', paint: { 'background-color': '#F2EFE9' } },

        // ── Landcover ───────────────────────────────────────────
        { id: 'landcover-wood', type: 'fill', source: 'campania', 'source-layer': 'landcover',
          filter: ['in', 'class', 'wood', 'forest'],
          paint: { 'fill-color': '#A8C98A', 'fill-opacity': 0.6 } },
        { id: 'landcover-grass', type: 'fill', source: 'campania', 'source-layer': 'landcover',
          filter: ['in', 'class', 'grass', 'grassland', 'scrub', 'heath'],
          paint: { 'fill-color': '#C8DFA0', 'fill-opacity': 0.5 } },
        { id: 'landcover-farm', type: 'fill', source: 'campania', 'source-layer': 'landcover',
          filter: ['in', 'subclass', 'farmland', 'orchard'],
          paint: { 'fill-color': '#E2D9C2', 'fill-opacity': 0.4 } },

        // ── Landuse ─────────────────────────────────────────────
        { id: 'landuse-residential', type: 'fill', source: 'campania', 'source-layer': 'landuse',
          filter: ['==', 'class', 'residential'],
          paint: { 'fill-color': '#E0D8D0', 'fill-opacity': 0.4 } },
        { id: 'landuse-other', type: 'fill', source: 'campania', 'source-layer': 'landuse',
          filter: ['in', 'class', 'commercial', 'industrial', 'retail', 'railway'],
          paint: { 'fill-color': '#E4D8CF', 'fill-opacity': 0.3 } },
        { id: 'landuse-green', type: 'fill', source: 'campania', 'source-layer': 'landuse',
          filter: ['==', 'class', 'cemetery'],
          paint: { 'fill-color': '#BFCFAB', 'fill-opacity': 0.4 } },

        // ── Parks ───────────────────────────────────────────────
        { id: 'park', type: 'fill', source: 'campania', 'source-layer': 'park',
          paint: { 'fill-color': '#B0D490', 'fill-opacity': 0.5 } },

        // ── Water ───────────────────────────────────────────────
        { id: 'water', type: 'fill', source: 'campania', 'source-layer': 'water',
          paint: { 'fill-color': '#88C4E0' } },
        { id: 'waterway', type: 'line', source: 'campania', 'source-layer': 'waterway',
          paint: { 'line-color': '#88C4E0', 'line-width': 1.5 } },

        // ── Buildings ───────────────────────────────────────────
        { id: 'building', type: 'fill', source: 'campania', 'source-layer': 'building',
          minzoom: 13,
          paint: { 'fill-color': '#D4C8BC', 'fill-opacity': 0.5 } },
        { id: 'building-outline', type: 'line', source: 'campania', 'source-layer': 'building',
          minzoom: 13,
          paint: { 'line-color': '#B8A898', 'line-width': 0.5 } },

        // ── Boundaries ──────────────────────────────────────────
        { id: 'boundary-admin2', type: 'line', source: 'campania', 'source-layer': 'boundary',
          filter: ['==', 'admin_level', 2],
          paint: { 'line-color': '#9E7B9B', 'line-width': 1.5, 'line-dasharray': [3, 2] } },
        { id: 'boundary-admin4', type: 'line', source: 'campania', 'source-layer': 'boundary',
          filter: ['>=', 'admin_level', 4],
          paint: { 'line-color': '#B8A8B5', 'line-width': 0.8, 'line-dasharray': [4, 3] } },

        // ── Roads: casings (drawn first) ────────────────────────
        { id: 'road-motorway-casing', type: 'line', source: 'campania', 'source-layer': 'transportation',
          filter: ['==', 'class', 'motorway'],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#C24E6B', 'line-width': 5 } },
        { id: 'road-trunk-casing', type: 'line', source: 'campania', 'source-layer': 'transportation',
          filter: ['==', 'class', 'trunk'],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#C87830', 'line-width': 4.5 } },
        { id: 'road-primary-casing', type: 'line', source: 'campania', 'source-layer': 'transportation',
          filter: ['==', 'class', 'primary'],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#C8A868', 'line-width': 4 } },
        { id: 'road-secondary-casing', type: 'line', source: 'campania', 'source-layer': 'transportation',
          filter: ['==', 'class', 'secondary'],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#C8BD8E', 'line-width': 3.5 } },
        { id: 'road-tertiary-casing', type: 'line', source: 'campania', 'source-layer': 'transportation',
          filter: ['==', 'class', 'tertiary'],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#CCCCCC', 'line-width': 3 } },

        // ── Roads: fills (drawn on top of casings) ──────────────
        { id: 'road-motorway', type: 'line', source: 'campania', 'source-layer': 'transportation',
          filter: ['==', 'class', 'motorway'],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#E892A2', 'line-width': 3.5 } },
        { id: 'road-trunk', type: 'line', source: 'campania', 'source-layer': 'transportation',
          filter: ['==', 'class', 'trunk'],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#F9B29C', 'line-width': 3 } },
        { id: 'road-primary', type: 'line', source: 'campania', 'source-layer': 'transportation',
          filter: ['==', 'class', 'primary'],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#FCD6A4', 'line-width': 2.5 } },
        { id: 'road-secondary', type: 'line', source: 'campania', 'source-layer': 'transportation',
          filter: ['==', 'class', 'secondary'],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#F7FABF', 'line-width': 2 } },
        { id: 'road-tertiary', type: 'line', source: 'campania', 'source-layer': 'transportation',
          filter: ['==', 'class', 'tertiary'],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#FFFFFF', 'line-width': 1.5 } },
        { id: 'road-minor', type: 'line', source: 'campania', 'source-layer': 'transportation',
          filter: ['==', 'class', 'minor'],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#FFFFFF', 'line-width': 1 } },
        { id: 'road-service', type: 'line', source: 'campania', 'source-layer': 'transportation',
          filter: ['in', 'class', 'service', 'track'],
          minzoom: 12,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#F0EDE8', 'line-width': 0.8 } },
        { id: 'road-path', type: 'line', source: 'campania', 'source-layer': 'transportation',
          filter: ['==', 'class', 'path'],
          minzoom: 12,
          paint: { 'line-color': '#CBA26E', 'line-width': 1, 'line-dasharray': [3, 2] } },
        { id: 'road-rail', type: 'line', source: 'campania', 'source-layer': 'transportation',
          filter: ['in', 'class', 'rail', 'narrow_gauge', 'transit'],
          paint: { 'line-color': '#B0B0B0', 'line-width': 1.2, 'line-dasharray': [4, 2] } },

        // ── Aeroways ────────────────────────────────────────────
        { id: 'aeroway', type: 'line', source: 'campania', 'source-layer': 'aeroway',
          paint: { 'line-color': '#D0CFCB', 'line-width': 6 } },

        // ── Labels: place names ─────────────────────────────────
        { id: 'place-city', type: 'symbol', source: 'campania', 'source-layer': 'place',
          filter: ['==', 'class', 'city'],
          layout: { 'text-field': '{name:latin}', 'text-font': ['Open Sans Bold'], 'text-size': 16, 'text-max-width': 8 },
          paint: { 'text-color': '#333333', 'text-halo-color': '#FFFFFF', 'text-halo-width': 2 } },
        { id: 'place-town', type: 'symbol', source: 'campania', 'source-layer': 'place',
          filter: ['==', 'class', 'town'],
          layout: { 'text-field': '{name:latin}', 'text-font': ['Open Sans Bold'], 'text-size': 13, 'text-max-width': 8 },
          paint: { 'text-color': '#444444', 'text-halo-color': '#FFFFFF', 'text-halo-width': 1.5 } },
        { id: 'place-village', type: 'symbol', source: 'campania', 'source-layer': 'place',
          filter: ['==', 'class', 'village'],
          minzoom: 10,
          layout: { 'text-field': '{name:latin}', 'text-font': ['Open Sans Regular'], 'text-size': 11, 'text-max-width': 7 },
          paint: { 'text-color': '#555555', 'text-halo-color': '#FFFFFF', 'text-halo-width': 1.5 } },
        { id: 'place-hamlet', type: 'symbol', source: 'campania', 'source-layer': 'place',
          filter: ['in', 'class', 'hamlet', 'suburb', 'neighbourhood'],
          minzoom: 12,
          layout: { 'text-field': '{name:latin}', 'text-font': ['Open Sans Regular'], 'text-size': 10, 'text-max-width': 6 },
          paint: { 'text-color': '#777777', 'text-halo-color': '#FFFFFF', 'text-halo-width': 1 } },

        // ── Labels: road names ──────────────────────────────────
        { id: 'road-label', type: 'symbol', source: 'campania', 'source-layer': 'transportation_name',
          minzoom: 13,
          layout: { 'text-field': '{name:latin}', 'text-font': ['Open Sans Regular'], 'text-size': 10,
                    'symbol-placement': 'line', 'text-rotation-alignment': 'map', 'text-max-angle': 30 },
          paint: { 'text-color': '#666666', 'text-halo-color': '#FFFFFF', 'text-halo-width': 1.5 } },

        // ── Labels: water names ─────────────────────────────────
        { id: 'water-name', type: 'symbol', source: 'campania', 'source-layer': 'water_name',
          layout: { 'text-field': '{name:latin}', 'text-font': ['Open Sans Italic'], 'text-size': 12, 'text-max-width': 8 },
          paint: { 'text-color': '#4A7D99', 'text-halo-color': '#FFFFFF', 'text-halo-width': 1.2 } },

        // ── Labels: mountain peaks ──────────────────────────────
        { id: 'mountain-peak', type: 'symbol', source: 'campania', 'source-layer': 'mountain_peak',
          minzoom: 10,
          layout: { 'text-field': '{name:latin}', 'text-font': ['Open Sans Italic'], 'text-size': 10, 'text-offset': [0, 0.8] },
          paint: { 'text-color': '#7D5C34', 'text-halo-color': '#FFFFFF', 'text-halo-width': 1 } },
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
