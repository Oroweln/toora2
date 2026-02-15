/**
 * Geographic utility functions for TOORA
 * Pure math — no external dependencies
 */

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const EARTH_RADIUS = 6371000; // meters

/**
 * Calculate distance between two GPS coordinates using the Haversine formula.
 * Returns distance in meters.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLon = (lon2 - lon1) * DEG_TO_RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG_TO_RAD) *
      Math.cos(lat2 * DEG_TO_RAD) *
      Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calculate the bearing from point A to point B.
 * Returns bearing in degrees (0-360, 0 = north, 90 = east).
 */
export function bearingBetween(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLon = (lon2 - lon1) * DEG_TO_RAD;
  const lat1Rad = lat1 * DEG_TO_RAD;
  const lat2Rad = lat2 * DEG_TO_RAD;

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  const bearing = Math.atan2(y, x) * RAD_TO_DEG;
  return (bearing + 360) % 360;
}

/**
 * Calculate the shortest distance from a point to a line segment.
 * All coordinates are [longitude, latitude].
 * Returns { distance (meters), nearestPoint: [lng, lat], t (0-1 param along segment) }.
 */
export function pointToLineSegmentDistance(
  point: [number, number],
  segStart: [number, number],
  segEnd: [number, number],
): { distance: number; nearestPoint: [number, number]; t: number } {
  const [px, py] = point; // lng, lat
  const [ax, ay] = segStart;
  const [bx, by] = segEnd;

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  let t: number;
  if (lenSq === 0) {
    // Segment is a single point
    t = 0;
  } else {
    t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
  }

  const nearestLng = ax + t * dx;
  const nearestLat = ay + t * dy;
  const distance = haversineDistance(py, px, nearestLat, nearestLng);

  return {
    distance,
    nearestPoint: [nearestLng, nearestLat],
    t,
  };
}

/**
 * Find the nearest point on a route polyline to the user's position.
 * Returns the nearest point, distance, and segment index.
 */
export function nearestPointOnRoute(
  userLng: number,
  userLat: number,
  routeCoordinates: [number, number][],
): {
  nearestPoint: [number, number];
  distance: number;
  segmentIndex: number;
  t: number;
} {
  let minDist = Infinity;
  let bestPoint: [number, number] = routeCoordinates[0] || [0, 0];
  let bestSegment = 0;
  let bestT = 0;

  for (let i = 0; i < routeCoordinates.length - 1; i++) {
    const result = pointToLineSegmentDistance(
      [userLng, userLat],
      routeCoordinates[i],
      routeCoordinates[i + 1],
    );

    if (result.distance < minDist) {
      minDist = result.distance;
      bestPoint = result.nearestPoint;
      bestSegment = i;
      bestT = result.t;
    }
  }

  return {
    nearestPoint: bestPoint,
    distance: minDist,
    segmentIndex: bestSegment,
    t: bestT,
  };
}

/**
 * Calculate distance along the route from a segment position to a target coordinate index.
 * segmentIndex + t gives the fractional position along the route.
 */
export function distanceAlongRoute(
  fromSegmentIndex: number,
  fromT: number,
  toCoordIndex: number,
  routeCoordinates: [number, number][],
): number {
  if (routeCoordinates.length < 2) return 0;

  let totalDist = 0;
  const startSeg = routeCoordinates[fromSegmentIndex];
  const endSeg = routeCoordinates[fromSegmentIndex + 1];

  if (startSeg && endSeg) {
    // Distance from current position to end of current segment
    const currentLng = startSeg[0] + fromT * (endSeg[0] - startSeg[0]);
    const currentLat = startSeg[1] + fromT * (endSeg[1] - startSeg[1]);
    totalDist += haversineDistance(
      currentLat,
      currentLng,
      endSeg[1],
      endSeg[0],
    );
  }

  // Sum distances of remaining segments
  const startIdx = fromSegmentIndex + 1;
  const endIdx = Math.min(toCoordIndex, routeCoordinates.length - 1);

  for (let i = startIdx; i < endIdx; i++) {
    totalDist += haversineDistance(
      routeCoordinates[i][1],
      routeCoordinates[i][0],
      routeCoordinates[i + 1][1],
      routeCoordinates[i + 1][0],
    );
  }

  return totalDist;
}

/**
 * Find the closest route coordinate index to a given lat/lng.
 */
export function closestCoordIndex(
  targetLat: number,
  targetLng: number,
  routeCoordinates: [number, number][],
): number {
  let minDist = Infinity;
  let bestIdx = 0;

  for (let i = 0; i < routeCoordinates.length; i++) {
    const dist = haversineDistance(
      targetLat,
      targetLng,
      routeCoordinates[i][1],
      routeCoordinates[i][0],
    );
    if (dist < minDist) {
      minDist = dist;
      bestIdx = i;
    }
  }

  return bestIdx;
}

/**
 * Generate a deep link URL to open native maps for navigation.
 */
export function generateDeepLink(
  lat: number,
  lng: number,
  platform: 'ios' | 'android' | 'web',
): string {
  switch (platform) {
    case 'ios':
      return `maps://?daddr=${lat},${lng}&dirflg=d`;
    case 'android':
      return `google.navigation:q=${lat},${lng}&mode=d`;
    case 'web':
    default:
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }
}
