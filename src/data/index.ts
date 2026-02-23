/**
 * Data loading module for TOORA.
 * Loads itineraries and route GeoJSON from bundled assets.
 */

import type {
  ItinerariesData,
  Itinerary,
  GeoJSONFeatureCollection,
} from '../types';

// Import the master data file directly
import itinerariesRaw from './itineraries.json';

// Import all route GeoJSON files
import route4Imperatori from './routes/4-imperatori.json';
import routePercorsoMagico from './routes/percorso-magico.json';
import routeSantAgata from './routes/sant-agata-dei-goti.json';
import routeCastelvenere from './routes/castelvenere-camaiola.json';
import routeIside from './routes/percorso-di-iside.json';
import routeViaAppiaUrbano from './routes/via-appia-urbano.json';
import routeViaAppiaApice from './routes/via-appia-benevento-apice.json';
import routeViaAppiaEclanum from './routes/via-appia-apice-eclanum.json';
import routeTestBelgrade from './routes/test-belgrade.json';
import routeTestBenevento from './routes/test-benevento.json';
import routeTestBelgrade2 from './routes/test-belgrade2.json';

const routeGeoJSONMap: Record<string, GeoJSONFeatureCollection> = {
  'routes/4-imperatori.json': route4Imperatori as unknown as GeoJSONFeatureCollection,
  'routes/percorso-magico.json': routePercorsoMagico as unknown as GeoJSONFeatureCollection,
  'routes/sant-agata-dei-goti.json': routeSantAgata as unknown as GeoJSONFeatureCollection,
  'routes/castelvenere-camaiola.json': routeCastelvenere as unknown as GeoJSONFeatureCollection,
  'routes/percorso-di-iside.json': routeIside as unknown as GeoJSONFeatureCollection,
  'routes/via-appia-urbano.json': routeViaAppiaUrbano as unknown as GeoJSONFeatureCollection,
  'routes/via-appia-benevento-apice.json': routeViaAppiaApice as unknown as GeoJSONFeatureCollection,
  'routes/via-appia-apice-eclanum.json': routeViaAppiaEclanum as unknown as GeoJSONFeatureCollection,
  'routes/test-belgrade.json': routeTestBelgrade as unknown as GeoJSONFeatureCollection,
  'routes/test-benevento.json': routeTestBenevento as unknown as GeoJSONFeatureCollection,
  'routes/test-belgrade2.json': routeTestBelgrade2 as unknown as GeoJSONFeatureCollection,
};

const data = itinerariesRaw as unknown as ItinerariesData;

/**
 * Get all itineraries.
 */
export function getItineraries(): Itinerary[] {
  return data.itineraries;
}

/**
 * Get a single itinerary by ID.
 */
export function getItinerary(id: string): Itinerary | undefined {
  return data.itineraries.find((it) => it.id === id);
}

/**
 * Get the GeoJSON for an itinerary's route.
 */
export function getRouteGeoJSON(
  itinerary: Itinerary,
): GeoJSONFeatureCollection | null {
  return routeGeoJSONMap[itinerary.routeGeoJSON] ?? null;
}

/**
 * Get route coordinates as a flat array of [lng, lat] pairs.
 */
export function getRouteCoordinates(
  itinerary: Itinerary,
): [number, number][] {
  const geojson = getRouteGeoJSON(itinerary);
  if (!geojson || !geojson.features[0]) return [];
  return geojson.features[0].geometry.coordinates as [number, number][];
}
