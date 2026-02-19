/**
 * Navigation service — deep linking to native maps.
 */

import { Linking, Platform } from 'react-native';

/**
 * Open native maps app to navigate to a destination.
 * Implements REQ-01: External Navigation to Starting Point.
 */
export async function openNativeNavigation(
  destLat: number,
  destLng: number,
  label?: string,
): Promise<void> {
  const platform = Platform.OS;

  if (platform === 'ios') {
    const appleUrl = `maps://?daddr=${destLat},${destLng}&dirflg=d`;
    await Linking.openURL(appleUrl);
    return;
  }

  if (platform === 'android') {
    const androidUrl = `google.navigation:q=${destLat},${destLng}&mode=d`;
    const canOpen = await Linking.canOpenURL(androidUrl);

    if (canOpen) {
      await Linking.openURL(androidUrl);
      return;
    }
  }

  // Fallback: web URL
  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`;
  await Linking.openURL(webUrl);
}

/**
 * Open native maps to navigate back to a point on the route (off-route recovery).
 */
export async function navigateToRoutePoint(
  lat: number,
  lng: number,
): Promise<void> {
  return openNativeNavigation(lat, lng, 'Back to route');
}
