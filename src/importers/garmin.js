import { MONTHS } from "./garmin-engine/garmin-utils.js";
import { formatISODate } from "../utils/date.js";
import { inferWorkoutType } from "./classifyWorkoutType.js";

const NOT_FOUND = "No encontrado";

function textOrNull(value) {

    return value == null || value === NOT_FOUND ? null : value;

}

function parseNumber(value) {

    const text = textOrNull(value);
    if (text === null) return null;

    const n = parseFloat(String(text).replace(",", "."));
    return Number.isNaN(n) ? null : n;

}

function parsePaceToSecPerKm(value) {

    const text = textOrNull(value);
    if (text === null) return null;

    const [min, sec] = String(text).split(":").map(Number);
    if (Number.isNaN(min) || Number.isNaN(sec)) return null;

    return min * 60 + sec;

}

function parseDurationToSeconds(value) {

    const text = textOrNull(value);
    if (text === null) return null;

    const parts = String(text).split(":").map(Number);
    if (parts.some(Number.isNaN)) return null;

    if (parts.length === 2) {
        const [min, sec] = parts;
        return min * 60 + sec;
    }

    if (parts.length === 3) {
        const [hr, min, sec] = parts;
        return hr * 3600 + min * 60 + sec;
    }

    return null;

}

const MONTH_INDEX = Object.fromEntries(
    MONTHS.replace("sept?", "sep,sept").split("|").flatMap((token, i) => {
        const names = token.includes(",") ? token.split(",") : [token];
        return names.map(name => [name, i + 1]);
    })
);

// Formato real del motor: "5 ago 2026" (día + mes abreviado en español + año
// opcional — el motor no siempre lo detecta en la captura).
function parseGarminDate(value) {

    const text = textOrNull(value);
    if (text === null) return { date: null, yearAssumed: false };

    const match = String(text).match(new RegExp(`^([0-3]?[0-9])\\s+(${MONTHS})(?:\\s+(20[0-9]{2}))?$`, "i"));
    if (!match) return { date: null, yearAssumed: false };

    const day = Number(match[1]);
    const month = MONTH_INDEX[match[2].toLowerCase()];
    if (!month) return { date: null, yearAssumed: false };

    const explicitYear = match[3] ? Number(match[3]) : null;
    const now = new Date();

    let year = explicitYear ?? now.getFullYear();
    let candidate = new Date(year, month - 1, day);

    const yearAssumed = explicitYear === null;

    // Sin año en la captura: si el año actual da una fecha futura, fue el año pasado.
    if (yearAssumed) {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (candidate > today) {
            year -= 1;
            candidate = new Date(year, month - 1, day);
        }
    }

    return { date: formatISODate(candidate), yearAssumed };

}

const RAW_FIELD_BY_NEUTRAL_KEY = {

    date: "date",
    time: "time",
    title: "title",
    distanceKm: "distance_km",
    durationSec: "total_time",
    avgPaceSecPerKm: "avg_pace_min_km",
    avgHr: "avg_heart_rate_bpm",
    maxHr: "max_heart_rate_bpm",
    calories: "calories_kcal",
    avgCadence: "cadence_spm",
    maxCadence: "max_cadence_spm",
    temperatureC: "temperature_c",
    elevationGainM: "elevation_gain_m",
    trainingEffectAerobic: "training_effect_aerobic",
    trainingEffectAnaerobic: "training_effect_anaerobic",
    exerciseLoad: "exercise_load"

};

// La confianza vive dentro de cada campo ya fusionado (merged.fields[campo].confidence).
// merged.warnings es un aviso general del entrenamiento, no por campo.
function buildFieldMeta(merged) {

    const fieldMeta = {};

    Object.entries(RAW_FIELD_BY_NEUTRAL_KEY).forEach(([neutralKey, rawKey]) => {

        fieldMeta[neutralKey] = {
            confidence: merged.fields?.[rawKey]?.confidence ?? null,
            corrected: false
        };

    });

    return fieldMeta;

}

// Si no hay una captura de Resumen/Estadísticas con la FC media/máxima
// general del entreno, se derivan de las vueltas (columna FC de la tabla
// desplazada, ver parser-splits.js) en vez de dejarlas en null — un
// entreno con solo esa tabla + Resumen (sin la vista estándar de Vueltas,
// la única que aporta ritmo/distancia por vuelta) se quedaba sin ningún
// ppm que mostrar, ni en el gráfico ni en el stat "FC media", aunque el
// dato SÍ existe por vuelta. Media aritmética simple para la media (no
// hay duración por vuelta con la que ponderar, y las vueltas de esta
// tabla son ~1 km cada una); la máxima es el pico real de cualquier
// vuelta, no una media de máximos.
function averageOfLaps(values) {
    return values.length ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length) : null;
}

function maxOfLaps(values) {
    return values.length ? Math.max(...values) : null;
}

