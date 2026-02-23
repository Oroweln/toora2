#!/usr/bin/env node
/**
 * KML to GeoJSON Converter for TOORA
 * Parses KML files from the assets directory and produces:
 *   1. GeoJSON route files (LineString polylines)
 *   2. A master itineraries.json with hotspot data
 */

const fs = require('fs');
const path = require('path');

// ─── KML Parsing Helpers ────────────────────────────────────────────────

function parseCoordinateString(str) {
  return str
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((triplet) => {
      const [lng, lat, alt] = triplet.split(',').map(Number);
      return [lng, lat, alt || 0];
    });
}

function extractPlacemarks(kmlContent) {
  const placemarks = [];
  const placemarkRegex =
    /<Placemark[^>]*>([\s\S]*?)<\/Placemark>/gi;
  let match;
  while ((match = placemarkRegex.exec(kmlContent)) !== null) {
    const block = match[1];
    const nameMatch = block.match(/<name>([\s\S]*?)<\/name>/);
    const name = nameMatch ? nameMatch[1].trim() : 'Unnamed';

    // Point
    const pointMatch = block.match(
      /<Point>\s*<coordinates>([\s\S]*?)<\/coordinates>\s*<\/Point>/
    );
    // LineString
    const lineMatch = block.match(
      /<LineString>\s*(?:<tessellate>[^<]*<\/tessellate>\s*)?<coordinates>([\s\S]*?)<\/coordinates>\s*<\/LineString>/
    );
    // Polygon
    const polyMatch = block.match(
      /<Polygon>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>[\s\S]*?<\/Polygon>/
    );

    if (pointMatch) {
      const coords = parseCoordinateString(pointMatch[1]);
      placemarks.push({ type: 'Point', name, coordinates: coords[0] });
    } else if (lineMatch) {
      const coords = parseCoordinateString(lineMatch[1]);
      placemarks.push({ type: 'LineString', name, coordinates: coords });
    } else if (polyMatch) {
      const coords = parseCoordinateString(polyMatch[1]);
      placemarks.push({ type: 'Polygon', name, coordinates: coords });
    }
  }
  return placemarks;
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function routeTotalDistance(coords) {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += haversineDistance(
      coords[i - 1][1],
      coords[i - 1][0],
      coords[i][1],
      coords[i][0]
    );
  }
  return total;
}

function estimateDuration(distanceKm, terrain) {
  // Avg cycling speed: ~12 km/h for mixed terrain, plus ~5 min per hotspot stop
  const ridingMinutes = (distanceKm / 12) * 60;
  return Math.round(ridingMinutes + 30); // +30 min for stops
}

// ─── Route Definitions ──────────────────────────────────────────────────

const ROUTES_BASE = path.join(
  __dirname,
  '..',
  'assets',
  'toora routes',
  'TOORA WORD (PERCORSO)'
);

