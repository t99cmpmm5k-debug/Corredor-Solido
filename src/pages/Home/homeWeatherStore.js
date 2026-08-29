// Caché en memoria del pronóstico por horas de Inicio -- Home() es una
// función de render pura (plantilla en base al estado ya cargado), la
// petición de red en sí se dispara una vez desde main.js (ver boot()) y
// repinta con rerender() cuando resuelve, mismo patrón que el fallback de
// hydrate() por timeout.
import { getHourlyForecast } from "../../services/hourlyForecast.js";
import { getWorkouts } from "../../data/workoutStore.js";
import { rerender } from "../../core/router.js";

let state = { status: "idle", hours: [], current: null, label: null };

export function getHourlyWeatherState() {

    return state;

}

// Idempotente: una sola petición por sesión. Si falla o no hay ubicación
// disponible, status pasa a "unavailable" -- Home() oculta el widget en
// vez de mostrar datos inventados (ver HourlyWeather.js).
export function loadHourlyWeather(onLog = () => {}) {

    if (state.status !== "idle") return;

    state = { status: "loading", hours: [], current: null, label: null };

    getHourlyForecast(getWorkouts(), onLog).then(result => {

        state = result
            ? { status: "ready", hours: result.hours, current: result.current, label: result.label }
            : { status: "unavailable", hours: [], current: null, label: null };

        // resetScroll: esta petición resuelve en async, en cualquier momento
        // mientras el usuario ya está mirando Inicio -- si añade/quita el
        // widget de tiempo con la pantalla desplazada hacia abajo, el
        // contenido de arriba podía reaparecer superpuesto a la barra de
        // estado/isla dinámica (bug real 2026-08-29, ver router.js).
        rerender({ resetScroll: true });

    });

}
