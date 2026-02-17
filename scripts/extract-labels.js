#!/usr/bin/env node
/**
 * extract-labels.js
 *
 * Reads the campania.mbtiles vector tiles and extracts place names,
 * road names, and water names into a static GeoJSON file.
 * This bypasses the MapLibre React Native bridge which cannot render
 * symbol layers from vector tile sources.
 *
 * Usage: node scripts/extract-labels.js
 * Output: src/data/map-labels.json
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { VectorTile } = require('@mapbox/vector-tile');
const Pbf = require('pbf').default;
const pako = require('pako');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MBTILES_PATH = path.resolve(__dirname, '../assets/campania.mbtiles');
const OUTPUT_PATH = path.resolve(__dirname, '../src/data/map-labels.json');

// Padded bounding box covering all 8 routes
const BOUNDS = {
  minLng: 14.45,
  maxLng: 15.07,
  minLat: 41.00,
  maxLat: 41.31,
};

// Which zoom levels to extract from (higher zoom = more detail but more data)
// We extract places from lower zooms (bigger cities) and higher zooms (villages)
const EXTRACT_CONFIG = [
  // Place names: cities, towns, villages
  { layer: 'place', zooms: [6, 7, 8, 9, 10, 11, 12, 13, 14], labelType: 'place' },
  // Road / street names — only at higher zooms to avoid clutter
  { layer: 'transportation_name', zooms: [12, 13, 14], labelType: 'road' },
  // Water body names
  { layer: 'water_name', zooms: [9, 10, 11, 12, 13, 14], labelType: 'water' },
  // Points of interest
  { layer: 'poi', zooms: [13, 14], labelType: 'poi' },
  // Mountain peaks
  { layer: 'mountain_peak', zooms: [9, 10, 11, 12, 13, 14], labelType: 'peak' },
];

// ---------------------------------------------------------------------------
// Tile math
// ---------------------------------------------------------------------------

function lngToTileX(lng, zoom) {
  return Math.floor(((lng + 180) / 360) * (1 << zoom));
}

function latToTileY(lat, zoom) {
  const latRad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      (1 << zoom)
  );
}

// Convert tile-local coordinates (0-extent) to lng/lat
function tileToLng(x, extent, tileX, zoom) {
  const n = 1 << zoom;
  return ((tileX + x / extent) / n) * 360 - 180;
}

function tileToLat(y, extent, tileY, zoom) {
  const n = 1 << zoom;
  const latRad = Math.atan(
    Math.sinh(Math.PI * (1 - (2 * (tileY + y / extent)) / n))
  );
  return (latRad * 180) / Math.PI;
}

// ---------------------------------------------------------------------------
// Main extraction
// ---------------------------------------------------------------------------

function main() {
  if (!fs.existsSync(MBTILES_PATH)) {
    console.error('MBTiles file not found:', MBTILES_PATH);
    process.exit(1);
  }

  let db;
  try {
    db = Database(MBTILES_PATH, { readonly: true });
  } catch (e) {
    console.error(
      'Could not open MBTiles with better-sqlite3.',
      'Install it: npm install --save-dev better-sqlite3'
    );
    console.error(e.message);
    process.exit(1);
  }

  // Check if we have the standard tiles table or tiles_shallow + tiles_data
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all()
    .map((r) => r.name);

  const hasTilesData = tables.includes('tiles_data') && tables.includes('tiles_shallow');

  // Build the query — handle both standard and deduplicated schemas
  let getTile;
  if (hasTilesData) {
    // Deduplicated schema: tiles_shallow has (zoom_level, tile_column, tile_row, tile_data_id)
    // tiles_data has (tile_data_id, tile_data)
    getTile = db.prepare(`
      SELECT td.tile_data
      FROM tiles_shallow ts
      JOIN tiles_data td ON ts.tile_data_id = td.tile_data_id
      WHERE ts.zoom_level = ? AND ts.tile_column = ? AND ts.tile_row = ?
    `);
  } else {
    getTile = db.prepare(
      'SELECT tile_data FROM tiles WHERE zoom_level = ? AND tile_column = ? AND tile_row = ?'
    );
  }

  // Deduplicate features by name+type to avoid repetition
  const seen = new Set();
  const features = [];

  let tilesRead = 0;
  let featuresExtracted = 0;

  for (const config of EXTRACT_CONFIG) {
    for (const zoom of config.zooms) {
      const minTileX = lngToTileX(BOUNDS.minLng, zoom);
      const maxTileX = lngToTileX(BOUNDS.maxLng, zoom);
      const minTileY = latToTileY(BOUNDS.maxLat, zoom); // Note: Y is flipped
      const maxTileY = latToTileY(BOUNDS.minLat, zoom);

      for (let x = minTileX; x <= maxTileX; x++) {
        for (let y = minTileY; y <= maxTileY; y++) {
          // MBTiles uses TMS (flipped Y)
          const tmsY = (1 << zoom) - 1 - y;
          const row = getTile.get(zoom, x, tmsY);
          if (!row) continue;
          tilesRead++;

          let tileData = row.tile_data;
          // Decompress gzip if needed
          if (tileData[0] === 0x1f && tileData[1] === 0x8b) {
            tileData = pako.ungzip(tileData);
          }

          let tile;
          try {
            tile = new VectorTile(new Pbf(tileData));
          } catch {
            continue;
          }

          const vtLayer = tile.layers[config.layer];
          if (!vtLayer) continue;

          for (let i = 0; i < vtLayer.length; i++) {
            const feature = vtLayer.feature(i);
            const props = feature.properties;
            const name = props.name || props['name:it'] || props.name_int;
            if (!name) continue;

            // Dedupe key: name + layer type + rounded coords
            const geom = feature.loadGeometry();
            if (!geom || !geom[0] || !geom[0][0]) continue;

            const pt = geom[0][0];
            const lng = tileToLng(pt.x, feature.extent, x, zoom);
            const lat = tileToLat(pt.y, feature.extent, y, zoom);

            // Skip if outside our bounds
            if (
              lng < BOUNDS.minLng ||
              lng > BOUNDS.maxLng ||
              lat < BOUNDS.minLat ||
              lat > BOUNDS.maxLat
            )
              continue;

            // Round coords for dedup (avoid near-duplicate labels)
            const dedupeKey = `${config.labelType}:${name}:${lng.toFixed(3)}:${lat.toFixed(3)}`;
            if (seen.has(dedupeKey)) continue;
            seen.add(dedupeKey);

            const labelProps = {
              name,
              type: config.labelType,
            };

            // Add class info for styling
            if (props.class) labelProps.class = props.class;
            if (props.rank) labelProps.rank = props.rank;
            if (props.subclass) labelProps.subclass = props.subclass;
            if (props.ele) labelProps.ele = props.ele;

            features.push({
              type: 'Feature',
              properties: labelProps,
              geometry: {
                type: 'Point',
                coordinates: [
                  parseFloat(lng.toFixed(6)),
                  parseFloat(lat.toFixed(6)),
                ],
              },
            });
            featuresExtracted++;
          }
        }
      }
    }
    console.log(
      `  ${config.layer}: ${features.filter((f) => f.properties.type === config.labelType).length} labels`
    );
  }

  db.close();

  const geojson = {
    type: 'FeatureCollection',
    features,
  };

  // Ensure output directory exists
  const outDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(geojson));

  const sizeKB = (Buffer.byteLength(JSON.stringify(geojson)) / 1024).toFixed(0);
  console.log(`\nDone! ${featuresExtracted} labels extracted from ${tilesRead} tiles`);
  console.log(`Output: ${OUTPUT_PATH} (${sizeKB} KB)`);
}

main();