const routeDefinitions = [
  {
    id: 'itinerary_01',
    slug: '4-imperatori',
    title: '4 Imperatori',
    description:
      'Un viaggio nel tempo attraverso Benevento romana, sulle orme di quattro grandi imperatori: Traiano, Domiziano, Adriano e le loro eredità monumentali.',
    kmlFile: path.join(
      ROUTES_BASE,
      'PERCORSO 4 IMPERATORI',
      '4 Imperatori.kml'
    ),
    difficulty: 'easy',
    terrain: ['paved'],
    tags: ['history', 'culture', 'roman'],
  },
  {
    id: 'itinerary_02',
    slug: 'percorso-magico',
    title: 'Percorso Magico Benevento',
    description:
      'Un percorso incantato tra le vie del centro storico di Benevento, dalla Rocca dei Rettori al Teatro Romano, seguendo le tracce delle streghe e dei miti beneventani.',
    kmlFile: path.join(
      ROUTES_BASE,
      'PERCORSO MAGICO',
      'Percorso Magico Benevento.kml'
    ),
    difficulty: 'easy',
    terrain: ['paved'],
    tags: ['history', 'culture', 'magic'],
  },
  {
    id: 'itinerary_03',
    slug: 'sant-agata-dei-goti',
    title: "Sant'Agata dei Goti",
    description:
      "Esplorazione del borgo medievale di Sant'Agata dei Goti, tra castelli, chiese antiche e panorami mozzafiato sulla valle caudina.",
    kmlFile: path.join(
      ROUTES_BASE,
      "PERCORSO SANT'AGATA DEI GOTI",
      "Sant'Agata dei Goti.kml"
    ),
    difficulty: 'moderate',
    terrain: ['paved', 'gravel'],
    tags: ['history', 'culture', 'medieval'],
  },
  {
    id: 'itinerary_04',
    slug: 'castelvenere-camaiola',
    title: 'Castelvenere - La Camaiola',
    description:
      'Un percorso tra vigne e cantine tufacee di Castelvenere, alla scoperta della tradizione vitivinicola campana e del vitigno Camaiola.',
    kmlFile: path.join(
      ROUTES_BASE,
      'PERCORSO CASTELVENERE',
      'Castelvenere _ La Camaiola.kml'
    ),
    difficulty: 'moderate',
    terrain: ['paved', 'gravel', 'trail'],
    tags: ['wine', 'culture', 'nature'],
  },
  {
    id: 'itinerary_05',
    slug: 'percorso-di-iside',
    title: 'Percorso di Iside',
    description:
      'Sulle tracce del culto di Iside a Benevento, un percorso archeologico attraverso i reperti egizi che testimoniano il legame tra Roma e l\'Oriente.',
    kmlFile: path.join(
      ROUTES_BASE,
      'PERCORSO ISIDE',
      'Percorso di Iside.kml'
    ),
    difficulty: 'easy',
    terrain: ['paved'],
    tags: ['history', 'archaeology', 'culture'],
  },
  {
    id: 'itinerary_06',
    slug: 'via-appia-urbano',
    title: 'Via Appia - Percorso Urbano',
    description:
      'Il tratto urbano dell\'antica Via Appia attraverso Benevento, tra monumenti romani, archi trionfali e tracce dell\'antico lastricato.',
    kmlFile: path.join(
      ROUTES_BASE,
      'PERCORSO VIA APPIA',
      'via appia - benevento - percorso urbano',
      'Via Appia 1 _ Percorso Urbano.kml'
    ),
    difficulty: 'easy',
    terrain: ['paved'],
    tags: ['history', 'roman', 'archaeology'],
  },
  {
    id: 'itinerary_07',
    slug: 'via-appia-benevento-apice',
    title: 'Via Appia - Benevento ad Apice',
    description:
      'Il secondo tratto della Via Appia da Benevento verso Apice, attraverso la campagna sannita fino al Ponte Rotto, testimone di duemila anni di storia.',
    kmlFile: path.join(
      ROUTES_BASE,
      'PERCORSO VIA APPIA',
      'via appia - benevento - apice (ponte rotto)',
      'Via Appia 2 _ Benevento - Apice.kml'
    ),
    difficulty: 'moderate',
    terrain: ['paved', 'gravel'],
    tags: ['history', 'roman', 'nature'],
  },
  {
    id: 'itinerary_08',
    slug: 'via-appia-apice-eclanum',
    title: 'Via Appia - Apice a Eclanum',
    description:
      'L\'ultimo tratto della Via Appia da Apice all\'antica città romana di Aeclanum, un percorso attraverso paesaggi collinari e siti archeologici.',
    kmlFile: path.join(
      ROUTES_BASE,
      'PERCORSO VIA APPIA',
      'via appia - apice (ponte rotto) - eclanum',
      'Via Appia 3 _ Apice - Eclanum.kml'
    ),
    difficulty: 'moderate',
    terrain: ['paved', 'gravel', 'trail'],
    tags: ['history', 'roman', 'archaeology', 'nature'],
  },
  {
    id: 'itinerary_11',
    slug: 'test-belgrade2',
    title: 'Test Route 2 - Belgrade',
    description:
      'Second test route through Belgrade, Serbia. Directions from Pante Tutundžića to Nikole Dobrovića 34.',
    kmlFile: path.join(__dirname, '..', 'assets', 'toora routes', 'testroute2.kml'),
    difficulty: 'easy',
    terrain: ['paved'],
    tags: ['test'],
  },
];

// ─── Photo mapping (compressed photos → hotspot names) ──────────────────

const PHOTOS_DIR = path.join(
  __dirname,
  '..',
  'assets',
  'images',
  'TOORA PHOTOS',
  'COMPRESSED PHOTOS'
);

