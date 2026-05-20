const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// @supabase/realtime-js has its own nested copy of `ws` (a Node.js WebSocket
// library) which pulls in Node built-ins (stream, zlib…) that don't exist
// in React Native. We intercept every require() for `ws` anywhere in the
// dependency tree and redirect it to a tiny shim that uses the native
// global WebSocket — which is what supabase realtime actually uses at runtime.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'ws') {
    return {
      filePath: path.resolve(__dirname, 'shims/ws.js'),
      type: 'sourceFile',
    };
  }
  // Fall through to default resolver
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
