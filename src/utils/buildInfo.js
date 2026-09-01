// __BUILD_ID__ lo inyecta vite.config.js (define) con el hash corto del
// commit en build time -- mismo criterio que scripts/version-sw.js para el
// CACHE_NAME del service worker. En vitest (que no pasa por vite.config.js
// define) el global no existe, de ahí el typeof guard.
export const BUILD_ID = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "dev";
