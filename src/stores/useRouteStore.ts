import { create } from 'zustand';
import type {
  Itinerary,
  NavigationMode,
  RouteGuidance,
  GeoJSONFeatureCollection,
} from '../types';

interface RouteState {
  // Current active route
  activeItinerary: Itinerary | null;
  routeGeoJSON: GeoJSONFeatureCollection | null;
  navigationMode: NavigationMode;

  // Route guidance (recomputed every GPS update)
  guidance: RouteGuidance | null;

  // Current hotspot progress
  currentHotspotIndex: number; // index in itinerary.hotspots
  visitedHotspotIds: Set<string>;
  unlockedHotspotIds: Set<string>;

  // Timestamps for grace period
  hotspotEntryTimestamps: Record<string, number>;

  // Route start time
  startedAt: number | null;

  // Actions
  startRoute: (
    itinerary: Itinerary,
    geojson: GeoJSONFeatureCollection,
  ) => void;
  setNavigationMode: (mode: NavigationMode) => void;
  updateGuidance: (guidance: RouteGuidance) => void;
  markHotspotVisited: (hotspotId: string) => void;
  unlockHotspot: (hotspotId: string) => void;
  lockHotspot: (hotspotId: string) => void;
  recordHotspotEntry: (hotspotId: string) => void;
  advanceToNextHotspot: () => void;
  completeRoute: () => void;
  exitRoute: () => void;
}

export const useRouteStore = create<RouteState>((set, get) => ({
  activeItinerary: null,
  routeGeoJSON: null,
  navigationMode: 'idle',
  guidance: null,
  currentHotspotIndex: 0,
  visitedHotspotIds: new Set(),
  unlockedHotspotIds: new Set(),
  hotspotEntryTimestamps: {},
  startedAt: null,

  startRoute: (itinerary, geojson) =>
    set({
      activeItinerary: itinerary,
      routeGeoJSON: geojson,
      navigationMode: 'navigating_to_start',
      guidance: null,
      currentHotspotIndex: 0,
      visitedHotspotIds: new Set(),
      unlockedHotspotIds: new Set(),
      hotspotEntryTimestamps: {},
      startedAt: Date.now(),
    }),

  setNavigationMode: (mode) => set({ navigationMode: mode }),

  updateGuidance: (guidance) => set({ guidance }),

  markHotspotVisited: (hotspotId) =>
    set((state) => {
      const newVisited = new Set(state.visitedHotspotIds);
      newVisited.add(hotspotId);
      return { visitedHotspotIds: newVisited };
    }),

  unlockHotspot: (hotspotId) =>
    set((state) => {
      const newUnlocked = new Set(state.unlockedHotspotIds);
      newUnlocked.add(hotspotId);
      return { unlockedHotspotIds: newUnlocked };
    }),

  lockHotspot: (hotspotId) =>
    set((state) => {
      const newUnlocked = new Set(state.unlockedHotspotIds);
      newUnlocked.delete(hotspotId);
      return { unlockedHotspotIds: newUnlocked };
    }),

  recordHotspotEntry: (hotspotId) =>
    set((state) => ({
      hotspotEntryTimestamps: {
        ...state.hotspotEntryTimestamps,
        [hotspotId]: Date.now(),
      },
    })),

  advanceToNextHotspot: () =>
    set((state) => ({
      currentHotspotIndex: Math.min(
        state.currentHotspotIndex + 1,
        (state.activeItinerary?.hotspots.length ?? 1) - 1,
      ),
    })),

  completeRoute: () => set({ navigationMode: 'completed' }),

  exitRoute: () =>
    set({
      activeItinerary: null,
      routeGeoJSON: null,
      navigationMode: 'idle',
      guidance: null,
      currentHotspotIndex: 0,
      visitedHotspotIds: new Set(),
      unlockedHotspotIds: new Set(),
      hotspotEntryTimestamps: {},
      startedAt: null,
    }),
}));
