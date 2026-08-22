import { isValidIsoDate } from "../plan/json.js";

const STRING_FIELDS = ["type", "name", "location", "url", "region"];

// AAAA-MM-DDTHH:MM(:SS)? — no valida más allá de la forma (ni que la hora
// exista de verdad, p. ej. 25:99) por el mismo motivo que isValidIsoDate()
// no reconstruye la fecha entera: aquí basta con distinguir "tiene pinta
// de fecha-hora" de "no la tiene", el resto lo revisa el usuario si hace
// falta.
const ISO_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

function isValidIsoDateTime(value) {

    return typeof value === "string" && ISO_DATETIME_PATTERN.test(value);

}

// Cada carrera se procesa campo a campo, igual que parseSession() en
// plan/json.js: un valor con la forma incorrecta se descarta a null y se
// avisa, nunca se adivina. "type" se guarda tal cual llega (texto libre,
// sin catálogo que validar contra — a diferencia del type de una sesión
// de Plan, este archivo no tiene por qué limitarse a "RU").
function parseRace(raw, index) {

    if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
        return {
            date: null, type: null, name: null, location: null,
            registrationDeadline: null, url: null, region: null,
            fieldMeta: Object.fromEntries(
                ["date", "type", "name", "location", "registrationDeadline", "url", "region"]
                    .map(k => [k, { confidence: null, corrected: false }])
            ),
            importWarnings: [`Carrera #${index + 1} no es un objeto válido — se ha ignorado por completo.`]
        };
    }

    const importWarnings = [];
    const fieldMeta = {};
    const race = {};

    if (isValidIsoDate(raw.date)) {
        race.date = raw.date;
    } else {
        race.date = null;
        importWarnings.push(raw.date != null
            ? `Fecha "${raw.date}" no reconocida — indícala tú abajo.`
            : "No se indicó fecha para esta carrera — indícala tú abajo.");
    }
    fieldMeta.date = { confidence: race.date != null ? 1 : null, corrected: false };

    STRING_FIELDS.forEach(key => {
        if (raw[key] == null) {
            race[key] = null;
        } else if (typeof raw[key] === "string") {
            race[key] = raw[key];
        } else {
            race[key] = null;
            importWarnings.push(`Campo "${key}" con un tipo inválido — se ha ignorado.`);
        }
        fieldMeta[key] = { confidence: race[key] != null ? 1 : null, corrected: false };
    });

    if (raw.registrationDeadline == null) {
        race.registrationDeadline = null;
    } else if (isValidIsoDateTime(raw.registrationDeadline)) {
        race.registrationDeadline = raw.registrationDeadline;
    } else {
        race.registrationDeadline = null;
        importWarnings.push(`Fecha límite de inscripción "${raw.registrationDeadline}" no reconocida — revísala.`);
    }
    fieldMeta.registrationDeadline = { confidence: race.registrationDeadline != null ? 1 : null, corrected: false };

    return { ...race, fieldMeta, importWarnings };

}

export function parseRacesFromJson(text) {

    let parsed;

    try {
        parsed = JSON.parse(text);
    } catch {
        throw new Error("El archivo no es un JSON válido — revisa su sintaxis.");
    }

    if (parsed == null || typeof parsed !== "object" || !Array.isArray(parsed.races)) {
        throw new Error("El JSON no tiene la estructura esperada — falta un array \"races\".");
    }

    const races = parsed.races.map((raw, index) => parseRace(raw, index));

    const planWarnings = [];

    const missingDateCount = races.filter(r => r.date == null).length;
    if (missingDateCount > 0) {
        planWarnings.push(`${missingDateCount} carrera(s) sin fecha reconocible — revísalas abajo.`);
    }

    const missingNameCount = races.filter(r => r.name == null).length;
    if (missingNameCount > 0) {
        planWarnings.push(`${missingNameCount} carrera(s) sin nombre — revísalas abajo.`);
    }

    return {
        planName: typeof parsed.planName === "string" ? parsed.planName : null,
        races,
        planWarnings
    };

}
