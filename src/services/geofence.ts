/**
 * Geofence management service.
 * Handles geofence registration and content accessibility checks.
 */

import type { Hotspot, Itinerary, GeofenceRegion } from '../types';
import { GEOFENCE_CONFIG } from '../types';
import { haversineDistance } from '../utils/geo';

/**
 * Build geofence regions for an itinerary's starting point and all hotspots.
 */
export function buildGeofenceRegions(itinerary: Itinerary): GeofenceRegion[] {
  const regions: GeofenceRegion[] = [];

  // Starting point geofence
  regions.push({
    identifier: `start_${itinerary.id}`,
    latitude: itinerary.startingPoint.latitude,
    longitude: itinerary.startingPoint.longitude,
    radius: itinerary.startingPoint.geofenceRadiusM,
    notifyOnEnter: true,
    notifyOnExit: false,
  });

  // Hotspot geofences
  for (const hs of itinerary.hotspots) {
    regions.push({
      identifier: hs.id,
      latitude: hs.latitude,
      longitude: hs.longitude,
      radius: hs.geofenceRadiusM,
      notifyOnEnter: true,
      notifyOnExit: true,
    });
  }

  return regions;
}

/**
 * Check if a hotspot's content is accessible based on the user's position.
 * Implements geo-lock with dynamic radius and grace period.
 */
export function isContentAccessible(
  hotspot: Hotspot,
  userLat: number,
  userLng: number,
  gpsAccuracy: number,
  lastEnteredTimestamp: number | undefined,
): boolean {
  const distance = haversineDistance(
    userLat,
    userLng,
    hotspot.latitude,
    hotspot.longitude,
  );

  // Expand radius if GPS is imprecise
  const effectiveRadius = Math.max(
    hotspot.geofenceRadiusM,
    gpsAccuracy * 1.2,
  );

  // Within geofence radius
  if (distance <= effectiveRadius) {
    return true;
  }

  // Grace period: content stays accessible for 10 min after leaving
  if (
    lastEnteredTimestamp &&
    Date.now() - lastEnteredTimestamp < GEOFENCE_CONFIG.gracePeriodMs
  ) {
    return true;
  }

  return false;
}

/**
 * Check if user is at the starting point.
 */
export function isAtStartingPoint(
  itinerary: Itinerary,
  userLat: number,
  userLng: number,
  gpsAccuracy: number,
): boolean {
  const distance = haversineDistance(
    userLat,
    userLng,
    itinerary.startingPoint.latitude,
    itinerary.startingPoint.longitude,
  );

  const effectiveRadius = Math.max(
    itinerary.startingPoint.geofenceRadiusM,
    gpsAccuracy * 1.2,
  );

  return distance <= effectiveRadius;
}

/**
 * Determine the marker state for a hotspot.
 */
export function getHotspotMarkerState(
  hotspot: Hotspot,
  userLat: number,
  userLng: number,
  gpsAccuracy: number,
  isVisited: boolean,
  lastEnteredTimestamp: number | undefined,
): 'locked' | 'approaching' | 'active' | 'visited' | 'waypoint' {
  if (!hotspot.isActive) return 'waypoint';
  if (isVisited) return 'visited';

  const distance = haversineDistance(
    userLat,
    userLng,
    hotspot.latitude,
    hotspot.longitude,
  );

  const effectiveRadius = Math.max(
    hotspot.geofenceRadiusM,
    gpsAccuracy * 1.2,
  );

  if (distance <= effectiveRadius) return 'active';

  // Check grace period
  if (
    lastEnteredTimestamp &&
    Date.now() - lastEnteredTimestamp < GEOFENCE_CONFIG.gracePeriodMs
  ) {
    return 'active';
  }

  if (distance <= GEOFENCE_CONFIG.approachingThreshold) return 'approaching';

  return 'locked';
}
