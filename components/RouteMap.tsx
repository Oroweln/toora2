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

  // MapLibre style — vector source + OpenMapTiles-compatible layer definitions.
  // The MBTiles contains pbf vector tiles with layers: water, waterway,
  // landcover, landuse, park, boundary, transportation, building, place,
  // poi, transportation_name, water_name, mountain_peak, aeroway, housenumber.
  const mapStyle = useMemo(() => {
    if (!mbtilesPath) return null;
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
        // Background
        {
          id: 'background',
          type: 'background',
          paint: { 'background-color': '#F2EFE9' },
        },
        // Landcover (forest, grass, farmland, etc.)
        {
          id: 'landcover-grass',
          type: 'fill',
          source: 'campania',
          'source-layer': 'landcover',
          filter: ['==', 'class', 'grass'],
          paint: { 'fill-color': '#D8E8C8', 'fill-opacity': 0.6 },
        },
        {
          id: 'landcover-wood',
          type: 'fill',
          source: 'campania',
          'source-layer': 'landcover',
          filter: ['in', 'class', 'wood', 'forest'],
          paint: { 'fill-color': '#C0D9AF', 'fill-opacity': 0.6 },
        },
        {
          id: 'landcover-farmland',
          type: 'fill',
          source: 'campania',
          'source-layer': 'landcover',
          filter: ['==', 'subclass', 'farmland'],
          paint: { 'fill-color': '#EAE0D0', 'fill-opacity': 0.5 },
        },
        // Landuse
        {
          id: 'landuse-residential',
          type: 'fill',
          source: 'campania',
          'source-layer': 'landuse',
          filter: ['==', 'class', 'residential'],
          paint: { 'fill-color': '#E8E0D8', 'fill-opacity': 0.5 },
        },
        {
          id: 'landuse-commercial',
          type: 'fill',
          source: 'campania',
          'source-layer': 'landuse',
          filter: ['in', 'class', 'commercial', 'industrial', 'retail'],
          paint: { 'fill-color': '#E4D8CF', 'fill-opacity': 0.4 },
        },
        {
          id: 'landuse-cemetery',
          type: 'fill',
          source: 'campania',
          'source-layer': 'landuse',
          filter: ['==', 'class', 'cemetery'],
          paint: { 'fill-color': '#CDDBBE', 'fill-opacity': 0.5 },
        },
        // Parks and green areas
        {
          id: 'park',
          type: 'fill',
          source: 'campania',
          'source-layer': 'park',
          paint: { 'fill-color': '#C8DFAB', 'fill-opacity': 0.5 },
        },
        // Water bodies
        {
          id: 'water',
          type: 'fill',
          source: 'campania',
          'source-layer': 'water',
          paint: { 'fill-color': '#AAD3DF' },
        },
        // Waterways (rivers, streams)
        {
          id: 'waterway',
          type: 'line',
          source: 'campania',
          'source-layer': 'waterway',
          paint: {
            'line-color': '#AAD3DF',
            'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 14, 3],
          },
        },
        // Buildings
        {
          id: 'building',
          type: 'fill',
          source: 'campania',
          'source-layer': 'building',
          minzoom: 13,
          paint: {
            'fill-color': '#D9D0C9',
            'fill-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0.3, 16, 0.6],
          },
        },
        {
          id: 'building-outline',
          type: 'line',
          source: 'campania',
          'source-layer': 'building',
          minzoom: 13,
          paint: { 'line-color': '#C9BFB8', 'line-width': 0.5 },
        },
        // Boundaries (admin borders)
        {
          id: 'boundary-country',
          type: 'line',
          source: 'campania',
          'source-layer': 'boundary',
          filter: ['==', 'admin_level', 2],
          paint: {
            'line-color': '#9E7B9B',
            'line-width': 1.5,
            'line-dasharray': [3, 2],
          },
        },
        {
          id: 'boundary-region',
          type: 'line',
          source: 'campania',
          'source-layer': 'boundary',
          filter: ['in', 'admin_level', 4, 6],
          paint: {
            'line-color': '#B8A8B5',
            'line-width': 0.8,
            'line-dasharray': [4, 3],
          },
        },
        // Roads — service / track (lowest)
        {
          id: 'road-service',
          type: 'line',
          source: 'campania',
          'source-layer': 'transportation',
          filter: ['in', 'class', 'service', 'track'],
          minzoom: 12,
          paint: {
            'line-color': '#FFFFFF',
            'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.5, 16, 2],
          },
        },
        // Roads — minor
        {
          id: 'road-minor',
          type: 'line',
          source: 'campania',
          'source-layer': 'transportation',
          filter: ['==', 'class', 'minor'],
          minzoom: 10,
          paint: {
            'line-color': '#FFFFFF',
            'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.5, 14, 3, 16, 5],
          },
        },
        // Roads — tertiary
        {
          id: 'road-tertiary',
          type: 'line',
          source: 'campania',
          'source-layer': 'transportation',
          filter: ['==', 'class', 'tertiary'],
          paint: {
            'line-color': '#FFFFFF',
            'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 12, 2, 16, 6],
          },
        },
        // Roads — secondary
        {
          id: 'road-secondary-casing',
          type: 'line',
          source: 'campania',
          'source-layer': 'transportation',
          filter: ['==', 'class', 'secondary'],
          paint: {
            'line-color': '#D4C9A8',
            'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.5, 14, 6, 16, 10],
          },
        },
        {
          id: 'road-secondary',
          type: 'line',
          source: 'campania',
          'source-layer': 'transportation',
          filter: ['==', 'class', 'secondary'],
          paint: {
            'line-color': '#F7FABF',
            'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1, 14, 5, 16, 9],
          },
        },
        // Roads — primary
        {
          id: 'road-primary-casing',
          type: 'line',
          source: 'campania',
          'source-layer': 'transportation',
          filter: ['==', 'class', 'primary'],
          paint: {
            'line-color': '#C8A868',
            'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1, 12, 4, 16, 12],
          },
        },
        {
          id: 'road-primary',
          type: 'line',
          source: 'campania',
          'source-layer': 'transportation',
          filter: ['==', 'class', 'primary'],
          paint: {
            'line-color': '#FCD6A4',
            'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.5, 12, 3, 16, 10],
          },
        },
        // Roads — trunk
        {
          id: 'road-trunk-casing',
          type: 'line',
          source: 'campania',
          'source-layer': 'transportation',
          filter: ['==', 'class', 'trunk'],
          paint: {
            'line-color': '#C87830',
            'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1, 12, 4, 16, 12],
          },
        },
        {
          id: 'road-trunk',
          type: 'line',
          source: 'campania',
          'source-layer': 'transportation',
          filter: ['==', 'class', 'trunk'],
          paint: {
            'line-color': '#F9B29C',
            'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.5, 12, 3, 16, 10],
          },
        },
        // Roads — motorway
        {
          id: 'road-motorway-casing',
          type: 'line',
          source: 'campania',
          'source-layer': 'transportation',
          filter: ['==', 'class', 'motorway'],
          paint: {
            'line-color': '#C24E6B',
            'line-width': ['interpolate', ['linear'], ['zoom'], 5, 1, 12, 5, 16, 14],
          },
        },
        {
          id: 'road-motorway',
          type: 'line',
          source: 'campania',
          'source-layer': 'transportation',
          filter: ['==', 'class', 'motorway'],
          paint: {
            'line-color': '#E892A2',
            'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.5, 12, 4, 16, 12],
          },
        },
        // Paths — bicycle/foot/pedestrian (important for cycling app!)
        {
          id: 'path',
          type: 'line',
          source: 'campania',
          'source-layer': 'transportation',
          filter: ['==', 'class', 'path'],
          minzoom: 12,
          paint: {
            'line-color': '#CBA26E',
            'line-width': 1,
            'line-dasharray': [3, 2],
          },
        },
        // Rail
        {
          id: 'rail',
          type: 'line',
          source: 'campania',
          'source-layer': 'transportation',
          filter: ['==', 'class', 'rail'],
          paint: {
            'line-color': '#B7B7B7',
            'line-width': 1.5,
            'line-dasharray': [4, 2],
          },
        },
        // Aeroways
        {
          id: 'aeroway-runway',
          type: 'line',
          source: 'campania',
          'source-layer': 'aeroway',
          filter: ['==', 'class', 'runway'],
          paint: { 'line-color': '#D0CFCB', 'line-width': 8 },
        },
        // Water name labels
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
            'text-color': '#5D87A0',
            'text-halo-color': 'rgba(255,255,255,0.8)',
            'text-halo-width': 1,
          },
        },
        // Road labels
        {
          id: 'road-label',
          type: 'symbol',
          source: 'campania',
          'source-layer': 'transportation_name',
          minzoom: 12,
          layout: {
            'text-field': ['coalesce', ['get', 'name:it'], ['get', 'name:latin'], ['get', 'name']],
            'text-font': ['Open Sans Regular'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 12, 9, 16, 12],
            'symbol-placement': 'line',
            'text-rotation-alignment': 'map',
            'text-max-angle': 30,
          },
          paint: {
            'text-color': '#666',
            'text-halo-color': 'rgba(255,255,255,0.8)',
            'text-halo-width': 1.5,
          },
        },
        // Place labels — city/town/village
        {
          id: 'place-city',
          type: 'symbol',
          source: 'campania',
          'source-layer': 'place',
          filter: ['==', 'class', 'city'],
          layout: {
            'text-field': ['coalesce', ['get', 'name:it'], ['get', 'name:latin'], ['get', 'name']],
            'text-font': ['Open Sans Bold'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 5, 12, 10, 18],
            'text-max-width': 8,
          },
          paint: {
            'text-color': '#333',
            'text-halo-color': 'rgba(255,255,255,0.9)',
            'text-halo-width': 2,
          },
        },
        {
          id: 'place-town',
          type: 'symbol',
          source: 'campania',
          'source-layer': 'place',
          filter: ['==', 'class', 'town'],
          layout: {
            'text-field': ['coalesce', ['get', 'name:it'], ['get', 'name:latin'], ['get', 'name']],
            'text-font': ['Open Sans Bold'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 7, 10, 12, 14],
            'text-max-width': 8,
          },
          paint: {
            'text-color': '#444',
            'text-halo-color': 'rgba(255,255,255,0.9)',
            'text-halo-width': 1.5,
          },
        },
        {
          id: 'place-village',
          type: 'symbol',
          source: 'campania',
          'source-layer': 'place',
          filter: ['==', 'class', 'village'],
          minzoom: 9,
          layout: {
            'text-field': ['coalesce', ['get', 'name:it'], ['get', 'name:latin'], ['get', 'name']],
            'text-font': ['Open Sans Regular'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 9, 9, 14, 12],
            'text-max-width': 7,
          },
          paint: {
            'text-color': '#555',
            'text-halo-color': 'rgba(255,255,255,0.9)',
            'text-halo-width': 1.5,
          },
        },
        {
          id: 'place-hamlet',
          type: 'symbol',
          source: 'campania',
          'source-layer': 'place',
          filter: ['in', 'class', 'hamlet', 'suburb', 'neighbourhood'],
          minzoom: 12,
          layout: {
            'text-field': ['coalesce', ['get', 'name:it'], ['get', 'name:latin'], ['get', 'name']],
            'text-font': ['Open Sans Regular'],
            'text-size': 10,
            'text-max-width': 6,
          },
          paint: {
            'text-color': '#777',
            'text-halo-color': 'rgba(255,255,255,0.8)',
            'text-halo-width': 1,
          },
        },
        // Mountain peaks
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
            'text-offset': [0, 1],
            'icon-image': '',
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
