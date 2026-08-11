import { WORKOUT_TYPES } from "../../data/workoutTypes.js";
import { parseClockToSeconds } from "../../utils/format.js";
import { isValidIsoDate } from "./json.js";
import { normalizeText } from "./text.js";

const HEADER_TO_FIELD = {
    fecha: "date",
    tipo: "type",
    titulo: "title",
    distancia_km: "distanceKm",
    duracion: "durationSec",
    ritmo_objetivo: "targetPaceSecPerKm",
    zona_fc: "targetHrZone",
    descripcion: "description"
};

// Cuenta comas/puntos y coma fuera de comillas en la cabecera — Excel en
// español exporta con ";" por defecto (la coma la usa como separador
// decimal), así que no se puede asumir un único delimitador fijo.
function detectDelimiter(headerLine) {

    let inQuotes = false;
    let commas = 0;
    let semicolons = 0;

    for (const char of headerLine) {

        if (char === "\"") {
            inQuotes = !inQuotes;
        } else if (!inQuotes && char === ",") {
            commas++;
        } else if (!inQuotes && char === ";") {
            semicolons++;
        }

    }

    return semicolons > commas ? ";" : ",";

}

// Splitter propio de una línea CSV, respetando campos entre comillas
// (incluye el delimitador o comillas escapadas "" dentro). No soporta
// campos con saltos de línea incrustados (multi-línea) — las columnas de
// este esquema son valores cortos, no hace falta esa complejidad extra.
function splitCsvLine(line, delimiter) {

    const fields = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {

        const char = line[i];

        if (inQuotes) {

            if (char === "\"") {
                if (line[i + 1] === "\"") {
                    current += "\"";
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                current += char;
            }

        } else if (char === "\"") {
            inQuotes = true;
        } else if (char === delimiter) {
            fields.push(current);
            current = "";
        } else {
            current += char;
        }

    }

    fields.push(current);
    return fields;

}

// "tipo" acepta tanto el id interno ("z2") como la etiqueta en español ya
// usada en la pantalla de revisión ("Rodaje (Z2)") — comparación exacta
// contra una lista fija (insensible a mayúsculas/tildes), no adivinación.
function matchWorkoutType(raw) {

    const normalized = normalizeText(raw);

    const match = Object.values(WORKOUT_TYPES).find(t =>
        normalizeText(t.id) === normalized || normalizeText(t.label) === normalized
    );

    return match ? match.id : null;

}

// Acepta coma decimal ("8,5") y un sufijo "km" literal opcional ("8km",
// "8 km") — recortes de formato acotados y documentados, no inferencia de
// contenido.
function parseDistanceKm(raw) {

    const stripped = raw.replace(/\s*km$/i, "");
    const normalized = stripped.replace(",", ".");
    const n = Number(normalized);

    return Number.isFinite(n) ? n : null;

}

// Duración/ritmo objetivo: acepta formato reloj ("5:30", "45:00") — lo
// natural al rellenar un CSV a mano — o segundos en crudo si no hay ":".
function parseDurationLike(raw) {

    if (raw.includes(":")) return parseClockToSeconds(raw);

    const n = Number(raw.replace(",", "."));
    return Number.isFinite(n) ? n : null;

}

function cellFor(cells, fieldColumnIndex, field) {

    const colIndex = fieldColumnIndex[field];
    if (colIndex == null) return undefined;

    const raw = cells[colIndex];
    return raw === undefined ? undefined : raw.trim();

}

const NUMBER_FIELDS = [
    ["distanceKm", "distancia_km", parseDistanceKm],
    ["durationSec", "duracion", parseDurationLike],
    ["targetPaceSecPerKm", "ritmo_objetivo", parseDurationLike]
];

const STRING_FIELDS = ["title", "targetHrZone", "description"];

// Mismo patrón que parseSession() en json.js: si un valor no encaja, se
// descarta a null y se avisa citando el valor original — nunca se
// adivina ni se corrige en silencio.
function parseSessionRow(cells, fieldColumnIndex, columnCount, index) {

    const importWarnings = [];
    const fieldMeta = {};
    const session = {};

    if (cells.length < columnCount) {
        importWarnings.push(`Fila #${index + 1} con menos columnas de las esperadas — revisa esta sesión.`);
    }

    const dateRaw = cellFor(cells, fieldColumnIndex, "date");

    if (dateRaw && isValidIsoDate(dateRaw)) {
        session.date = dateRaw;
    } else {
        session.date = null;
        importWarnings.push(dateRaw
            ? `Fecha "${dateRaw}" no reconocida — indícala tú abajo.`
            : "No se indicó fecha para esta sesión — indícala tú abajo.");
    }
    fieldMeta.date = { confidence: session.date != null ? 1 : null, corrected: false };

    const typeRaw = cellFor(cells, fieldColumnIndex, "type");

    if (!typeRaw) {
        session.type = null;
    } else {
        const matched = matchWorkoutType(typeRaw);
        session.type = matched;
        if (!matched) importWarnings.push(`Tipo de sesión "${typeRaw}" no reconocido — revísalo.`);
    }
    fieldMeta.type = { confidence: session.type != null ? 1 : null, corrected: false };

    STRING_FIELDS.forEach(key => {
        const raw = cellFor(cells, fieldColumnIndex, key);
        session[key] = raw ? raw : null;
        fieldMeta[key] = { confidence: session[key] != null ? 1 : null, corrected: false };
    });

    NUMBER_FIELDS.forEach(([key, headerName, parse]) => {

        const raw = cellFor(cells, fieldColumnIndex, key);

        if (!raw) {
            session[key] = null;
        } else {
            const parsed = parse(raw);
            session[key] = parsed;
            if (parsed == null) {
                importWarnings.push(`Columna "${headerName}" con un valor inválido: "${raw}" — se ha ignorado.`);
            }
        }

        fieldMeta[key] = { confidence: session[key] != null ? 1 : null, corrected: false };

    });

    return { ...session, fieldMeta, importWarnings };

}

export function parsePlanFromCsv(text) {

    const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== "");

    if (lines.length === 0) {
        throw new Error("El archivo CSV está vacío.");
    }

    const delimiter = detectDelimiter(lines[0]);
    const rawHeaders = splitCsvLine(lines[0], delimiter).map(h => h.trim());
    const normalizedHeaders = rawHeaders.map(normalizeText);

    const fieldColumnIndex = {};
    const unrecognizedHeaders = [];

    normalizedHeaders.forEach((h, index) => {

        const field = HEADER_TO_FIELD[h];

        if (field) {
            fieldColumnIndex[field] = index;
        } else if (h !== "") {
            unrecognizedHeaders.push(rawHeaders[index]);
        }

    });

    if (fieldColumnIndex.date == null) {
        throw new Error("El CSV no tiene una columna \"fecha\" — es obligatoria para importar un plan.");
    }

    const sessions = lines.slice(1).map((line, index) =>
        parseSessionRow(splitCsvLine(line, delimiter), fieldColumnIndex, rawHeaders.length, index)
    );

    const planWarnings = [];

    if (unrecognizedHeaders.length > 0) {
        planWarnings.push(`Columna(s) no reconocida(s), se han ignorado: ${unrecognizedHeaders.join(", ")}.`);
    }

    const missingDateCount = sessions.filter(s => s.date == null).length;
    if (missingDateCount > 0) {
        planWarnings.push(`${missingDateCount} sesión(es) sin fecha reconocible — revísalas abajo.`);
    }

    const unknownTypeCount = sessions.filter(s => s.type == null && s.importWarnings.some(w => w.startsWith("Tipo de sesión"))).length;
    if (unknownTypeCount > 0) {
        planWarnings.push(`${unknownTypeCount} sesión(es) con un tipo no reconocido — revísalas abajo.`);
    }

    return { planName: null, sessions, planWarnings };

}
