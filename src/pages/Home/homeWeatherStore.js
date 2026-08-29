// Caché en memoria del pronóstico por horas de Inicio -- Home() es una
// función de render pura (plantilla en base al estado ya cargado), la
// petición de red en sí se dispara una vez desde main.js (ver boot()) y
// repinta con rerender() cuando resuelve, mismo patrón que el fallback de
// hydrate() por timeout.
import { getHourlyForecast } from "../../services/hourlyForecast.js";
import { getWorkouts } from "../../data/workoutStore.js";
import { rerender } from "../../core/router.js";

let state = { status: "idle", hours: [], current: null, label: null };

// DIAGNÓSTICO TEMPORAL (2026-08-29): el widget no aparece en un dispositivo
// real con entrenos-con-ubicación confirmados, pero el mismo flujo
// funciona en pruebas locales con red real -- para ver en qué paso se
// para de verdad en ESE móvil (sin depender de conectar un Mac por
// Safari remoto), se guarda aquí la traza de onLog() y Profile.js la
// muestra en pantalla. Quitar este log y su bloque en Profile.js en
// cuanto se confirme la causa real -- no dejarlo como diagnóstico
// permanente.
let debugLog = [];

export function getHourlyWeatherState() {

    return state;

}

export function getHourlyWeatherDebugLog() {

    return debugLog;

}

// Idempotente: una sola petición por sesión. Si falla o no hay ubicación
// disponible, status pasa a "unavailable" -- Home() oculta el widget en
// vez de mostrar datos inventados (ver HourlyWeather.js).
export function loadHourlyWeather(onLog = () => {}) {

    if (state.status !== "idle") return;

    state = { status: "loading", hours: [], current: null, label: null };
    debugLog = [`tiempo: getWorkouts() devuelve ${getWorkouts().length} entreno(s)`];

    const combinedLog = (line) => {
        debugLog.push(line);
        onLog(line);
    };

    getHourlyForecast(getWorkouts(), combinedLog).then(result => {

        state = result
            ? { status: "ready", hours: result.hours, current: result.current, label: result.label }
            : { status: "unavailable", hours: [], current: null, label: null };

        debugLog.push(`tiempo: estado final = ${state.status}`);

        // resetScroll: esta petición resuelve en async, en cualquier momento
        // mientras el usuario ya está mirando Inicio -- si añade/quita el
        // widget de tiempo con la pantalla desplazada hacia abajo, el
        // contenido de arriba podía reaparecer superpuesto a la barra de
        // estado/isla dinámica (bug real 2026-08-29, ver router.js).
        rerender({ resetScroll: true });

    }).catch(err => {

        // getHourlyForecast() nunca debería rechazar (tiene su propio
        // try/catch interno que siempre devuelve null) -- si esto se
        // dispara, el fallo real está en un sitio inesperado, no en la
        // resolución de ubicación/pronóstico.
        debugLog.push(`tiempo: promesa rechazada de forma inesperada -- ${err?.message ?? err}`);
        state = { status: "unavailable", hours: [], current: null, label: null };
        rerender({ resetScroll: true });

    });

}
