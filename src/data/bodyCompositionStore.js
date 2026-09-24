// Composición corporal (Gimnasio): registros manuales con fecha -- peso
// obligatorio (lo mínimo que registra cualquiera con una báscula normal),
// % grasa / % agua / % músculo opcionales (solo quien tiene báscula de
// bioimpedancia). Un campo no rellenado se guarda como null, nunca como 0
// ni como el valor de otro registro: aquí no se estima ni se interpola
// nada. Participa en el sync con el backend y en el backup JSON desde el
// primer día (ver backup.js/getSyncableData()), mismo patrón que
// gymRoutineStore.js.
import { STORES, getAll, put, remove } from "./db.js";
import { generateId } from "../utils/id.js";
import { notifyDataChanged } from "./changeEvents.js";
import { recordTombstone } from "./tombstoneStore.js";
import { addDays } from "../utils/date.js";

const entries = [];

let hydrated = null;

export function hydrate() {

    if (hydrated) return hydrated;

    hydrated = getAll(STORES.bodyComposition).then(loaded => {

        entries.push(...loaded);

    }).catch(err => {

        console.warn("No se pudieron cargar los registros de composición corporal — la app sigue sin persistencia.", err);

    });

    return hydrated;

}

// Más reciente primero; a igual fecha, el último creado primero.
export function getBodyCompositionEntries() {

    return [...entries].sort((a, b) =>
        b.date.localeCompare(a.date) || (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
    );

}

export function getBodyCompositionEntryById(id) {

    return entries.find(e => e.id === id) || null;

}

function upsertInto(entry) {

    const index = entries.findIndex(e => e.id === entry.id);
    if (index === -1) entries.push(entry);
    else entries[index] = entry;

    return put(STORES.bodyComposition, entry).catch(() => {});

}

// fields: { date, weightKg, bodyFatPercent, waterPercent, musclePercent },
// ya validados (ver parseBodyCompositionForm()).
export function addBodyCompositionEntry(fields) {

    const now = new Date().toISOString();
    const entry = { id: generateId(), ...fields, createdAt: now, updatedAt: now };

    upsertInto(entry);
    notifyDataChanged();

    return entry;

}

export function updateBodyCompositionEntry(id, fields) {

    const entry = getBodyCompositionEntryById(id);
    if (!entry) return null;

    const updated = { ...entry, ...fields, updatedAt: new Date().toISOString() };

    upsertInto(updated);
    notifyDataChanged();

    return updated;

}

export function deleteBodyCompositionEntry(id) {

    const index = entries.findIndex(e => e.id === id);
    if (index === -1) return;

    entries.splice(index, 1);

    remove(STORES.bodyComposition, id).catch(() => {});
    recordTombstone("bodyComposition", id);
    notifyDataChanged();

}

// Restauración desde el sync o un backup (conserva el id original, sin
// notificar: no es un cambio del usuario).
export function restoreBodyCompositionEntry(entry) {

    return upsertInto(entry);

}

// Admite coma decimal ("72,5") -- el teclado numérico de iOS en español la
// pone. Vacío -> null (campo no registrado).
function parseDecimal(raw) {

    const text = String(raw ?? "").trim().replace(",", ".");
    if (!text) return null;

    const n = Number(text);
    return Number.isFinite(n) ? n : NaN;

}

const PERCENT_FIELDS = [
    ["bodyFatPercent", "% grasa"],
    ["waterPercent", "% agua"],
    ["musclePercent", "% músculo"]
];

// Valores crudos del formulario -> { fields } o { error }. Solo rechaza lo
// imposible (peso vacío o fuera de rango, porcentajes fuera de 0-100);
// nunca corrige ni rellena un valor por su cuenta.
export function parseBodyCompositionForm(raw) {

    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw.date ?? "")) return { error: "Elige la fecha del registro." };

    const weightKg = parseDecimal(raw.weightKg);
    if (weightKg == null) return { error: "El peso es obligatorio." };
    if (!(weightKg > 0 && weightKg < 400)) return { error: "Revisa el peso: tiene que estar entre 0 y 400 kg." };

    const fields = { date: raw.date, weightKg: Math.round(weightKg * 10) / 10 };

    for (const [key, label] of PERCENT_FIELDS) {

        const value = parseDecimal(raw[key]);

        if (value != null && !(value >= 0 && value <= 100)) {
            return { error: `Revisa el ${label}: tiene que estar entre 0 y 100.` };
        }

        fields[key] = value == null ? null : Math.round(value * 10) / 10;

    }

    return { fields };

}

export const BODY_METRICS = ["weightKg", "bodyFatPercent", "waterPercent", "musclePercent"];

// "Último registro": el valor de cada métrica en el registro más reciente,
// comparado con el registro ANTERIOR que tenga esa misma métrica (una
// báscula normal no da % grasa, así que el anterior con % puede ser otro
// que el anterior con peso). Sin valor o sin anterior: sin comparación --
// nunca se compara contra un valor que no existe.
export function getLatestBodyComposition() {

    const entries = getBodyCompositionEntries();
    const latest = entries[0];
    if (!latest) return null;

    const metrics = {};

    for (const metric of BODY_METRICS) {

        const value = latest[metric];
        const previous = value == null ? null : entries.slice(1).find(e => e[metric] != null) ?? null;

        metrics[metric] = {
            value,
            previousValue: previous?.[metric] ?? null,
            previousDate: previous?.date ?? null,
            delta: previous ? Math.round((value - previous[metric]) * 10) / 10 : null
        };

    }

    return { date: latest.date, metrics };

}

// Puntos de una métrica en los últimos `days` días hasta `today`
// (incluido), en orden de fecha -- solo registros con esa métrica.
export function getBodyCompositionSeries(metric, today, days = 30) {

    const fromIso = addDays(today, -(days - 1));

    return getBodyCompositionEntries()
        .filter(e => e[metric] != null && e.date >= fromIso && e.date <= today)
        .sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt ?? "").localeCompare(b.createdAt ?? ""))
        .map(e => ({ date: e.date, value: e[metric] }));

}
