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

import { Home } from "./pages/Home/Home.js";
import { Plan } from "./pages/Plan/Plan.js";
import { Login, VerificarCuenta, NuevaPassword } from "./pages/Auth/Auth.js";
import { isLoggedIn } from "./data/authStore.js";

import { applyAutomaticTheme, clearManualTheme } from "./theme/timeTheme.js";
import { start, rerender } from "./core/router.js";

import { hydrate } from "./data/workoutStore.js";
import { hydrate as hydrateGymSessions } from "./data/gymSessionStore.js";
import { hydrate as hydrateGymRoutine } from "./data/gymRoutineStore.js";
import { hydrate as hydrateCustomExercises } from "./data/customExerciseStore.js";
import { hydrate as hydrateReferenceRoutes } from "./data/referenceRouteStore.js";
import { hydrate as hydrateRouteSuggestionDismissals } from "./data/routeSuggestionStore.js";
import { hydrate as hydrateTombstones } from "./data/tombstoneStore.js";
import { hydrateBackupMeta } from "./utils/backup.js";
import { hydrateSyncMeta, initContinuousSync } from "./data/syncManager.js";
import { loadHourlyWeather } from "./pages/Home/homeWeatherStore.js";
import { loadCurrentWeather } from "./pages/Home/currentWeatherStore.js";
import { initUpdateNotifier } from "./pwa/updateNotifier.js";
import { initSeedRoutineCleanup } from "./components/SeedRoutineCleanup/SeedRoutineCleanup.js";

// TEMPORAL - QUITAR ANTES DE PRODUCCIÓN
import { mountThemeSwitcher } from "./dev/ThemeSwitcher.js";

// Si IndexedDB no responde en este plazo (cuota bloqueada, otra pestaña
// reteniendo la conexión, etc.) arrancamos igualmente sin esperar más.
const HYDRATE_TIMEOUT_MS = 1500;

function boot() {

    let readyBeforeTimeout = false;

    const ready = Promise.all([hydrate(), hydrateGymSessions(), hydrateGymRoutine(), hydrateCustomExercises(), hydrateReferenceRoutes(), hydrateRouteSuggestionDismissals(), hydrateTombstones(), hydrateBackupMeta(), hydrateSyncMeta()])
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

        // Login obligatorio (ver plan de conexión al backend) -- la
        // hidratación de IndexedDB de arriba ya ha corrido igual, sea cual
        // sea el resultado: los datos locales siguen siendo la fuente de
        // verdad y la app debe poder abrirse sin red, esto solo decide qué
        // pantalla se ve primero.
        //
        // Un enlace de email (verificación/recuperación) manda aquí ANTES
        // que el propio login -- alguien sin sesión tiene que poder
        // llegar a estas dos pantallas igual, y alguien que sí la tenga
        // (otro dispositivo ya logueado) no debe saltárselas solo por
        // tener sesión abierta. El token en sí se lee más abajo, en
        // initAuthEvents.js (initVerifyAccount()/handleNuevaPasswordSubmit()),
        // no aquí.
        const searchParams = new URLSearchParams(location.search);

        if (searchParams.has("verify_token")) {
            start(VerificarCuenta);
        } else if (searchParams.has("reset_token")) {
            start(NuevaPassword);
        } else {
            start(isLoggedIn() ? Home : Login);
        }

        // El pronóstico depende de getWorkouts() (ubicación del entreno más
        // reciente) -- se espera a que hydrate() termine de verdad, aunque
        // el arranque ya haya seguido por el timeout, para no resolver
        // "sin ubicación" solo por una carrera contra el reloj. No bloquea
        // el primer render de Inicio: start(Home) ya se hizo arriba.
        ready.then(() => loadHourlyWeather());

        // Tiempo en vivo por geolocalización real (badge de MasterCard,
        // Fase 1) -- a diferencia de loadHourlyWeather() de arriba, no
        // depende de ningún dato de IndexedDB (getWorkouts()), así que no
        // hace falta esperar a `ready`: se lanza ya mismo, justo después
        // del primer render.
        loadCurrentWeather();

        // Igual que loadHourlyWeather() arriba: espera a que hydrate()
        // termine de verdad antes del primer push -- lanzarlo antes leería
        // getSyncableData() con los stores todavía vacíos y subiría un
        // snapshot en blanco (inofensivo -- el push es upsert, nunca borra
        // -- pero inútil).
        ready.then(() => initContinuousSync());

        // Aviso único para limpiar las rutinas semilla heredadas (ver
        // legacyGymSeedCleanup.js) -- necesita las rutinas ya hidratadas, y
        // solo con sesión iniciada: en Login/verificación se quedaría encima
        // de una pantalla que no es la app. Sin sesión no se marca nada, así
        // que se propone en la primera apertura ya logueado.
        ready.then(() => {
            if (isLoggedIn()) initSeedRoutineCleanup(() => rerender());
        });

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

// Pide almacenamiento persistente al navegador — sin esto, iOS Safari
// puede vaciar IndexedDB de una PWA instalada bajo presión de espacio o
// tras cierto tiempo sin uso, sin avisar (causa sospechada de una pérdida
// de datos real reportada por un usuario de Amazfit/TCX). Es "best
// effort": no bloquea el arranque ni garantiza que el navegador lo
// conceda, pero reduce el riesgo — y no hay downside a pedirlo siempre.
if (navigator.storage?.persist) {
    navigator.storage.persist().catch(() => {});
}

if (import.meta.env.PROD) {
    window.addEventListener("load", initUpdateNotifier);
}

