// Caché del tiempo en vivo (ver services/currentWeather.js y, para de
// dónde sale la ubicación, services/weatherLocation.js) para el badge de
// MasterCard -- a diferencia de
// homeWeatherStore.js (caché solo en memoria, una petición por sesión),
// esto persiste en localStorage con marca de tiempo: pedir el permiso de
// ubicación y llamar a Open-Meteo cada vez que se abre la app (varias
// veces al día, cada una una sesión de JS nueva) sería tanto un gasto de
// batería/red innecesario como una fuente de prompts de permiso
// repetidos. CACHE_TTL_MS decide cuánto se confía en un resultado ya
// guardado antes de volver a pedirlo de verdad.
import { getLiveWeather } from "../../services/currentWeather.js";
import { rerender } from "../../core/router.js";
import { loadMyProfile, getMyProfile } from "../Profile/profileStore.js";
import { forgetDevicePosition } from "../../services/weatherLocation.js";

const CACHE_KEY = "corredor-solido-current-weather";
const CACHE_TTL_MS = 20 * 60 * 1000; // 20 min -- punto medio del rango pedido (15-30 min)

// source: "gps" | "localidad" | null -- de dónde salió el dato (Ajustes lo
// muestra junto a "Usar mi ubicación actual").
const EMPTY = { temp: null, icon: null, source: null };

let state = { status: "idle", ...EMPTY };

function readCache() {

    try {

        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed.savedAt !== "number" || parsed.temp == null) return null;

        if (Date.now() - parsed.savedAt > CACHE_TTL_MS) return null;

        return { temp: parsed.temp, icon: parsed.icon, source: parsed.source ?? null };

    } catch {

        // JSON corrupto, localStorage no disponible (privado/cuota) -- se
        // trata igual que "sin caché", nunca rompe el arranque por esto.
        return null;

    }

}

function writeCache(result) {

    try {
        if (result == null) localStorage.removeItem(CACHE_KEY);
        else localStorage.setItem(CACHE_KEY, JSON.stringify({ ...result, savedAt: Date.now() }));
    } catch {
        // Privado/cuota agotada -- el dato ya se muestra igual esta
        // sesión (viene de `state`, no de la caché); solo se pierde la
        // persistencia entre aperturas, no es motivo para romper nada.
    }

}

export function getCurrentWeatherState() {

    return state;

}

function applyResult(result, resetScroll) {

    state = result
        ? { status: "ready", temp: result.temp, icon: result.icon, source: result.source ?? null }
        : { status: "unavailable", ...EMPTY };

    if (result) writeCache(result);

    // resetScroll: esto resuelve en async, en cualquier momento mientras el
    // usuario ya está mirando Inicio; si el badge aparece con la pantalla
    // desplazada, el contenido de arriba podría reaparecer superpuesto a la
    // barra de estado/isla dinámica (bug real ya corregido para el widget
    // "Hoy", mismo riesgo aquí). Desde Perfil/Ajustes (acción manual o
    // localidad cambiada) no se resetea: el usuario está en otra pantalla.
    rerender({ resetScroll });

}

function fetchAndApply(options, onLog, resetScroll) {

    state = { status: "loading", ...EMPTY };

    return getLiveWeather(options, onLog).then(result => applyResult(result, resetScroll)).catch(err => {

        // getLiveWeather() nunca debería rechazar (tiene su propio
        // try/catch) -- red de seguridad para no dejar "loading" colgado.
        console.warn("Fallo inesperado cargando el tiempo en vivo.", err);
        applyResult(null, resetScroll);

    }).then(() => state.status === "ready");

}

// Idempotente (mismo criterio que loadHourlyWeather en homeWeatherStore.js)
// -- una sola petición real por sesión, y ni eso si la caché de
// localStorage sigue vigente. Espera al perfil (una petición, ya
// idempotente) para saber la localidad: con localidad, el arranque nunca
// pide el GPS (ver criterio en weatherLocation.js). Nunca deja status en
// "loading" para siempre ni inventa un dato.
export function loadCurrentWeather(onLog = () => {}, { resetScroll = true } = {}) {

    if (state.status !== "idle") return;

    const cached = readCache();

    if (cached) {

        state = { status: "ready", ...cached };

        // rerender aunque la caché resuelva "al instante" -- esto se llama
        // DESPUÉS del primer render de Inicio (ver boot() en main.js), así
        // que sin esto el badge no se pintaría hasta otro repintado.
        rerender({ resetScroll });
        return;

    }

    state = { status: "loading", ...EMPTY };

    Promise.resolve()
        .then(() => loadMyProfile())
        .catch(() => {})
        .then(() => fetchAndApply({ localidad: getMyProfile().localidad }, onLog, resetScroll));

}

// "Usar mi ubicación actual" (Ajustes) -- pide el GPS ahora, aunque haya
// localidad o una negativa recordada. Resuelve true si hay dato nuevo.
export function useDeviceLocationForWeather(onLog = () => {}) {

    return fetchAndApply({ manual: true }, onLog, false);

}

// La localidad de Perfil acaba de cambiar -- el dato guardado (y la
// posición GPS guardada) pueden ser de antes, se descartan y se vuelve a
// resolver con la localidad nueva.
export function refreshCurrentWeather(onLog = () => {}) {

    writeCache(null);
    forgetDevicePosition();
    state = { status: "idle", ...EMPTY };
    loadCurrentWeather(onLog, { resetScroll: false });

}
