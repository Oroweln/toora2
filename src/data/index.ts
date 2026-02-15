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
import route4Imperatori from './routes/4-imperatori.geojson';
import routePercorsoMagico from './routes/percorso-magico.geojson';
import routeSantAgata from './routes/sant-agata-dei-goti.geojson';
import routeCastelvenere from './routes/castelvenere-camaiola.geojson';
import routeIside from './routes/percorso-di-iside.geojson';
import routeViaAppiaUrbano from './routes/via-appia-urbano.geojson';
import routeViaAppiaApice from './routes/via-appia-benevento-apice.geojson';
import routeViaAppiaEclanum from './routes/via-appia-apice-eclanum.geojson';

const routeGeoJSONMap: Record<string, GeoJSONFeatureCollection> = {
  'routes/4-imperatori.geojson': route4Imperatori as unknown as GeoJSONFeatureCollection,
  'routes/percorso-magico.geojson': routePercorsoMagico as unknown as GeoJSONFeatureCollection,
  'routes/sant-agata-dei-goti.geojson': routeSantAgata as unknown as GeoJSONFeatureCollection,
  'routes/castelvenere-camaiola.geojson': routeCastelvenere as unknown as GeoJSONFeatureCollection,
  'routes/percorso-di-iside.geojson': routeIside as unknown as GeoJSONFeatureCollection,
  'routes/via-appia-urbano.geojson': routeViaAppiaUrbano as unknown as GeoJSONFeatureCollection,
  'routes/via-appia-benevento-apice.geojson': routeViaAppiaApice as unknown as GeoJSONFeatureCollection,
  'routes/via-appia-apice-eclanum.geojson': routeViaAppiaEclanum as unknown as GeoJSONFeatureCollection,
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
