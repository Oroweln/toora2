// ─── Itinerary & Hotspot Data Model ──────────────────────────────────────

export type Difficulty = 'easy' | 'moderate' | 'hard';
export type TerrainType = 'paved' | 'gravel' | 'trail';

export interface HotspotContent {
  heroImage: string | null;
  gallery: string[];
  text: string | null;
  audioGuide: string | null;
  video: string | null;
}

export interface Hotspot {
  id: string;
  sequence: number;
  isActive: boolean;
  title: string;
  shortDescription: string;
  latitude: number;
  longitude: number;
  geofenceRadiusM: number;
  content: HotspotContent | null;
}

export interface StartingPoint {
  latitude: number;
  longitude: number;
  geofenceRadiusM: number;
  name: string;
  navigationAddress: string;
}

export interface Itinerary {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImage: string | null;
  difficulty: Difficulty;
  distanceKm: number;
  estimatedDurationMinutes: number;
  elevationGainM: number;
  terrain: TerrainType[];
  tags: string[];
  routeGeoJSON: string;
  startingPoint: StartingPoint;
  hotspots: Hotspot[];
}

export interface ItinerariesData {
  version: string;
  itineraries: Itinerary[];
}

// ─── GeoJSON Types ───────────────────────────────────────────────────────

export interface GeoJSONLineString {
  type: 'LineString';
  coordinates: [number, number][];
}

export interface GeoJSONFeature {
  type: 'Feature';
  properties: { itineraryId: string };
  geometry: GeoJSONLineString;
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

// ─── GPS & Navigation Types ──────────────────────────────────────────────

export interface UserLocation {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export interface RouteGuidance {
  userLat: number;
  userLng: number;
  userHeading: number;
  nearestPointOnRoute: [number, number]; // [lng, lat]
  distanceToRoute: number; // meters
  distanceToNextHotspot: number; // meters along route
  bearingToNextHotspot: number; // compass degrees
  isOffRoute: boolean;
  isApproachingHotspot: boolean;
  isAtHotspot: boolean;
  currentSegmentIndex: number;
  nextHotspotIndex: number;
}

// ─── Geofence Types ──────────────────────────────────────────────────────

export interface GeofenceRegion {
  identifier: string;
  latitude: number;
  longitude: number;
  radius: number;
  notifyOnEnter: boolean;
  notifyOnExit: boolean;
}

export type GeofenceEvent = 'enter' | 'exit';

// ─── Navigation Mode ─────────────────────────────────────────────────────

export type NavigationMode =
  | 'idle' // No route active
  | 'navigating_to_start' // External nav to starting point
  | 'on_route' // On the curated route
  | 'completed'; // Route finished

// ─── Hotspot Marker State ────────────────────────────────────────────────

export type HotspotMarkerState =
  | 'locked' // Not visited, outside geofence
  | 'approaching' // Within approaching threshold
  | 'active' // Within geofence, content accessible
  | 'visited' // Already visited
  | 'waypoint'; // Inactive hotspot (no rich content)

// ─── GPS Config ──────────────────────────────────────────────────────────

export const GPS_CONFIG = {
  foreground: {
    accuracy: 6, // BestForNavigation
    timeInterval: 3000,
    distanceInterval: 5,
  },
  background: {
    accuracy: 3, // Balanced
    timeInterval: 10000,
    distanceInterval: 20,
  },
} as const;

export const GEOFENCE_CONFIG = {
  startingPointRadius: 30,
  hotspotRadius: 25,
  offRouteThreshold: 50,
  approachingThreshold: 100,
  gracePeriodMs: 10 * 60 * 1000, // 10 minutes
} as const;
