import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface VisitState {
  // Visited hotspots with timestamps
  visitedHotspots: Record<string, string>; // hotspotId → ISO timestamp

  // Started/completed itineraries
  startedItineraries: Record<string, string>; // itineraryId → ISO timestamp
  completedItineraries: Record<string, string>;

  // Last active route for resume
  activeRouteId: string | null;
  lastKnownLat: number | null;
  lastKnownLng: number | null;

  // Actions
  markVisited: (hotspotId: string) => Promise<void>;
  markItineraryStarted: (itineraryId: string) => Promise<void>;
  markItineraryCompleted: (itineraryId: string) => Promise<void>;
  setActiveRoute: (
    itineraryId: string | null,
    lat?: number,
    lng?: number,
  ) => Promise<void>;
  isHotspotVisited: (hotspotId: string) => boolean;
  isItineraryCompleted: (itineraryId: string) => boolean;
  getVisitedCount: (itineraryId: string) => number;
  loadFromStorage: () => Promise<void>;
}

export const useVisitStore = create<VisitState>((set, get) => ({
  visitedHotspots: {},
  startedItineraries: {},
  completedItineraries: {},
  activeRouteId: null,
  lastKnownLat: null,
  lastKnownLng: null,

  markVisited: async (hotspotId) => {
    const timestamp = new Date().toISOString();
    set((state) => ({
      visitedHotspots: { ...state.visitedHotspots, [hotspotId]: timestamp },
    }));
    await AsyncStorage.setItem(`visited:${hotspotId}`, timestamp);
  },

  markItineraryStarted: async (itineraryId) => {
    const timestamp = new Date().toISOString();
    set((state) => ({
      startedItineraries: {
        ...state.startedItineraries,
        [itineraryId]: timestamp,
      },
    }));
    await AsyncStorage.setItem(`started:${itineraryId}`, timestamp);
  },

  markItineraryCompleted: async (itineraryId) => {
    const timestamp = new Date().toISOString();
    set((state) => ({
      completedItineraries: {
        ...state.completedItineraries,
        [itineraryId]: timestamp,
      },
    }));
    await AsyncStorage.setItem(`completed:${itineraryId}`, timestamp);
  },

  setActiveRoute: async (itineraryId, lat, lng) => {
    set({
      activeRouteId: itineraryId,
      lastKnownLat: lat ?? null,
      lastKnownLng: lng ?? null,
    });
    if (itineraryId) {
      await AsyncStorage.setItem('activeRoute', itineraryId);
      if (lat) await AsyncStorage.setItem('lastKnownLat', String(lat));
      if (lng) await AsyncStorage.setItem('lastKnownLng', String(lng));
    } else {
      await AsyncStorage.multiRemove([
        'activeRoute',
        'lastKnownLat',
        'lastKnownLng',
      ]);
    }
  },

  isHotspotVisited: (hotspotId) => {
    return hotspotId in get().visitedHotspots;
  },

  isItineraryCompleted: (itineraryId) => {
    return itineraryId in get().completedItineraries;
  },

  getVisitedCount: (itineraryId) => {
    const prefix = `hs_${itineraryId.split('_')[1]}_`;
    return Object.keys(get().visitedHotspots).filter((id) =>
      id.startsWith(prefix),
    ).length;
  },

  loadFromStorage: async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const visitedKeys = keys.filter((k) => k.startsWith('visited:'));
      const startedKeys = keys.filter((k) => k.startsWith('started:'));
      const completedKeys = keys.filter((k) => k.startsWith('completed:'));

      const visited: Record<string, string> = {};
      for (const key of visitedKeys) {
        const val = await AsyncStorage.getItem(key);
        if (val) visited[key.replace('visited:', '')] = val;
      }

      const started: Record<string, string> = {};
      for (const key of startedKeys) {
        const val = await AsyncStorage.getItem(key);
        if (val) started[key.replace('started:', '')] = val;
      }

      const completed: Record<string, string> = {};
      for (const key of completedKeys) {
        const val = await AsyncStorage.getItem(key);
        if (val) completed[key.replace('completed:', '')] = val;
      }

      const activeRoute = await AsyncStorage.getItem('activeRoute');
      const lastLat = await AsyncStorage.getItem('lastKnownLat');
      const lastLng = await AsyncStorage.getItem('lastKnownLng');

      set({
        visitedHotspots: visited,
        startedItineraries: started,
        completedItineraries: completed,
        activeRouteId: activeRoute,
        lastKnownLat: lastLat ? parseFloat(lastLat) : null,
        lastKnownLng: lastLng ? parseFloat(lastLng) : null,
      });
    } catch (e) {
      console.warn('Failed to load visit data from storage:', e);
    }
  },
}));
