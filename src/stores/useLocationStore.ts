import { create } from 'zustand';
import type { UserLocation } from '../types';

interface LocationState {
  // Current GPS position
  currentLocation: UserLocation | null;
  isTracking: boolean;
  gpsAccuracy: number | null; // meters
  isGPSWeak: boolean; // accuracy > 30m

  // Permission state
  hasPermission: boolean;
  permissionDenied: boolean;

  // Actions
  updateLocation: (location: UserLocation) => void;
  setTracking: (isTracking: boolean) => void;
  setPermission: (hasPermission: boolean, denied?: boolean) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  currentLocation: null,
  isTracking: false,
  gpsAccuracy: null,
  isGPSWeak: false,
  hasPermission: false,
  permissionDenied: false,

  updateLocation: (location) =>
    set({
      currentLocation: location,
      gpsAccuracy: location.accuracy,
      isGPSWeak: location.accuracy > 30,
    }),

  setTracking: (isTracking) => set({ isTracking }),

  setPermission: (hasPermission, denied = false) =>
    set({ hasPermission, permissionDenied: denied }),
}));
