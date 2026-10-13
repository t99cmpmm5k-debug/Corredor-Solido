// Caché en memoria del pronóstico por horas de Inicio -- Home() es una
// función de render pura (plantilla en base al estado ya cargado), la
// petición de red en sí se dispara una vez desde main.js (ver boot()) y
// repinta con rerender() cuando resuelve, mismo patrón que el fallback de
// hydrate() por timeout.
import { getHourlyForecast } from "../../services/hourlyForecast.js";
import { getWorkouts } from "../../data/workoutStore.js";
import { rerender } from "../../core/router.js";
import { loadMyProfile, getMyProfile } from "../Profile/profileStore.js";

let state = { status: "idle", hours: [], current: null, label: null };

export function getHourlyWeatherState() {

    return state;

}

// Idempotente: una sola petición por sesión. Si falla o no hay ubicación
// disponible, status pasa a "unavailable" -- Home() oculta el widget en
// vez de mostrar datos inventados (ver HourlyWeather.js). Espera al perfil
// (una petición, ya idempotente) para saber la localidad, igual que la
// insignia de temperatura (loadCurrentWeather en currentWeatherStore.js).
export function loadHourlyWeather(onLog = () => {}, { resetScroll = true } = {}) {

    if (state.status !== "idle") return;

    state = { status: "loading", hours: [], current: null, label: null };

    Promise.resolve()
        .then(() => loadMyProfile())
        .catch(() => {})
        .then(() => getHourlyForecast(getWorkouts(), onLog, { localidad: getMyProfile().localidad }))
        .then(result => {

        state = result
            ? { status: "ready", hours: result.hours, current: result.current, label: result.label }
            : { status: "unavailable", hours: [], current: null, label: null };

        // resetScroll: esta petición resuelve en async, en cualquier momento
        // mientras el usuario ya está mirando Inicio -- si añade/quita el
        // widget de tiempo con la pantalla desplazada hacia abajo, el
        // contenido de arriba podía reaparecer superpuesto a la barra de
        // estado/isla dinámica (bug real 2026-08-29, ver router.js).
        rerender({ resetScroll });

    }).catch(err => {

        // getHourlyForecast() nunca debería rechazar (tiene su propio
        // try/catch interno que siempre devuelve null) -- red de
        // seguridad por si algo falla en un sitio inesperado, para que
        // status no se quede colgado en "loading" para siempre.
        console.warn("Fallo inesperado cargando el pronóstico.", err);
        state = { status: "unavailable", hours: [], current: null, label: null };
        rerender({ resetScroll });

    });

}

// La ubicación cambió ("Usar mi ubicación actual" o localidad nueva en
// Perfil, ver currentWeatherStore.js): se vuelve a resolver la tarjeta con
// la ubicación nueva. Desde Ajustes, sin resetear el scroll.
export function refreshHourlyWeather(onLog = () => {}) {

    state = { status: "idle", hours: [], current: null, label: null };
    loadHourlyWeather(onLog, { resetScroll: false });

}
