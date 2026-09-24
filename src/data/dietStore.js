// Dieta de la plantilla CSV (Nutrición, Gimnasio) -- ver
// utils/dietCsv.js para el formato. Tres stores, los tres en el sync y el
// backup desde el primer día:
//
// - dietPlans: cada dieta importada, tal cual la dio el parser. Solo una
//   `active` a la vez; importar otra desactiva la anterior pero la
//   conserva, para que el histórico de sus días siga teniendo sentido.
// - dietChecks: un registro por día (id = fecha) con qué opción se comió
//   de cada comida ({ "LUNES|21:00": "LUNES|21:00|2" }).
// - dietWeekends: un registro por semana (id = lunes de esa semana) con qué
//   día real del fin de semana es TIRADA_LARGA; el otro es DESCANSO.
//
// Las claves de comida/opción son deterministas (dia|momento|opcion), así
// que reimportar el mismo CSV corregido no pierde lo ya marcado.
import { STORES, getAll, put, remove } from "./db.js";
import { generateId } from "../utils/id.js";
import { notifyDataChanged } from "./changeEvents.js";
import { recordTombstone } from "./tombstoneStore.js";
import { parseISODate, addDays, formatISODate, getWeekStartDate } from "../utils/date.js";

const plans = [];
const checks = [];
const weekends = [];

let hydrated = null;

export function hydrate() {

    if (hydrated) return hydrated;

    hydrated = Promise.all([getAll(STORES.dietPlans), getAll(STORES.dietChecks), getAll(STORES.dietWeekends)])
        .then(([loadedPlans, loadedChecks, loadedWeekends]) => {
            plans.push(...loadedPlans);
            checks.push(...loadedChecks);
            weekends.push(...loadedWeekends);
        })
        .catch(err => {
            console.warn("No se pudo cargar la dieta — la app sigue sin persistencia.", err);
        });

    return hydrated;

}

function upsert(list, store, record) {

    const index = list.findIndex(r => r.id === record.id);
    if (index === -1) list.push(record);
    else list[index] = record;

    return put(store, record).catch(() => {});

}

export function getDietPlans() {

    return [...plans].sort((a, b) => (b.importedAt ?? "").localeCompare(a.importedAt ?? ""));

}

export function getActiveDietPlan() {

    return getDietPlans().find(p => p.active) ?? null;

}

export function getDietChecks() {

    return [...checks].sort((a, b) => b.date.localeCompare(a.date));

}

export function getDietWeekends() {

    return [...weekends].sort((a, b) => b.weekStart.localeCompare(a.weekStart));

}

// parsed: el `plan` de parseDietCsv(), sin tocar.
export function importDietPlan(parsed, { fileName = null } = {}) {

    const now = new Date().toISOString();

    for (const previous of plans.filter(p => p.active)) {
        upsert(plans, STORES.dietPlans, { ...previous, active: false, updatedAt: now });
    }

    const plan = {
        id: generateId(),
        days: parsed.days,
        generalRules: parsed.generalRules,
        sourceFileName: fileName,
        active: true,
        importedAt: now,
        updatedAt: now
    };

    upsert(plans, STORES.dietPlans, plan);
    notifyDataChanged();

    return plan;

}

export function deleteDietPlan(id) {

    const index = plans.findIndex(p => p.id === id);
    if (index === -1) return;

    plans.splice(index, 1);

    remove(STORES.dietPlans, id).catch(() => {});
    recordTombstone("dietPlans", id);
    notifyDataChanged();

}

// ---- Fin de semana ---------------------------------------------------------

// "sabado" | "domingo" | null (sin elegir todavía esa semana).
export function getWeekendLongRunDay(date) {

    return weekends.find(w => w.id === getWeekStartDate(date))?.longRunDay ?? null;

}

export function setWeekendLongRunDay(date, longRunDay) {

    if (longRunDay !== "sabado" && longRunDay !== "domingo") return;

    const weekStart = getWeekStartDate(date);
    upsert(weekends, STORES.dietWeekends, { id: weekStart, weekStart, longRunDay, updatedAt: new Date().toISOString() });
    notifyDataChanged();

}

const DAY_BY_WEEKDAY = [null, "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", null];

// Qué día de la dieta toca en una fecha:
// { dayKey } de lunes a viernes; sábado/domingo según la elección de esa
// semana, o { dayKey: null, needsWeekendChoice: true } si no se ha elegido.
export function resolveDietDay(date) {

    const weekday = parseISODate(date).getDay();

    if (DAY_BY_WEEKDAY[weekday]) return { dayKey: DAY_BY_WEEKDAY[weekday], needsWeekendChoice: false };

    const longRunDay = getWeekendLongRunDay(date);
    if (!longRunDay) return { dayKey: null, needsWeekendChoice: true };

    const isSaturday = weekday === 6;
    const isLongRun = (longRunDay === "sabado") === isSaturday;

    return { dayKey: isLongRun ? "TIRADA_LARGA" : "DESCANSO", needsWeekendChoice: false };

}

// ---- Lo comido -------------------------------------------------------------

export function getEatenForDate(date) {

    return checks.find(c => c.id === date)?.eaten ?? {};

}

// Marca que de `mealKey` se comió `optionKey`; volver a tocar la misma
// opción la desmarca, tocar otra la sustituye (una opción por comida).
export function toggleMealEaten(date, planId, mealKey, optionKey) {

    const eaten = { ...getEatenForDate(date) };

    if (eaten[mealKey] === optionKey) delete eaten[mealKey];
    else eaten[mealKey] = optionKey;

    upsert(checks, STORES.dietChecks, { id: date, date, planId, eaten, updatedAt: new Date().toISOString() });
    notifyDataChanged();

}

// Cumplimiento de un día: comidas con alguna opción marcada sobre las
// comidas del día (HIDRATACION y AJUSTE no son comidas y no cuentan). Una
// marca de una opción que ya no existe en el plan (CSV reimportado sin
// ella) no cuenta. null si no hay día que contar.
export function computeDayCompliance(day, eaten) {

    if (!day?.meals.length) return null;

    const total = day.meals.length;
    const done = day.meals.filter(meal => meal.options.some(o => o.key === eaten[meal.key])).length;

    return { done, total, percent: Math.round(done / total * 100) };

}

// Últimos `days` días hasta `today` (incluido): cada uno contra el plan con
// el que se marcó, o el activo si no se marcó nada. null en los días
// anteriores a importar la dieta activa y en fines de semana sin elegir
// (no hay menú con el que comparar).
export function getComplianceHistory(today, days = 7) {

    const active = getActiveDietPlan();
    const history = [];

    for (let i = days - 1; i >= 0; i--) {

        const date = addDays(today, -i);
        const record = checks.find(c => c.id === date);
        const plan = record ? plans.find(p => p.id === record.planId) : active;
        const beforeImport = !record && active && date < formatISODate(new Date(active.importedAt));
        const { dayKey } = resolveDietDay(date);

        const compliance = beforeImport || !plan || !dayKey ? null : computeDayCompliance(plan.days[dayKey], record?.eaten ?? {});
        history.push({ date, percent: compliance?.percent ?? null });

    }

    return history;

}

// ---- Restauración (sync/backup): conserva el id, sin notificar ------------

export function restoreDietPlan(plan) {

    return upsert(plans, STORES.dietPlans, plan);

}

export function restoreDietCheck(check) {

    return upsert(checks, STORES.dietChecks, check);

}

export function restoreDietWeekend(weekend) {

    return upsert(weekends, STORES.dietWeekends, weekend);

}
