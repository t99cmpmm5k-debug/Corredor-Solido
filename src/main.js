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

import { applyAutomaticTheme } from "./theme/timeTheme.js";
import { start, rerender } from "./core/router.js";

import { hydrate } from "./data/workoutStore.js";
import { hydrateBackupMeta } from "./utils/backup.js";

// TEMPORAL - QUITAR ANTES DE PRODUCCIÓN
import { mountThemeSwitcher } from "./dev/ThemeSwitcher.js";

// Si IndexedDB no responde en este plazo (cuota bloqueada, otra pestaña
// reteniendo la conexión, etc.) arrancamos igualmente sin esperar más.
const HYDRATE_TIMEOUT_MS = 1500;

function boot() {

    let readyBeforeTimeout = false;

    const ready = Promise.all([hydrate(), hydrateBackupMeta()])
        .then(() => { readyBeforeTimeout = true; });

    const timedOut = new Promise(resolve => setTimeout(resolve, HYDRATE_TIMEOUT_MS));

    return Promise.race([ready, timedOut]).then(() => {

        applyAutomaticTheme();

        start(Home);

        // TEMPORAL - QUITAR ANTES DE PRODUCCIÓN
        mountThemeSwitcher();

        // Si ganó el timeout, la hidratación sigue en marcha de fondo:
        // en cuanto termine, repintamos con los datos ya cargados.
        if (!readyBeforeTimeout) ready.then(rerender);

    });

}

boot();

