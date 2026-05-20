const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// @supabase/realtime-js bundles a copy of `ws` (a Node.js WebSocket library).
// `ws` pulls in Node built-ins (stream, zlib, net, tls…) that don't exist in
// React Native. Fix: redirect every import of `ws` to a tiny shim that
// re-exports the native global WebSocket — which is what supabase actually
// uses at runtime on mobile anyway.
config.resolver.extraNodeModules = {
  ws: path.resolve(__dirname, 'shims/ws.js'),
};

module.exports = config;
