/**
 * Simple 1D Kalman Filter for GPS smoothing.
 * Reduces GPS jitter by smoothing coordinate updates.
 */

import { haversineDistance } from './geo';

export class KalmanFilter {
  private estimate: number;
  private errorEstimate: number;
  private errorMeasurement: number;
  private q: number; // process noise

  constructor(
    initialEstimate: number = 0,
    initialErrorEstimate: number = 1,
    errorMeasurement: number = 1,
    processNoise: number = 0.01,
  ) {
    this.estimate = initialEstimate;
    this.errorEstimate = initialErrorEstimate;
    this.errorMeasurement = errorMeasurement;
    this.q = processNoise;
  }

  /**
   * Update the filter with a new measurement.
   *
   * @param measurement        The raw observed value (lat or lng degree).
   * @param measurementNoiseScale  Scale factor applied to the base measurement
   *   noise (R). Pass a value > 1 when GPS accuracy is poor so the filter
   *   trusts the raw reading less and relies more on its prior estimate.
   *   Derived from: max(1, gpsAccuracyMeters / 10).
   * @param processNoiseScale  Scale factor applied to the process noise (Q).
   *   Pass the elapsed time in seconds so that longer gaps between updates
   *   increase the uncertainty of the prior estimate, allowing faster
   *   convergence to the new measurement.
   */
  update(
    measurement: number,
    measurementNoiseScale: number = 1,
    processNoiseScale: number = 1,
  ): number {
    // Prediction — uncertainty grows with elapsed time
    this.errorEstimate += this.q * processNoiseScale;

    // Dynamic measurement noise: poor GPS → larger R → trust prior more
    const R = this.errorMeasurement * measurementNoiseScale;

    // Update
    const kalmanGain = this.errorEstimate / (this.errorEstimate + R);
    this.estimate = this.estimate + kalmanGain * (measurement - this.estimate);
    this.errorEstimate = (1 - kalmanGain) * this.errorEstimate;

    return this.estimate;
  }

  reset(initialEstimate: number): void {
    this.estimate = initialEstimate;
    this.errorEstimate = 1;
  }

  get currentEstimate(): number {
    return this.estimate;
  }
}

/**
 * GPS coordinate smoother using two Kalman filters (lat + lng).
 */
export class GPSSmoother {
  private latFilter: KalmanFilter;
  private lngFilter: KalmanFilter;
  private lastTimestamp: number = 0;
  private initialized: boolean = false;

  constructor(errorMeasurement: number = 3, processNoise: number = 0.5) {
    this.latFilter = new KalmanFilter(0, 1, errorMeasurement, processNoise);
    this.lngFilter = new KalmanFilter(0, 1, errorMeasurement, processNoise);
  }

  update(
    latitude: number,
    longitude: number,
    accuracy: number,
    timestamp: number,
  ): { latitude: number; longitude: number } {
    if (!this.initialized) {
      this.latFilter.reset(latitude);
      this.lngFilter.reset(longitude);
      this.initialized = true;
      this.lastTimestamp = timestamp;
      return { latitude, longitude };
    }

    // Poor GPS accuracy → increase measurement noise so the filter
    // relies more on its smoothed estimate than the raw reading.
    // errorScale = 1 when accuracy ≤ 10 m, grows linearly beyond that.
    const errorScale = Math.max(1, accuracy / 10);

    // Scale process noise by elapsed time: a longer gap means the device
    // could have moved further, so we should allow the estimate to update
    // more aggressively toward the new measurement.
    const dt = Math.max(0.1, (timestamp - this.lastTimestamp) / 1000);
    this.lastTimestamp = timestamp;

    const smoothedLat = this.latFilter.update(latitude, errorScale, dt);
    const smoothedLng = this.lngFilter.update(longitude, errorScale, dt);

    return { latitude: smoothedLat, longitude: smoothedLng };
  }

  reset(): void {
    this.initialized = false;
  }
}

/**
 * Simple outlier rejection: reject GPS readings that jump too far.
 */
export function isOutlier(
  prevLat: number,
  prevLng: number,
  newLat: number,
  newLng: number,
  maxJumpMeters: number = 50,
): boolean {
  return haversineDistance(prevLat, prevLng, newLat, newLng) > maxJumpMeters;
}
