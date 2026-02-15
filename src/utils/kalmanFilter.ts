/**
 * Simple 1D Kalman Filter for GPS smoothing.
 * Reduces GPS jitter by smoothing coordinate updates.
 */
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

  update(measurement: number): number {
    // Prediction
    this.errorEstimate += this.q;

    // Update
    const kalmanGain =
      this.errorEstimate / (this.errorEstimate + this.errorMeasurement);
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

    // Adjust measurement error based on reported GPS accuracy
    const errorScale = Math.max(1, accuracy / 10);

    // Scale process noise by time delta (more time = more potential movement)
    const dt = Math.max(0.1, (timestamp - this.lastTimestamp) / 1000);
    this.lastTimestamp = timestamp;

    const smoothedLat = this.latFilter.update(latitude);
    const smoothedLng = this.lngFilter.update(longitude);

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
  const { haversineDistance } = require('./geo');
  return haversineDistance(prevLat, prevLng, newLat, newLng) > maxJumpMeters;
}