function findMatchingPhoto(hotspotName) {
  if (!fs.existsSync(PHOTOS_DIR)) return null;
  const files = fs.readdirSync(PHOTOS_DIR);
  const nameLower = hotspotName.toLowerCase();

  // Direct name matching heuristics
  const mappings = {
    traiano: 'Arco di Traiano.jpg',
    'arco di traiano': 'Arco di Traiano.jpg',
    obelisco: 'obelisco neoegizio.JPG',
    duomo: 'facciata del duomo.JPG',
    'teatro romano': 'Arco di Traiano.jpg',
    'santa sofia': 'santa sofia.JPG',
    campanile: 'santa sofia.JPG',
    collenea: 'palazzo collenea.jpg',
    'palazzo collenea': 'palazzo collenea.jpg',
    'bosco caldara': 'bosco caldara.jpg',
    'san menna': 'chiesa di san menna.JPG',
    'castello ducale': 'cortile interno sala di Diana.JPG',
    sfinge: 'sfinge.JPG',
    'toro apis': 'toro apis.JPG',
    'ponte rotto': 'ponte_Rotto.jpg',
    'ponte appiano': 'Ponte Appiano.jpg',
    musa: 'MUSA.jpg',
    'piazza roma': 'Piazza Roma.jpg',
    strega: 'struscio di streghe.jpg',
    finestra: 'finestra catalana.JPG',
    camminatori: 'Anteprima percorso Camminatori.jpg',
    magico: 'Pecorso magico.jpg',
  };

  for (const [keyword, photoFile] of Object.entries(mappings)) {
    if (nameLower.includes(keyword)) {
      const fullPath = path.join(PHOTOS_DIR, photoFile);
      if (fs.existsSync(fullPath)) {
        return `images/TOORA PHOTOS/COMPRESSED PHOTOS/${photoFile}`;
      }
    }
  }
  return null;
}

// ─── Main Processing ────────────────────────────────────────────────────

