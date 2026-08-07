import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";

import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";


import "iconify-icon";

import "./styles/app.css";
import "./styles/hero.css";

import { Home } from "./pages/Home/Home.js";
import { Plan } from "./pages/Plan/Plan.js";

import { applyAutomaticTheme, clearManualTheme } from "./theme/timeTheme.js";
import { start, rerender } from "./core/router.js";

import { hydrate } from "./data/workoutStore.js";
import { hydrate as hydrateGymSessions } from "./data/gymSessionStore.js";
import { hydrateBackupMeta } from "./utils/backup.js";

// TEMPORAL - QUITAR ANTES DE PRODUCCIÓN
import { mountThemeSwitcher } from "./dev/ThemeSwitcher.js";

// Si IndexedDB no responde en este plazo (cuota bloqueada, otra pestaña
// reteniendo la conexión, etc.) arrancamos igualmente sin esperar más.
const HYDRATE_TIMEOUT_MS = 1500;

function boot() {

    let readyBeforeTimeout = false;

    const ready = Promise.all([hydrate(), hydrateGymSessions(), hydrateBackupMeta()])
        .then(() => { readyBeforeTimeout = true; });

    const timedOut = new Promise(resolve => setTimeout(resolve, HYDRATE_TIMEOUT_MS));

    return Promise.race([ready, timedOut]).then(() => {

        // Mientras el ThemeSwitcher esté desactivado (ver más abajo), una
        // elección manual de una sesión anterior se queda grabada en
        // localStorage y bloquea el tema automático para siempre — se
        // limpia aquí. Quitar esta línea a la vez que se reactive
        // mountThemeSwitcher(), para que una elección manual sí sobreviva.
        clearManualTheme();

        applyAutomaticTheme();

        start(Home);

        // Desactivado a propósito mientras se usa la app en real esta semana
        // (probando el tema automático por hora) — con el selector delante
        // siempre se acababa tocando. No borrar mountThemeSwitcher ni su
        // import: descomentar esta línea para volver a activarlo.
        // mountThemeSwitcher();

        // Si ganó el timeout, la hidratación sigue en marcha de fondo:
        // en cuanto termine, repintamos con los datos ya cargados.
        if (!readyBeforeTimeout) ready.then(rerender);

    });

}

boot();

if (import.meta.env.PROD && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
    });
}

