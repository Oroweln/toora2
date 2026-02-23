import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import type {
  Itinerary,
  NavigationMode,
  RouteGuidance,
  GeoJSONFeatureCollection,
} from '../types';

interface PersistedSession {
  visitedHotspotIds: string[];
  unlockedHotspotIds: string[];
  hotspotEntryTimestamps: Record<string, number>;
  currentHotspotIndex: number;
  navigationMode: NavigationMode;
  startedAt: number;
}

function storageKey(itineraryId: string) {
  return `routeSession:${itineraryId}`;
}

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
  resumeRoute: (
    itinerary: Itinerary,
    geojson: GeoJSONFeatureCollection,
    session: PersistedSession,
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

function persistSession(state: RouteState) {
  const id = state.activeItinerary?.id;
  if (!id) return;
  const session: PersistedSession = {
    visitedHotspotIds: [...state.visitedHotspotIds],
    unlockedHotspotIds: [...state.unlockedHotspotIds],
    hotspotEntryTimestamps: state.hotspotEntryTimestamps,
    currentHotspotIndex: state.currentHotspotIndex,
    navigationMode: state.navigationMode,
    startedAt: state.startedAt ?? Date.now(),
  };
  AsyncStorage.setItem(storageKey(id), JSON.stringify(session)).catch(() => {});
}

/**
 * Load persisted session for a given itinerary.
 * Returns null if no session exists.
 */
export async function loadPersistedSession(
  itineraryId: string,
): Promise<PersistedSession | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(itineraryId));
    if (!raw) return null;
    return JSON.parse(raw) as PersistedSession;
  } catch {
    return null;
  }
}

export async function clearPersistedSession(itineraryId: string): Promise<void> {
  await AsyncStorage.removeItem(storageKey(itineraryId));
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

  startRoute: (itinerary, geojson) => {
    const newState = {
      activeItinerary: itinerary,
      routeGeoJSON: geojson,
      navigationMode: 'navigating_to_start' as NavigationMode,
      guidance: null,
      currentHotspotIndex: 0,
      visitedHotspotIds: new Set<string>(),
      unlockedHotspotIds: new Set<string>(),
      hotspotEntryTimestamps: {},
      startedAt: Date.now(),
    };
    set(newState);
    persistSession({ ...get(), ...newState });
  },

  resumeRoute: (itinerary, geojson, session) => {
    const newState = {
      activeItinerary: itinerary,
      routeGeoJSON: geojson,
      navigationMode: session.navigationMode,
      guidance: null,
      currentHotspotIndex: session.currentHotspotIndex,
      visitedHotspotIds: new Set(session.visitedHotspotIds),
      unlockedHotspotIds: new Set(session.unlockedHotspotIds),
      hotspotEntryTimestamps: session.hotspotEntryTimestamps,
      startedAt: session.startedAt,
    };
    set(newState);
  },

  setNavigationMode: (mode) => {
    set({ navigationMode: mode });
    persistSession(get());
  },

  updateGuidance: (guidance) => set({ guidance }),

  markHotspotVisited: (hotspotId) => {
    set((state) => {
      const newVisited = new Set(state.visitedHotspotIds);
      newVisited.add(hotspotId);
      return { visitedHotspotIds: newVisited };
    });
    persistSession(get());
  },

  unlockHotspot: (hotspotId) => {
    set((state) => {
      const newUnlocked = new Set(state.unlockedHotspotIds);
      newUnlocked.add(hotspotId);
      return { unlockedHotspotIds: newUnlocked };
    });
    persistSession(get());
  },

  lockHotspot: (hotspotId) => {
    set((state) => {
      const newUnlocked = new Set(state.unlockedHotspotIds);
      newUnlocked.delete(hotspotId);
      return { unlockedHotspotIds: newUnlocked };
    });
    persistSession(get());
  },

  recordHotspotEntry: (hotspotId) => {
    set((state) => ({
      hotspotEntryTimestamps: {
        ...state.hotspotEntryTimestamps,
        [hotspotId]: Date.now(),
      },
    }));
    persistSession(get());
  },

  advanceToNextHotspot: () => {
    set((state) => ({
      currentHotspotIndex: Math.min(
        state.currentHotspotIndex + 1,
        (state.activeItinerary?.hotspots.length ?? 1) - 1,
      ),
    }));
    persistSession(get());
  },

  completeRoute: () => {
    set({ navigationMode: 'completed' });
    persistSession(get());
  },

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
