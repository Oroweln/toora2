const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Register .mbtiles as a recognized asset extension so Metro bundles
// the offline tile database alongside other static assets.
config.resolver.assetExts.push('mbtiles');

module.exports = config;
