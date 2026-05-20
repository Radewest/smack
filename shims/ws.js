// Shim for the `ws` package in React Native.
// @supabase/realtime-js uses ws for WebSocket — in React Native we have
// a native WebSocket global, so we just re-export it here.
const W = global.WebSocket;
module.exports = W;
module.exports.WebSocket = W;
module.exports.default = W;
