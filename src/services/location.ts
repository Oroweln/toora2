/**
 * Location service — wraps expo-location for GPS tracking and geofencing.
 */

import * as Location from 'expo-location';
import { Platform } from 'react-native';
import type { UserLocation, GeofenceRegion } from '../types';
import { GPS_CONFIG } from '../types';

export async function requestLocationPermission(): Promise<boolean> {
  const { status: foreground } =
    await Location.requestForegroundPermissionsAsync();
  if (foreground !== 'granted') return false;

  // Request background for geofence monitoring
  if (Platform.OS !== 'web') {
    const { status: background } =
      await Location.requestBackgroundPermissionsAsync();
    // Background is nice-to-have; foreground is required
    if (background !== 'granted') {
      console.warn(
        'Background location not granted — geofencing may not work when app is backgrounded',
      );
    }
  }

  return true;
}

export async function getCurrentPosition(): Promise<UserLocation | null> {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
    });
    return mapExpoLocation(location);
  } catch (e) {
    console.warn('Failed to get current position:', e);
    return null;
  }
}

export function startForegroundTracking(
  onUpdate: (location: UserLocation) => void,
): { remove: () => void } {
  let subscription: Location.LocationSubscription | null = null;

  (async () => {
    subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: GPS_CONFIG.foreground.timeInterval,
        distanceInterval: GPS_CONFIG.foreground.distanceInterval,
      },
      (location) => {
        onUpdate(mapExpoLocation(location));
      },
    );
  })();

  return {
    remove: () => {
      subscription?.remove();
    },
  };
}

export async function registerGeofences(
  regions: GeofenceRegion[],
): Promise<void> {
  try {
    await Location.startGeofencingAsync('TOORA_GEOFENCE_TASK', regions);
  } catch (e) {
    console.warn('Failed to register geofences:', e);
  }
}

export async function unregisterGeofences(): Promise<void> {
  try {
    const isRegistered =
      await Location.hasStartedGeofencingAsync('TOORA_GEOFENCE_TASK');
    if (isRegistered) {
      await Location.stopGeofencingAsync('TOORA_GEOFENCE_TASK');
    }
  } catch (e) {
    console.warn('Failed to unregister geofences:', e);
  }
}

function mapExpoLocation(location: Location.LocationObject): UserLocation {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    altitude: location.coords.altitude,
    accuracy: location.coords.accuracy ?? 10,
    heading: location.coords.heading,
    speed: location.coords.speed,
    timestamp: location.timestamp,
  };
}
