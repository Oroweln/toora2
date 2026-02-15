/**
 * Background task definitions for TOORA.
 *
 * This module MUST be imported at the root of the app (e.g. app/_layout.tsx)
 * so that TaskManager.defineTask() runs before any geofence is registered.
 * Expo requires task definitions to exist at module-evaluation time.
 */

import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const GEOFENCE_TASK_NAME = 'TOORA_GEOFENCE_TASK';

/**
 * Background geofence handler.
 *
 * Runs when the OS detects the device crossing a registered geofence boundary,
 * even when the app is backgrounded or suspended.
 *
 * On Enter — persists the hotspot identifier to AsyncStorage so the foreground
 * can pick it up and unlock the hotspot when the app resumes.
 *
 * On Exit — records the exit timestamp so the grace-period logic in the
 * foreground (isContentAccessible) can determine whether the 10-minute window
 * has elapsed.
 */
TaskManager.defineTask(
  GEOFENCE_TASK_NAME,
  async ({ data, error }: TaskManager.TaskManagerTaskBody) => {
    if (error) {
      console.warn('[TOORA] Geofence background task error:', error);
      return;
    }

    // expo-location passes { eventType, region } inside `data`
    const { eventType, region } = data as {
      eventType: Location.GeofencingEventType;
      region: { identifier: string };
    };

    try {
      if (eventType === Location.GeofencingEventType.Enter) {
        // Queue the entered region so the foreground screen can unlock it
        // when the app is next in the foreground.
        const raw = await AsyncStorage.getItem('pendingGeofenceEntries');
        const entries: string[] = raw ? (JSON.parse(raw) as string[]) : [];
        if (!entries.includes(region.identifier)) {
          entries.push(region.identifier);
          await AsyncStorage.setItem(
            'pendingGeofenceEntries',
            JSON.stringify(entries),
          );
        }
        // Persist entry timestamp — mirrors the foreground recordHotspotEntry
        // so the grace-period check works correctly after the app resumes.
        await AsyncStorage.setItem(
          `geofenceEntry:${region.identifier}`,
          Date.now().toString(),
        );
      } else if (eventType === Location.GeofencingEventType.Exit) {
        // Record the exit time so the foreground grace-period check can tell
        // how long ago the user left this geofence.
        await AsyncStorage.setItem(
          `geofenceExit:${region.identifier}`,
          Date.now().toString(),
        );
      }
    } catch (e) {
      console.warn('[TOORA] Failed to process background geofence event:', e);
    }
  },
);
