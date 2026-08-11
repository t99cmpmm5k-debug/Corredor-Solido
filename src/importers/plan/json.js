import { WORKOUT_TYPES } from "../../data/workoutTypes.js";
import { parseISODate, formatISODate } from "../../utils/date.js";

const SESSION_FIELDS = [
    "date", "type", "title", "distanceKm",
    "durationSec", "targetPaceSecPerKm", "targetHrZone", "description"
];

const STRING_FIELDS = ["title", "targetHrZone", "description"];
const NUMBER_FIELDS = ["distanceKm", "durationSec", "targetPaceSecPerKm"];

export function isValidIsoDate(value) {

    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

    const date = parseISODate(value);
    return !Number.isNaN(date.getTime()) && formatISODate(date) === value;

}

// Cada sesión se procesa campo a campo: si un valor no tiene el tipo/forma
// esperada se descarta a null y se avisa — nunca se adivina ni se corrige
// en silencio (misma disciplina que garmin.js con el OCR).
function parseSession(raw, index) {

    const importWarnings = [];
    const fieldMeta = {};
    const session = {};

    if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
        return {
            date: null, type: null, title: null, distanceKm: null,
            durationSec: null, targetPaceSecPerKm: null, targetHrZone: null,
            description: null,
            fieldMeta: Object.fromEntries(SESSION_FIELDS.map(k => [k, { confidence: null, corrected: false }])),
            importWarnings: [`Sesión #${index + 1} no es un objeto válido — se ha ignorado por completo.`]
        };
    }

    if (isValidIsoDate(raw.date)) {
        session.date = raw.date;
    } else {
        session.date = null;
        if (raw.date != null) {
            importWarnings.push(`Fecha "${raw.date}" no reconocida — indícala tú abajo.`);
        } else {
            importWarnings.push("No se indicó fecha para esta sesión — indícala tú abajo.");
        }
    }
    fieldMeta.date = { confidence: session.date != null ? 1 : null, corrected: false };

    if (raw.type == null) {
        session.type = null;
    } else if (Object.prototype.hasOwnProperty.call(WORKOUT_TYPES, raw.type)) {
        session.type = raw.type;
    } else {
        session.type = null;
        importWarnings.push(`Tipo de sesión "${raw.type}" no reconocido — revísalo.`);
    }
    fieldMeta.type = { confidence: session.type != null ? 1 : null, corrected: false };

    STRING_FIELDS.forEach(key => {
        if (raw[key] == null) {
            session[key] = null;
        } else if (typeof raw[key] === "string") {
            session[key] = raw[key];
        } else {
            session[key] = null;
            importWarnings.push(`Campo "${key}" con un tipo inválido — se ha ignorado.`);
        }
        fieldMeta[key] = { confidence: session[key] != null ? 1 : null, corrected: false };
    });

    NUMBER_FIELDS.forEach(key => {
        if (raw[key] == null) {
            session[key] = null;
        } else if (typeof raw[key] === "number" && Number.isFinite(raw[key])) {
            session[key] = raw[key];
        } else {
            session[key] = null;
            importWarnings.push(`Campo "${key}" con un tipo inválido — se ha ignorado.`);
        }
        fieldMeta[key] = { confidence: session[key] != null ? 1 : null, corrected: false };
    });

    return { ...session, fieldMeta, importWarnings };

}

export function parsePlanFromJson(text) {

    let parsed;

    try {
        parsed = JSON.parse(text);
    } catch {
        throw new Error("El archivo no es un JSON válido — revisa su sintaxis.");
    }

    if (parsed == null || typeof parsed !== "object" || !Array.isArray(parsed.sessions)) {
        throw new Error("El JSON no tiene la estructura esperada — falta un array \"sessions\".");
    }

    const sessions = parsed.sessions.map((raw, index) => parseSession(raw, index));

    const planWarnings = [];

    const missingDateCount = sessions.filter(s => s.date == null).length;
    if (missingDateCount > 0) {
        planWarnings.push(`${missingDateCount} sesión(es) sin fecha reconocible — revísalas abajo.`);
    }

    const unknownTypeCount = sessions.filter(s => s.type == null && s.importWarnings.some(w => w.startsWith("Tipo de sesión"))).length;
    if (unknownTypeCount > 0) {
        planWarnings.push(`${unknownTypeCount} sesión(es) con un tipo no reconocido — revísalas abajo.`);
    }

    return {
        planName: typeof parsed.planName === "string" ? parsed.planName : null,
        sessions,
        planWarnings
    };

}
