const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// @supabase/realtime-js bundles `ws` which requires Node's `stream` module.
// React Native doesn't have it — map it to the browser-compatible polyfill.
config.resolver.extraNodeModules = {
  stream: require.resolve('readable-stream'),
};

module.exports = config;
