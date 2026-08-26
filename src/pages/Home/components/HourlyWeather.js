import "./HourlyWeather.css";

import { findBestRunningHour, remainingHours } from "../../../services/hourlyForecast.js";

// icon (ver weatherIconForCode en services/hourlyForecast.js) -> icono
// Solar ya usado en el resto de la app (ver WorkoutIcon.js). "cloud" es el
// fallback de cualquier código sin categoría clara, así que también lo es
// aquí.
const ICON_BY_CATEGORY = {
    sun: "solar:sun-2-bold-duotone",
    moon: "solar:moon-stars-bold-duotone",
    cloud: "solar:cloud-bold-duotone",
    rain: "solar:cloud-rain-bold-duotone",
    snow: "solar:cloud-snowfall-bold-duotone",
    storm: "solar:cloud-bolt-bold-duotone"
};

function weatherIcon(category) {
    return ICON_BY_CATEGORY[category] || ICON_BY_CATEGORY.cloud;
}

// isNewDay marca la primera hora de "mañana" dentro de la franja de 24h
// (ver parseForecastHours() en services/hourlyForecast.js) -- esa hora
// lleva la etiqueta "Mañana" además del número, y el slot un separador
// sutil (línea + fondo) para que se entienda de un vistazo en qué día se
// está mirando aunque se haya deslizado mucho.
function HourlyWeatherSlot({ time, temp, icon, isNewDay }) {

    return `

        <div class="hourly-weather-hour ${isNewDay ? "is-new-day" : ""}">

            <span class="hourly-weather-time">

                ${isNewDay ? `<span class="hourly-weather-day-tag">Mañana</span>` : ""}
                ${time}

            </span>

            <iconify-icon icon="${weatherIcon(icon)}"></iconify-icon>

            <span class="hourly-weather-temp">${temp}°</span>

        </div>

    `;

}

// Línea fina de tendencia bajo la franja de horas -- puro refuerzo visual,
// sin ejes ni grid ni valores encima (esos ya están en cada hora de la
// franja). Con una sola hora útil no hay tendencia que dibujar.
function TemperatureTrend(hours) {

    if (hours.length < 2) return "";

    const temps = hours.map(h => h.temp);
    const min = Math.min(...temps);
    const max = Math.max(...temps);
    const range = max - min || 1;

    const points = temps
        .map((t, i) => {
            const x = (i / (temps.length - 1)) * 100;
            const y = 24 - ((t - min) / range) * 20 - 2;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");

    return `

        <svg class="hourly-weather-trend" viewBox="0 0 100 24" preserveAspectRatio="none">
            <polyline points="${points}" />
        </svg>

    `;

}

// "HH:MM" -> "HH:MM" de la hora siguiente en punto -- cada entrada del
// pronóstico es un tramo horario completo (ver parseForecastHours()), así
// que la franja recomendada es ese tramo entero, no un instante suelto.
function nextHourLabel(time) {

    const [hh, mm] = time.split(":").map(Number);
    const next = (hh + 1) % 24;

    return `${String(next).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;

}

// Línea orientada a correr, no a meteorología genérica -- la hora de
// menor temperatura entre las que no llevan lluvia/tormenta/nieve, y que
// además todavía no ha empezado respecto al reloj real de ahora mismo
// (remainingHours() -- nunca se propone una franja ya pasada, aunque el
// pronóstico llevara un rato cacheado sin recargar, ver
// homeWeatherStore.js). La franja de horas de abajo NO pasa por este
// filtro a propósito, sigue mostrando también lo que ya pasó.
// viento/humedad se omiten sueltos si esa hora en concreto no los trae
// (nunca "viento null km/h") -- nunca inventados, vienen del mismo
// hourly de Open-Meteo que ya usa el resto del widget.
function BestRunningHour(hours, now) {

    const best = findBestRunningHour(remainingHours(hours, now));
    if (!best) return "";

    const details = [`${best.temp}°`];
    if (best.windKmh != null) details.push(`viento ${best.windKmh} km/h`);
    if (best.humidity != null) details.push(`humedad ${best.humidity}%`);

    return `

        <div class="hourly-weather-best">

            <p class="hourly-weather-best-headline">

                <iconify-icon icon="solar:sort-by-time-bold-duotone"></iconify-icon>

                Mejor franja restante para correr: <strong>${best.time}-${nextHourLabel(best.time)}</strong>

            </p>

            <p class="hourly-weather-best-detail">${details.join(" · ")}</p>

        </div>

    `;

}

// current: { temp, icon } | null -- state.status ya garantiza que si esto
// se llama, hours no está vacío (ver Home.js), pero current puede faltar
// en respuestas raras de la API sin el bloque "current". `now` solo se
// pasa distinto de new Date() en tests (ver remainingHours() en
// hourlyForecast.js, usada dentro de BestRunningHour()).
export function HourlyWeather({ hours, current, label }, now = new Date()) {

    if (!hours || hours.length === 0) return "";

    return `

        <section class="hourly-weather">

            <div class="hourly-weather-header">

                <p class="hourly-weather-label">Hoy${label ? ` · ${label}` : ""}</p>

                ${current ? `

                    <p class="hourly-weather-current">

                        <iconify-icon icon="${weatherIcon(current.icon)}"></iconify-icon>
                        <span>${current.temp}°</span>

                    </p>

                ` : ""}

            </div>

            ${BestRunningHour(hours, now)}

            <div class="hourly-weather-scroll">

                ${hours.map(HourlyWeatherSlot).join("")}

            </div>

            ${TemperatureTrend(hours)}

        </section>

    `;

}
