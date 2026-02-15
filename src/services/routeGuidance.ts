/**
 * Route guidance engine.
 * Computes guidance state from user position + route data on every GPS update.
 */

import type { RouteGuidance, Itinerary, UserLocation } from '../types';
import { GEOFENCE_CONFIG } from '../types';
import {
  nearestPointOnRoute,
  distanceAlongRoute,
  closestCoordIndex,
  bearingBetween,
  haversineDistance,
} from '../utils/geo';

/**
 * Compute the full route guidance state from user position and route data.
 * This is called on every GPS update (~every 3 seconds).
 */
export function computeGuidance(
  userLocation: UserLocation,
  routeCoordinates: [number, number][],
  itinerary: Itinerary,
  currentHotspotIndex: number,
  visitedIds: Set<string>,
): RouteGuidance {
  const userLng = userLocation.longitude;
  const userLat = userLocation.latitude;
  const userHeading = userLocation.heading ?? 0;

  // 1. Find nearest point on route
  const nearest = nearestPointOnRoute(userLng, userLat, routeCoordinates);

  // 2. Find next unvisited hotspot
  let nextHotspotIdx = currentHotspotIndex;
  const hotspots = itinerary.hotspots;

  // Advance past visited hotspots
  while (
    nextHotspotIdx < hotspots.length &&
    visitedIds.has(hotspots[nextHotspotIdx].id)
  ) {
    nextHotspotIdx++;
  }

  // If all visited, point to last hotspot
  if (nextHotspotIdx >= hotspots.length) {
    nextHotspotIdx = hotspots.length - 1;
  }

  const nextHotspot = hotspots[nextHotspotIdx];

  // 3. Calculate distance along route to next hotspot
  const hotspotCoordIdx = closestCoordIndex(
    nextHotspot.latitude,
    nextHotspot.longitude,
    routeCoordinates,
  );

  let distToNextHotspot = 0;
  if (nearest.segmentIndex <= hotspotCoordIdx) {
    distToNextHotspot = distanceAlongRoute(
      nearest.segmentIndex,
      nearest.t,
      hotspotCoordIdx,
      routeCoordinates,
    );
  } else {
    // User is past the hotspot — show direct distance
    distToNextHotspot = haversineDistance(
      userLat,
      userLng,
      nextHotspot.latitude,
      nextHotspot.longitude,
    );
  }

  // 4. Calculate bearing to next hotspot
  const bearing = bearingBetween(
    userLat,
    userLng,
    nextHotspot.latitude,
    nextHotspot.longitude,
  );

  // 5. Determine flags
  const isOffRoute = nearest.distance > GEOFENCE_CONFIG.offRouteThreshold;
  const isApproachingHotspot =
    distToNextHotspot < GEOFENCE_CONFIG.approachingThreshold;
  const isAtHotspot =
    haversineDistance(
      userLat,
      userLng,
      nextHotspot.latitude,
      nextHotspot.longitude,
    ) <= Math.max(nextHotspot.geofenceRadiusM, (userLocation.accuracy ?? 10) * 1.2);

  return {
    userLat,
    userLng,
    userHeading,
    nearestPointOnRoute: nearest.nearestPoint,
    distanceToRoute: nearest.distance,
    distanceToNextHotspot: distToNextHotspot,
    bearingToNextHotspot: bearing,
    isOffRoute,
    isApproachingHotspot,
    isAtHotspot,
    currentSegmentIndex: nearest.segmentIndex,
    nextHotspotIndex: nextHotspotIdx,
  };
}

/**
 * Format distance for display.
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Estimate time to reach a point based on distance.
 * Assumes ~15 km/h average cycling speed.
 */
export function estimateTimeMinutes(meters: number): number {
  const kmPerHour = 15;
  return Math.round((meters / 1000 / kmPerHour) * 60);
}
