// Caché del tiempo en vivo (geolocalización real, ver services/
// currentWeather.js) para el badge de MasterCard -- a diferencia de
// homeWeatherStore.js (caché solo en memoria, una petición por sesión),
// esto persiste en localStorage con marca de tiempo: pedir el permiso de
// ubicación y llamar a Open-Meteo cada vez que se abre la app (varias
// veces al día, cada una una sesión de JS nueva) sería tanto un gasto de
// batería/red innecesario como una fuente de prompts de permiso
// repetidos. CACHE_TTL_MS decide cuánto se confía en un resultado ya
// guardado antes de volver a pedirlo de verdad.
import { getCurrentWeatherAtDeviceLocation } from "../../services/currentWeather.js";
import { rerender } from "../../core/router.js";

const CACHE_KEY = "corredor-solido-current-weather";
const CACHE_TTL_MS = 20 * 60 * 1000; // 20 min -- punto medio del rango pedido (15-30 min)

let state = { status: "idle", temp: null, icon: null };

function readCache() {

    try {

        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed.savedAt !== "number" || parsed.temp == null) return null;

        if (Date.now() - parsed.savedAt > CACHE_TTL_MS) return null;

        return { temp: parsed.temp, icon: parsed.icon };

    } catch {

        // JSON corrupto, localStorage no disponible (privado/cuota) -- se
        // trata igual que "sin caché", nunca rompe el arranque por esto.
        return null;

    }

}

function writeCache(result) {

    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ...result, savedAt: Date.now() }));
    } catch {
        // Privado/cuota agotada -- el dato ya se muestra igual esta
        // sesión (viene de `state`, no de la caché); solo se pierde la
        // persistencia entre aperturas, no es motivo para romper nada.
    }

}

export function getCurrentWeatherState() {

    return state;

}

// Idempotente (mismo criterio que loadHourlyWeather en homeWeatherStore.js)
// -- una sola petición real por sesión, y ni eso si la caché de
// localStorage sigue vigente. Nunca deja status en "loading" para
// siempre: cualquier fallo (permiso denegado, sin geolocalización, sin
// red, respuesta sin "current") resuelve a "unavailable", nunca a un dato
// inventado.
export function loadCurrentWeather(onLog = () => {}) {

    if (state.status !== "idle") return;

    const cached = readCache();

    if (cached) {

        state = { status: "ready", temp: cached.temp, icon: cached.icon };

        // rerender aunque la caché resuelva "al instante" -- esto se llama
        // DESPUÉS del primer render de Inicio (ver boot() en main.js,
        // mismo punto que loadHourlyWeather()), así que sin esto el badge
        // se quedaría sin pintar hasta que algo más disparase un repintado.
        rerender({ resetScroll: true });
        return;

    }

    state = { status: "loading", temp: null, icon: null };

    getCurrentWeatherAtDeviceLocation(onLog).then(result => {

        state = result
            ? { status: "ready", temp: result.temp, icon: result.icon }
            : { status: "unavailable", temp: null, icon: null };

        if (result) writeCache(result);

        // resetScroll: mismo motivo que loadHourlyWeather() -- esto
        // resuelve en async, en cualquier momento mientras el usuario ya
        // está mirando Inicio; si el badge aparece con la pantalla
        // desplazada, el contenido de arriba podría reaparecer superpuesto
        // a la barra de estado/isla dinámica (bug real ya corregido para
        // el otro widget, mismo riesgo aquí).
        rerender({ resetScroll: true });

    }).catch(err => {

        // getCurrentWeatherAtDeviceLocation() nunca debería rechazar
        // (tiene su propio try/catch interno) -- red de seguridad para
        // que status no se quede colgado en "loading" para siempre.
        console.warn("Fallo inesperado cargando el tiempo en vivo.", err);
        state = { status: "unavailable", temp: null, icon: null };
        rerender({ resetScroll: true });

    });

}
