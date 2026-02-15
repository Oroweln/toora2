#!/usr/bin/env node
/**
 * Validation script for TOORA content bundle.
 * Checks that all data references are valid and complete.
 */

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'src', 'data');
const masterPath = path.join(dataDir, 'itineraries.json');

console.log('TOORA Content Validation\n');

let errors = 0;
let warnings = 0;

// 1. Check master data exists
if (!fs.existsSync(masterPath)) {
  console.error('ERROR: itineraries.json not found');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(masterPath, 'utf-8'));
console.log(`Version: ${data.version}`);
console.log(`Itineraries: ${data.itineraries.length}\n`);

for (const it of data.itineraries) {
  console.log(`--- ${it.title} (${it.id}) ---`);

  // 2. Check GeoJSON route file exists
  const geojsonPath = path.join(dataDir, it.routeGeoJSON);
  if (!fs.existsSync(geojsonPath)) {
    console.error(`  ERROR: Route GeoJSON not found: ${it.routeGeoJSON}`);
    errors++;
  } else {
    const geojson = JSON.parse(fs.readFileSync(geojsonPath, 'utf-8'));
    const coords = geojson.features?.[0]?.geometry?.coordinates;
    if (!coords || coords.length === 0) {
      console.error(`  ERROR: No coordinates in GeoJSON`);
      errors++;
    } else {
      console.log(`  Route: ${coords.length} coordinate pairs`);
    }
  }

  // 3. Check coordinates are in Campania bounding box
  const campaniaBBox = {
    minLat: 40.5,
    maxLat: 41.5,
    minLng: 13.5,
    maxLng: 15.5,
  };

  const sp = it.startingPoint;
  if (
    sp.latitude < campaniaBBox.minLat ||
    sp.latitude > campaniaBBox.maxLat ||
    sp.longitude < campaniaBBox.minLng ||
    sp.longitude > campaniaBBox.maxLng
  ) {
    console.error(`  ERROR: Starting point outside Campania: ${sp.latitude}, ${sp.longitude}`);
    errors++;
  }

  // 4. Check hotspots
  console.log(`  Hotspots: ${it.hotspots.length}`);
  const activeCount = it.hotspots.filter((h) => h.isActive).length;
  console.log(`  Active: ${activeCount}`);

  if (it.hotspots.length === 0) {
    console.error('  ERROR: No hotspots');
    errors++;
  }

  for (const hs of it.hotspots) {
    if (
      hs.latitude < campaniaBBox.minLat ||
      hs.latitude > campaniaBBox.maxLat ||
      hs.longitude < campaniaBBox.minLng ||
      hs.longitude > campaniaBBox.maxLng
    ) {
      console.error(
        `  ERROR: Hotspot ${hs.id} outside Campania: ${hs.latitude}, ${hs.longitude}`,
      );
      errors++;
    }
  }

  // 5. Stats
  console.log(`  Distance: ${it.distanceKm} km`);
  console.log(`  Duration: ${it.estimatedDurationMinutes} min`);
  console.log(`  Difficulty: ${it.difficulty}`);
  console.log('');
}

// Summary
console.log('========================================');
console.log(`Errors: ${errors}`);
console.log(`Warnings: ${warnings}`);

if (errors > 0) {
  console.log('\nValidation FAILED');
  process.exit(1);
} else {
  console.log('\nValidation PASSED');
}
