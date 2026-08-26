// Pronóstico por horas para el widget de Inicio -- misma API (Open-Meteo,
// sin clave) y misma resolución de ubicación (GPS del entreno o geocoding
// de su location de texto, restringido a España) que ya usa
// weatherEstimate.js para la temperatura automática de un entreno
// importado en Running. Aquí se usa el endpoint de PRONÓSTICO (forecast),
// no el de reanálisis histórico (archive): "qué tiempo va a hacer en las
// próximas horas", no "qué tiempo hizo aquel día".
//
// Nunca se inventa ni se aproxima un dato: cualquier fallo (sin ubicación,
// sin conexión, respuesta sin horas) devuelve null y el widget se oculta
// entero -- ver homeWeatherStore.js.

import { resolveWorkoutCoordinates } from "./weatherEstimate.js";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

// 24 horas fijas desde la hora actual -- de noche cubre toda la mañana
// siguiente, de día llega hasta la misma hora del día siguiente. Si
// Open-Meteo no llega a dar las 24 completas (borde del pronóstico
// disponible) parseForecastHours() recorta limpio con las que haya, nunca
// rellena con datos inventados.
export const HOURS_AHEAD = 24;

// El entreno con fecha+hora más reciente que traiga algo de ubicación
// (GPS o texto) -- "la ubicación del usuario" se aproxima aquí al lugar
// de su actividad más reciente, mismo dato que Running ya resuelve para
// la temperatura automática de un entreno concreto, aplicado al más
// reciente en vez de a uno fijo.
export function mostRecentLocatableWorkout(workouts) {

    const candidates = workouts.filter(w =>
        w.date && (w.location || (w.startLat != null && w.startLon != null))
    );

    if (!candidates.length) return null;

    return [...candidates].sort((a, b) =>
        `${b.date}T${b.time || "00:00"}`.localeCompare(`${a.date}T${a.time || "00:00"}`)
    )[0];

}

// Primer tramo de "Ciudad, Provincia" -- lo bastante corto para el
// "Hoy · [ubicación]" del widget sin repetir la provincia. El recorte de
// la letra suelta final (mismo patrón que stripTrailingLetterFragment()
// en garmin-engine/parser-summary.js) cubre los workouts YA importados
// antes de ese fix -- bug real "Hoy · Puerto Lumbreras A" (2026-08-26):
// el import guardó location con un fragmento de OCR sin limpiar, y sin
// esto aquí seguiría mostrándose mal hasta reimportar ese entreno.
function shortLocationLabel(location) {
    const firstSegment = location.split(",")[0].trim();
    return firstSegment.replace(/\s+[A-Za-z]{1,2}$/, "").trim() || null;
}

// { lat, lon, label } o null -- label es el nombre de sitio para mostrar
// en el widget ("Hoy · Ojós"), tomado siempre del texto que el propio
// workout ya trae (más legible que nada que devuelva el geocoding), no de
// una reversa de las coordenadas -- Open-Meteo no ofrece geocoding
// inverso, y no es la API a la que este widget debe recurrir para eso.
export async function resolveLocation(workouts, onLog = () => {}) {

    const workout = mostRecentLocatableWorkout(workouts);

    if (!workout) {
        onLog("tiempo: ningún entreno con ubicación todavía -- no se pide pronóstico");
        return null;
    }

    const coords = await resolveWorkoutCoordinates(workout, onLog);
    if (!coords) return null;

    return { ...coords, label: workout.location ? shortLocationLabel(workout.location) : null };

}

// Códigos WMO que devuelve Open-Meteo (weathercode) -- agrupados en las
// categorías que pide el widget (sol/nube/lluvia/luna) más nieve/tormenta,
// que el endpoint da igual de gratis. Cualquier código no listado (o
// null) cae a "cloud", nunca a un icono más específico sin certeza.
// isDay (campo "is_day" de Open-Meteo, 1/0) decide sol vs. luna en los
// códigos de cielo despejado/poco nuboso -- viene de la propia API, no es
// un cálculo de amanecer/atardecer hecho a mano aquí.
const CLEAR_CODES = new Set([0, 1]);
const CLOUD_CODES = new Set([2, 3, 45, 48]);
const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82]);
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);
const STORM_CODES = new Set([95, 96, 99]);

export function weatherIconForCode(code, isDay = true) {

    if (CLEAR_CODES.has(code)) return isDay ? "sun" : "moon";
    if (RAIN_CODES.has(code)) return "rain";
    if (SNOW_CODES.has(code)) return "snow";
    if (STORM_CODES.has(code)) return "storm";
    if (CLOUD_CODES.has(code)) return "cloud";

    return "cloud";

}