function processRoute(routeDef) {
  console.log(`Processing: ${routeDef.title}`);

  if (!fs.existsSync(routeDef.kmlFile)) {
    console.error(`  KML file not found: ${routeDef.kmlFile}`);
    return null;
  }

  const kmlContent = fs.readFileSync(routeDef.kmlFile, 'utf-8');
  const placemarks = extractPlacemarks(kmlContent);

  // Separate points (hotspots) from lines (route segments)
  const points = placemarks.filter((p) => p.type === 'Point');
  const lines = placemarks.filter((p) => p.type === 'LineString');
  const polygons = placemarks.filter((p) => p.type === 'Polygon');

  console.log(
    `  Found: ${points.length} points, ${lines.length} lines, ${polygons.length} polygons`
  );

  // ─── Build route polyline ─────────────────────────────────
  let routeCoords = [];

  // Count total line coordinates
  let totalLineCoords = 0;
  for (const line of lines) {
    totalLineCoords += line.coordinates.length;
  }

  // Count total polygon coordinates
  let totalPolyCoords = 0;
  for (const poly of polygons) {
    totalPolyCoords += poly.coordinates.length;
  }

  // Use whichever source has more coordinates (better route detail)
  if (lines.length > 0 && totalLineCoords >= totalPolyCoords) {
    // Concatenate all LineString segments in order
    for (const line of lines) {
      if (routeCoords.length > 0 && line.coordinates.length > 0) {
        const lastPoint = routeCoords[routeCoords.length - 1];
        const firstPoint = line.coordinates[0];
        const dist = haversineDistance(
          lastPoint[1],
          lastPoint[0],
          firstPoint[1],
          firstPoint[0]
        );
        if (dist > 5) {
          routeCoords.push(...line.coordinates);
        } else {
          routeCoords.push(...line.coordinates.slice(1));
        }
      } else {
        routeCoords.push(...line.coordinates);
      }
    }
  } else if (polygons.length > 0) {
    // Use polygon boundary as route path (for routes like 4 Imperatori)
    routeCoords = polygons[0].coordinates;
  } else if (lines.length > 0) {
    // Fallback: use lines even if short
    for (const line of lines) {
      routeCoords.push(...line.coordinates);
    }
  }

  // If we still have no route, create one by connecting the points in order
  if (routeCoords.length === 0 && points.length >= 2) {
    routeCoords = points.map((p) => p.coordinates);
  }

  // Remove altitude for GeoJSON (keep only [lng, lat])
  const routeCoords2D = routeCoords.map(([lng, lat]) => [
    Math.round(lng * 1e7) / 1e7,
    Math.round(lat * 1e7) / 1e7,
  ]);

  // ─── Build GeoJSON ─────────────────────────────────────────
  const geojson = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { itineraryId: routeDef.id },
        geometry: {
          type: 'LineString',
          coordinates: routeCoords2D,
        },
      },
    ],
  };

  // ─── Build hotspot data ─────────────────────────────────────
  // Filter out "fine percorso" / endpoint markers for hotspot list
  const hotspotPoints = points.filter((p) => {
    const nameLower = p.name.toLowerCase();
    return (
      !nameLower.includes('fine percorso') &&
      !nameLower.includes('fine persorso')
    );
  });

  // Limit to 10 hotspots max per spec, first 5 are active
  const selectedHotspots = hotspotPoints.slice(0, 10);

  const hotspots = selectedHotspots.map((point, idx) => {
    const isActive = idx < 5;
    const photo = findMatchingPhoto(point.name);

    return {
      id: `hs_${routeDef.id.split('_')[1]}_${String(idx + 1).padStart(2, '0')}`,
      sequence: idx + 1,
      isActive,
      title: point.name.replace(/\s*\|\s*/g, ' — '),
      shortDescription: `Tappa ${idx + 1} del percorso ${routeDef.title}.`,
      latitude: Math.round(point.coordinates[1] * 1e7) / 1e7,
      longitude: Math.round(point.coordinates[0] * 1e7) / 1e7,
      geofenceRadiusM: 25,
      content: isActive
        ? {
            heroImage: photo || null,
            gallery: [],
            text: null,
            audioGuide: null,
            video: null,
          }
        : null,
    };
  });

  // ─── Calculate route stats ──────────────────────────────────
  const distanceKm =
    Math.round((routeTotalDistance(routeCoords) / 1000) * 10) / 10;
  const durationMin = estimateDuration(distanceKm, routeDef.terrain);

  // Compute elevation gain from altitude data
  let elevationGain = 0;
  for (let i = 1; i < routeCoords.length; i++) {
    const diff = (routeCoords[i][2] || 0) - (routeCoords[i - 1][2] || 0);
    if (diff > 0) elevationGain += diff;
  }

  // Starting point = first hotspot or first route coordinate
  const startCoord =
    hotspots.length > 0
      ? [hotspots[0].longitude, hotspots[0].latitude]
      : routeCoords2D[0] || [14.78, 41.13];

  const itinerary = {
    id: routeDef.id,
    slug: routeDef.slug,
    title: routeDef.title,
    description: routeDef.description,
    coverImage: findMatchingPhoto(routeDef.title) || null,
    difficulty: routeDef.difficulty,
    distanceKm,
    estimatedDurationMinutes: durationMin,
    elevationGainM: Math.round(elevationGain),
    terrain: routeDef.terrain,
    tags: routeDef.tags,
    routeGeoJSON: `routes/${routeDef.slug}.json`,
    startingPoint: {
      latitude: startCoord[1],
      longitude: startCoord[0],
      geofenceRadiusM: 30,
      name: hotspots[0]?.title || routeDef.title,
      navigationAddress: `${hotspots[0]?.title || routeDef.title}, Benevento BN`,
    },
    hotspots,
  };

  console.log(
    `  Route: ${routeCoords2D.length} coords, ${distanceKm} km, ${hotspots.length} hotspots`
  );

  return { geojson, itinerary };
}

// ─── Run ─────────────────────────────────────────────────────────────────

const outputRoutesDir = path.join(__dirname, '..', 'src', 'data', 'routes');
const outputDataDir = path.join(__dirname, '..', 'src', 'data');

fs.mkdirSync(outputRoutesDir, { recursive: true });
fs.mkdirSync(outputDataDir, { recursive: true });

const itineraries = [];
let successCount = 0;

for (const routeDef of routeDefinitions) {
  const result = processRoute(routeDef);
  if (result) {
    // Write GeoJSON
    const geojsonPath = path.join(
      outputRoutesDir,
      `${routeDef.slug}.json`
    );
    fs.writeFileSync(geojsonPath, JSON.stringify(result.geojson, null, 2));

    itineraries.push(result.itinerary);
    successCount++;
  }
}

// Write master itineraries.json
const masterData = {
  version: '1.0.0',
  itineraries,
};

const masterPath = path.join(outputDataDir, 'itineraries.json');
fs.writeFileSync(masterPath, JSON.stringify(masterData, null, 2));

console.log(`\nDone! Processed ${successCount}/${routeDefinitions.length} routes.`);
console.log(`GeoJSON files: ${outputRoutesDir}`);
console.log(`Master data: ${masterPath}`);
