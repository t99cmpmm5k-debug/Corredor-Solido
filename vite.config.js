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
  test: {
    // Bug real corregido: sin esto, "npm run test" (vitest, sin config
    // propia hasta ahora) descubre CUALQUIER *.test.js del repo entero,
    // incluido server/ -- un subproyecto totalmente aparte, con su propio
    // package.json/node_modules/versión de vitest (server usa una más
    // reciente). Ejecutar los tests de server/ dentro de ESTE proceso de
    // vitest (versión distinta, sin sus dependencias resueltas de la
    // misma forma) causaba cuelgues/timeouts intermitentes en tests de
    // server/ que en su propio "cd server && npm test" pasan bien. Los
    // tests de server/ siguen corriendo, solo que con su propio comando
    // (ver server/README.md), nunca mezclados con los del frontend.
    include: ["src/**/*.test.js"],
  },
});
