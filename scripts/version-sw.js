// public/sw.js lleva un placeholder (__BUILD_ID__) en vez de un
// CACHE_NAME fijo -- con uno fijo, el activate() del service worker
// nunca tiene una key vieja que borrar (misma key de siempre) y el
// navegador puede quedarse sirviendo JS/CSS de un despliegue anterior
// indefinidamente. Este script corre después de "vite build" (ver
// package.json), cuando dist/ ya está completo del todo -- si se
// hiciera desde un hook de plugin de Vite (closeBundle/writeBundle),
// el propio copiado de public/ a dist/ puede pisarlo después, según
// el orden interno de Vite.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

let buildId;

try {
  buildId = execSync("git rev-parse --short HEAD", { cwd: __dirname }).toString().trim();
} catch {
  buildId = String(Date.now());
}

const swPath = resolve(__dirname, "../dist/sw.js");
const sw = readFileSync(swPath, "utf8");

writeFileSync(swPath, sw.replaceAll("__BUILD_ID__", buildId));

console.log(`sw.js: CACHE_NAME versionado con ${buildId}`);