// `now` es inyectable para poder testear el recorte de horas de forma
// determinista, sin depender del reloj real de quien ejecute los tests.
//
// isNewDay marca la primera hora de cada franja cuya fecha de calendario
// cambia respecto a la hora anterior -- se calcula DESPUÉS de descartar
// las horas sin temperatura (nunca antes), para que un hueco de datos
// justo en la medianoche no le quite la marca a la siguiente hora que sí
// sobrevive. Siempre false en la primera hora devuelta: no hay "anterior"
// con la que comparar.
export function parseForecastHours(data, now = new Date()) {

    const times = data?.hourly?.time || [];
    const temps = data?.hourly?.temperature_2m || [];
    const codes = data?.hourly?.weathercode || [];
    const isDayFlags = data?.hourly?.is_day || [];
    const winds = data?.hourly?.wind_speed_10m || [];
    const humidities = data?.hourly?.relative_humidity_2m || [];

    if (!times.length) return [];

    const pad = n => String(n).padStart(2, "0");
    const nowKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:00`;

    let startIndex = times.findIndex(t => t >= nowKey);
    if (startIndex === -1) startIndex = 0;

    const withData = times
        .slice(startIndex, startIndex + HOURS_AHEAD)
        .map((t, i) => ({ t, idx: startIndex + i }))
        .filter(({ idx }) => temps[idx] != null);

    let previousDate = null;

    return withData.map(({ t, idx }) => {

        const date = t.slice(0, 10);
        const isNewDay = previousDate !== null && date !== previousDate;
        previousDate = date;

        return {
            time: t.slice(11, 16),
            temp: Math.round(temps[idx]),
            icon: weatherIconForCode(codes[idx], isDayFlags[idx] !== 0),
            isNewDay,
            // null (no "0 inventado") si el propio Open-Meteo no trae el
            // dato para esa hora -- mismo criterio que temp/icon de arriba.
            windKmh: winds[idx] != null ? Math.round(winds[idx]) : null,
            humidity: humidities[idx] != null ? Math.round(humidities[idx]) : null
        };

    });

}

// Horas de `hours` (ver parseForecastHours) que, comparadas con el reloj
// real EN EL MOMENTO DE PINTAR, no han empezado todavía -- filtro
// aparte del recorte que ya hace parseForecastHours() porque ese se
// aplica solo al pedir el pronóstico, y loadHourlyWeather() lo cachea en
// memoria (una sola petición por sesión, ver homeWeatherStore.js): si el
// usuario deja la pestaña abierta un rato, las primeras horas de ese
// array ya cacheado pueden haber pasado de verdad sin que nadie vuelva a
// pedir el pronóstico. Se usa solo antes de findBestRunningHour() -- la
// franja de 24h de abajo se deja tal cual, mostrando también lo que ya
// pasó (pedido explícito).
//
// Cada entrada solo trae "HH:MM" (sin fecha) -- se reconstruye el
// instante de calendario más cercano a `now` (hoy o mañana, nunca más
// lejos: la ventana nunca cubre más de dos días de calendario) en vez de
// comparar el texto tal cual, que fallaría al cruzar medianoche. Se
// compara contra la HORA de `now` (sin minutos): la hora en curso cuenta
// como "todavía por delante", igual que ya hace parseForecastHours() al
// pedir el pronóstico.
export function remainingHours(hours, now = new Date()) {

    const nowFloor = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());

    return hours.filter(h => {

        const [hh, mm] = h.time.split(":").map(Number);
        const candidate = new Date(nowFloor.getFullYear(), nowFloor.getMonth(), nowFloor.getDate(), hh, mm);

        if (candidate.getTime() < nowFloor.getTime() - 12 * 60 * 60 * 1000) {
            candidate.setDate(candidate.getDate() + 1);
        }

        return candidate.getTime() >= nowFloor.getTime();

    });

}

// Códigos de icono con precipitación real -- una hora con cualquiera de
// estos no es "favorable para correr" aunque tenga la temperatura más
// baja de la franja, así que se descarta primero. Si TODAS las horas
// llevan precipitación, no hay ninguna hora "seca" que preferir y se
// cae a la de menor temperatura sin más (ver findBestRunningHour).
const PRECIPITATION_ICONS = new Set(["rain", "storm", "snow"]);

// "Cuánto de agradable es correr en esta hora", no solo su temperatura
// aislada -- nublado resta algo (menos sol directo, se corre más
// fresco de lo que dice el termómetro) y algo de brisa también ayuda a
// disipar calor, con un tope para que un vendaval no gane puntos de más.
// Cuanto más bajo, mejor. Nunca decide en solitario si una hora entra
// en el cálculo (eso ya lo hace el filtro de precipitación de arriba),
// solo desempata entre las que sí compiten.
function comfortScore(hour) {

    const cloudBonus = hour.icon === "cloud" ? 1.5 : 0;
    const windBonus = hour.windKmh != null ? Math.min(hour.windKmh, 20) * 0.1 : 0;

    return hour.temp - cloudBonus - windBonus;

}

// La hora "mejor para correr" dentro de las horas ya mostradas -- la de
// mejor comfortScore (temperatura ajustada por nubosidad/viento, nunca
// solo la temperatura más baja aislada) entre las que no llevan lluvia/
// tormenta/nieve; si todas llevan precipitación, la de menor
// comfortScore entre todas. Nunca inventa el criterio si no hay horas:
// devuelve null y HourlyWeather.js omite la línea entera en vez de
// mostrar un dato fabricado.
export function findBestRunningHour(hours) {

    if (!hours?.length) return null;

    const dry = hours.filter(h => !PRECIPITATION_ICONS.has(h.icon));
    const pool = dry.length ? dry : hours;

    return pool.reduce((best, h) => (comfortScore(h) < comfortScore(best) ? h : best), pool[0]);

}

// Recorta `hours` (ya filtradas por remainingHours, en orden
// cronológico desde ahora) a las que siguen siendo HOY -- nunca cruza
// la medianoche. isNewDay ya marca, dentro de esa misma secuencia, la
// primera hora que pertenece a mañana (ver parseForecastHours), así que
// cortar ahí basta: no hace falta reconstruir fechas absolutas. Bug real
// que esto corrige (2026-08-26): a las 13:49 la franja "mejor para
// correr" recomendaba "00:00-01:00" -- técnicamente una hora futura
// dentro de las 24h cacheadas, pero sin sentido práctico como
// recomendación de HOY. Se usa solo antes de findBestRunningHour(), la
// franja de 24h de abajo sigue mostrando también la madrugada de mañana
// a propósito.
export function todayRemainingHours(hours) {

    const boundaryIndex = hours.findIndex(h => h.isNewDay);
    return boundaryIndex === -1 ? hours : hours.slice(0, boundaryIndex);

}

// Umbral de "franja claramente favorable para correr" -- por encima de
// esta temperatura, la hora menos mala del día ya no es una
// recomendación de verdad, así que HourlyWeather.js cambia el mensaje a
// uno más honesto ("hoy no hay una franja especialmente favorable")
// aunque siga citando la hora y temperatura reales. Umbral de diseño,
// no un dato que venga del pronóstico.
const FAVORABLE_MAX_TEMP = 24;

export function isFavorableHour(hour) {
    return hour != null && hour.temp <= FAVORABLE_MAX_TEMP;
}

// El bloque "current" de Open-Meteo es la lectura de ahora mismo del
// modelo -- más precisa para "temperatura actual" que asumir que coincide
// con el primer valor de "hourly" (que es un promedio/instantánea horaria,
// no necesariamente el mismo dato). Si falta, se cae al primer valor de
// parseForecastHours() en vez de dejar el widget sin número grande.
function parseCurrentConditions(data, hours) {

    const current = data?.current;

    if (current?.temperature_2m != null) {
        return {
            temp: Math.round(current.temperature_2m),
            icon: weatherIconForCode(current.weathercode, current.is_day !== 0)
        };
    }

    return hours[0] ? { temp: hours[0].temp, icon: hours[0].icon } : null;

}

async function fetchOpenMeteoForecast(lat, lon, onLog) {

    const params = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        current: "temperature_2m,weathercode,is_day",
        // wind_speed_10m/relative_humidity_2m: mismo endpoint "forecast" de
        // siempre, sin clave nueva -- Open-Meteo ya las ofrece como
        // variables hourly reales, se usan para la línea de "mejor hora
        // para correr" (ver findBestRunningHour()).
        hourly: "temperature_2m,weathercode,is_day,wind_speed_10m,relative_humidity_2m",
        forecast_days: "2",
        timezone: "auto"
    });

    const url = `${FORECAST_URL}?${params}`;
    onLog(`tiempo: GET ${url}`);

    const res = await fetch(url);

    if (!res.ok) {
        onLog(`tiempo: forecast-api respondió HTTP ${res.status}`);
        return null;
    }

    const data = await res.json();
    const hours = parseForecastHours(data);

    if (!hours.length) {
        onLog("tiempo: respuesta sin horas útiles");
        return null;
    }

    const current = parseCurrentConditions(data, hours);

    return { hours, current };

}

// workouts: lista completa de entrenos (getWorkouts() de workoutStore).
// onLog opcional, mismo patrón que weatherEstimate.js. Devuelve
// { hours, current, label } o null -- nunca datos inventados.
export async function getHourlyForecast(workouts, onLog = () => {}) {

    try {

        const location = await resolveLocation(workouts, onLog);
        if (!location) return null;

        const forecast = await fetchOpenMeteoForecast(location.lat, location.lon, onLog);
        if (!forecast) return null;

        return { ...forecast, label: location.label };

    } catch (err) {
        onLog(`tiempo: excepción -- ${err.message}`);
        return null;
    }

}
