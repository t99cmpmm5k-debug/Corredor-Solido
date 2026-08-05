const NOT_FOUND = "No encontrado";

function textOrNull(value) {

    return value && value !== NOT_FOUND ? value : null;

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

    const [min, sec] = text.split(":").map(Number);
    if (Number.isNaN(min) || Number.isNaN(sec)) return null;

    return min * 60 + sec;

}

function parseDurationToSeconds(value) {

    const text = textOrNull(value);
    if (text === null) return null;

    const parts = text.split(":").map(Number);
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

// Forma de raw.confidence / raw.warnings sin confirmar contra el motor real:
// se asume raw.confidence[campo_crudo] = 0..1 y raw.warnings = [{ field, message }].
// Ajustar cuando se integre parser-registry.js.
const RAW_FIELD_BY_NEUTRAL_KEY = {

    date: "fecha",
    distanceKm: "distance_km",
    durationSec: "total_time",
    avgPaceSecPerKm: "avg_pace_min_km",
    avgHr: "avg_heart_rate_bpm",
    maxHr: "max_heart_rate_bpm",
    calories: "calories_kcal",
    avgCadence: "cadence_spm",
    temperatureC: "temperature_c",
    elevationGainM: "elevation_gain_m"

};

function buildFieldMeta(raw) {

    const warningByRawField = {};

    (raw.warnings || []).forEach(w => {
        if (w && w.field) warningByRawField[w.field] = w.message || true;
    });

    const fieldMeta = {};

    Object.entries(RAW_FIELD_BY_NEUTRAL_KEY).forEach(([neutralKey, rawKey]) => {

        fieldMeta[neutralKey] = {
            confidence: raw.confidence?.[rawKey] ?? null,
            warning: warningByRawField[rawKey] ?? null,
            corrected: false
        };

    });

    return fieldMeta;

}

// Formatos reconocidos por ahora: "AAAA-MM-DD" y "DD/MM/AAAA".
// Sin confirmar contra el motor real todavía — ajustar cuando se integre.
function parseGarminDate(value) {

    const text = textOrNull(value);
    if (text === null) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

    const dmy = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmy) {
        const [, day, month, year] = dmy;
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    return null;

}

export function parseGarminWorkout(raw) {

    const date = parseGarminDate(raw.fecha);

    if (!date) {
        throw new Error(`Fecha de Garmin no reconocida: "${raw.fecha}"`);
    }

    return {

        date,
        distanceKm: parseNumber(raw.distance_km),
        durationSec: parseDurationToSeconds(raw.total_time),
        avgPaceSecPerKm: parsePaceToSecPerKm(raw.avg_pace_min_km),
        avgHr: parseNumber(raw.avg_heart_rate_bpm),
        maxHr: parseNumber(raw.max_heart_rate_bpm),
        calories: parseNumber(raw.calories_kcal),
        avgCadence: parseNumber(raw.cadence_spm),
        temperatureC: parseNumber(raw.temperature_c),
        elevationGainM: parseNumber(raw.elevation_gain_m),

        // parser-splits.js todavía no está integrado — llega vacío hasta entonces.
        splits: [],

        fieldMeta: buildFieldMeta(raw)

    };

}