// raw = el resultado fusionado de varias capturas (GarminFusion.merge, ver
// garmin-engine/recognize.js), no una única captura sin fusionar.
export function parseGarminWorkout(merged) {

    const data = merged.data || {};
    const { date, yearAssumed } = parseGarminDate(data.date);

    // Sin fecha no se bloquea la importación: el resto de datos (distancia,
    // ritmo, FC...) se leyó bien igualmente. Se deja en blanco y se avisa
    // para que el usuario la rellene a mano en el paso de Revisar — ver
    // el guard en initRunningEvents.js que impide guardar sin fecha.
    const importWarnings = (merged.warnings || [])
        .filter(w => w !== "Falta la fecha del entrenamiento.");

    if (!date) {
        importWarnings.unshift("No se detectó la fecha del entrenamiento — indícala tú abajo.");
    } else if (yearAssumed) {
        importWarnings.push(`Año no detectado en la captura — asumido ${date.slice(0, 4)}, revisar.`);
    }

    const title = textOrNull(data.title);
    const distanceKm = parseNumber(data.distance_km);

    // avgHr/maxHr por vuelta solo llegan si el usuario también capturó la
    // tabla de Vueltas desplazada a la derecha (columnas GAP medio/FC
    // media/FC máx.) — ver parser-splits.js. Sin esa captura quedan null,
    // igual que hoy, sin inventar nada. segmentType ("work"/"rest") solo
    // lo trae parser-intervals.js — en una Vuelta normal queda null.
    const splits = (merged.laps || []).map(lap => ({
        lap: lap.lap,
        distanceKm: lap.distance_km,
        paceSecPerKm: parsePaceToSecPerKm(lap.pace_min_km),
        avgHr: lap.avg_heart_rate_bpm ?? null,
        maxHr: lap.max_heart_rate_bpm ?? null,
        segmentType: lap.segmentType ?? null
    }));

    // Bloques reales de "Intervalos" de una Carrera normal (ver
    // parser-intervals-road.js) -- array aparte de splits a propósito: cada
    // bloque cubre varios km (11 km, 2 km...), no 1 como un split, así que
    // mezclarlos en el mismo array contaminaría RITMO POR KILÓMETRO
    // (chartSplits() en RunningDetailView.js) con "vueltas" que en realidad
    // son la media de muchas.
    const intervals = (merged.blocks || []).map(block => ({
        interval: block.lap,
        type: block.type ?? null,
        durationSec: parseDurationToSeconds(block.duration),
        distanceKm: block.distance_km,
        paceSecPerKm: parsePaceToSecPerKm(block.pace_min_km),
        avgHr: block.avg_heart_rate_bpm ?? null,
        maxHr: block.max_heart_rate_bpm ?? null
    }));

    const { type, confidence: typeConfidence } = inferWorkoutType({ title, distanceKm, splits });

    // type es un campo calculado (heurística de clasificación), no una
    // lectura directa del OCR — no vive en RAW_FIELD_BY_NEUTRAL_KEY, así
    // que su fieldMeta se añade a mano en vez de salir de buildFieldMeta.
    const fieldMeta = buildFieldMeta(merged);
    fieldMeta.type = { confidence: typeConfidence, corrected: false };

    const avgHrFromCapture = parseNumber(data.avg_heart_rate_bpm);
    const maxHrFromCapture = parseNumber(data.max_heart_rate_bpm);

    const avgHr = avgHrFromCapture ?? averageOfLaps(splits.map(s => s.avgHr).filter(v => v != null));
    const maxHr = maxHrFromCapture ?? maxOfLaps(splits.map(s => s.maxHr).filter(v => v != null));

    if (avgHrFromCapture == null && avgHr != null) {
        importWarnings.push("FC media estimada a partir de las vueltas — no viene de una lectura directa de Resumen/Estadísticas.");
    }

    return {

        date,
        time: textOrNull(data.time),
        title,
        location: textOrNull(data.location),
        type,
        distanceKm,
        durationSec: parseDurationToSeconds(data.total_time),
        avgPaceSecPerKm: parsePaceToSecPerKm(data.avg_pace_min_km),
        avgHr,
        maxHr,
        calories: parseNumber(data.calories_kcal),
        avgCadence: parseNumber(data.cadence_spm),
        maxCadence: parseNumber(data.max_cadence_spm),
        temperatureC: parseNumber(data.temperature_c),
        elevationGainM: parseNumber(data.elevation_gain_m),

        // Training Effect (bloque real dentro de Estadísticas, ver
        // parser-statistics.js) -- solo llega si el usuario capturó esa
        // pantalla; nunca se inventa para un entreno que no la trajo.
        trainingEffectAerobic: parseNumber(data.training_effect_aerobic),
        trainingEffectAnaerobic: parseNumber(data.training_effect_anaerobic),
        exerciseLoad: parseNumber(data.exercise_load),

        splits,
        intervals,

        fieldMeta,
        importWarnings

    };

}
