import { defineConfig } from "vite";
import { execSync } from "node:child_process";

// Mismo criterio que scripts/version-sw.js (que versiona el CACHE_NAME del
// service worker) -- aquí se inyecta en el propio bundle de la app para
// poder mostrarlo en Perfil y así confirmar de un vistazo si el
// dispositivo tiene la build nueva, sin depender de adivinar si cerrar y
// reabrir bastó para que el service worker se actualizara.
let buildId;
try {
  buildId = execSync("git rev-parse --short HEAD").toString().trim();
} catch {
  buildId = "dev";
}

export default defineConfig({
  base: "/Corredor-Solido/",
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
});
