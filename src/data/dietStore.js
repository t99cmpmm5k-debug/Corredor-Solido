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
import { splitTrainingPrefix } from "../utils/dietCsv.js";

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
// Conserva el resto del registro del día (la franja elegida, trainingTime).
export function toggleMealEaten(date, planId, mealKey, optionKey) {

    const record = checks.find(c => c.id === date);
    const eaten = { ...(record?.eaten ?? {}) };

    if (eaten[mealKey] === optionKey) delete eaten[mealKey];
    else eaten[mealKey] = optionKey;

    upsert(checks, STORES.dietChecks, { ...record, id: date, date, planId, eaten, updatedAt: new Date().toISOString() });
    notifyDataChanged();

}

// ---- Franja de entrenamiento (Mañana / Mediodía / Tarde / Descanso) ----------

const DEFAULT_TRAINING_TIME = "mediodia";

// 4ª pestaña: ese día no se entrena. Se come lo que el propio día tenga
// con "Descanso - " o, si no tiene, el menú DESCANSO del plan entero (ver
// getDietMenu). Se guarda en trainingTime igual que las otras, pero nunca
// se hereda: es una decisión de ese día.
export const REST_TRAINING_TIME = "descanso";
const REST_DAY_KEY = "DESCANSO";

// Franja de un día: la elegida ese día (también "descanso"); si no, la del
// último día anterior en que se eligió un entreno (por fecha, para que el
// histórico no cambie al elegir otra hoy -- "descanso" no cuenta); si
// nunca se ha elegido, mediodía.
export function getTrainingTimeForDate(date) {

    const own = checks.find(c => c.id === date)?.trainingTime;
    if (own) return own;

    const previous = checks
        .filter(c => c.trainingTime && c.trainingTime !== REST_TRAINING_TIME && c.date < date)
        .sort((a, b) => b.date.localeCompare(a.date))[0];

    return previous?.trainingTime ?? DEFAULT_TRAINING_TIME;

}

// Guarda la franja en el registro del día (dietChecks), conservando lo ya
// marcado -- mismo registro y mismo sync que las comidas.
export function setTrainingTime(date, planId, trainingTime) {

    const record = checks.find(c => c.id === date);

    upsert(checks, STORES.dietChecks, {
        ...record,
        id: date,
        date,
        planId: record?.planId ?? planId,
        eaten: record?.eaten ?? {},
        trainingTime,
        updatedAt: new Date().toISOString()
    });
    notifyDataChanged();

}

// Franja y nombre de cada comida, deducidos al leer: si la comida trae
// `training` se usa tal cual; si no (plan guardado o sincronizado antes de
// existir el campo), se calculan del momento ORIGINAL, que la clave
// conserva ("LUNES|Mañana - Desayuno" -> manana, "Desayuno"). Lo guardado
// no se toca. Cacheado por día: los planes no se mutan, se sustituyen.
const mealsWithTraining = new WeakMap();

function getDayMeals(day) {

    if (!day) return [];

    let meals = mealsWithTraining.get(day);
    if (meals) return meals;

    meals = day.meals.map(meal => {

        if (meal.training) return meal;

        const original = meal.key.slice(meal.key.indexOf("|") + 1);
        const { training, name } = splitTrainingPrefix(original);

        return training ? { ...meal, moment: name, training } : meal;

    });

    mealsWithTraining.set(day, meals);
    return meals;

}

// ¿Tiene este día comidas ligadas a una franja? Si no (planes sin
// prefijos), no hay pestañas y todo se ve como antes.
export function dayHasTrainingTimes(day) {

    return getDayMeals(day).some(meal => meal.training);

}

// Comidas de una franja: las suyas más las comunes (sin franja). Sin
// franja (null), todas -- el comportamiento de antes. "descanso" filtra
// igual: las "Descanso - " del día más las comunes (en el día DESCANSO,
// sin prefijos, son todas).
export function getMealsForTrainingTime(day, trainingTime) {

    const meals = getDayMeals(day);
    if (!trainingTime) return meals;

    return meals.filter(meal => !meal.training || meal.training === trainingTime);

}

// ¿Tiene el día comidas propias de descanso ("Descanso - …")?
function dayHasRestMeals(day) {

    return getDayMeals(day).some(meal => meal.training === REST_TRAINING_TIME);

}

// ¿Sale la pestaña Descanso en este día? Si el día tiene comidas
// "Descanso - ", sí; si no, en días con franjas que no sean ya el propio
// DESCANSO y si el plan tiene menú DESCANSO.
export function canChooseRestDay(plan, dayKey) {

    const day = plan?.days[dayKey];
    if (dayHasRestMeals(day)) return true;

    return dayKey !== REST_DAY_KEY
        && dayHasTrainingTimes(day)
        && getDayMeals(plan.days[REST_DAY_KEY]).length > 0;

}

// Qué menú se come un día -- la única fuente para la pantalla y para
// cualquier cumplimiento (anillo, fila de días, línea semanal):
// { dayKey, day, trainingTime, meals }, donde `dayKey`/`day` son el día
// del plan cuyas comidas (y AJUSTE/HIDRATACION) se usan:
// - día sin franjas: todas sus comidas, trainingTime null (como antes);
// - con franja de entreno: las de esa franja más las comunes;
// - con "descanso" y comidas "Descanso - " en el día: esas más las comunes;
// - con "descanso" sin ellas (y si se puede, ver canChooseRestDay): el
//   menú DESCANSO entero, sin mezclar nada del día. Si no se puede (plan
//   sin menú DESCANSO), mediodía.
// computeDayCompliance(menu.day, eaten, menu.trainingTime) es su cumplimiento.
export function getDietMenu(plan, dayKey, chosenTime) {

    const day = plan?.days[dayKey] ?? null;
    if (!day) return { dayKey, day: null, trainingTime: null, meals: [] };

    if (!dayHasTrainingTimes(day)) return { dayKey, day, trainingTime: null, meals: getMealsForTrainingTime(day, null) };

    if (chosenTime === REST_TRAINING_TIME && dayHasRestMeals(day)) {
        return { dayKey, day, trainingTime: REST_TRAINING_TIME, meals: getMealsForTrainingTime(day, REST_TRAINING_TIME) };
    }

    if (chosenTime === REST_TRAINING_TIME && canChooseRestDay(plan, dayKey)) {
        const rest = plan.days[REST_DAY_KEY];
        return { dayKey: REST_DAY_KEY, day: rest, trainingTime: REST_TRAINING_TIME, meals: getMealsForTrainingTime(rest, REST_TRAINING_TIME) };
    }

    const trainingTime = chosenTime && chosenTime !== REST_TRAINING_TIME ? chosenTime : DEFAULT_TRAINING_TIME;

    return { dayKey, day, trainingTime, meals: getMealsForTrainingTime(day, trainingTime) };

}

// Cumplimiento de un día: comidas con alguna opción marcada sobre las
// comidas del día (HIDRATACION y AJUSTE no son comidas y no cuentan). Con
// franja, solo las de esa franja más las comunes (una comida de otra
// franja ni suma ni resta, aunque se marcara). Una marca de una opción que
// ya no existe en el plan (CSV reimportado sin ella) no cuenta. "descanso"
// es una franja más: sus comidas "Descanso - " más las comunes (o, si el
// día no tiene, `day` es el menú DESCANSO y cuentan todas las suyas). null si no hay día que
// contar. Para elegir day/franja de una fecha, getDietMenu().
export function computeDayCompliance(day, eaten, trainingTime = null) {

    const meals = getMealsForTrainingTime(day, trainingTime);
    if (!meals.length) return null;

    const total = meals.length;
    const done = meals.filter(meal => meal.options.some(o => o.key === eaten[meal.key])).length;

    return { done, total, percent: Math.round(done / total * 100) };

}

// Cumplimiento de UN día -- la única fuente de verdad para cualquier
// cumplimiento que no sea el del menú que se está pintando: la fila de la
// semana del anillo (getWeekCompliance), el histórico y la línea semanal
// de Composición (getWeekDietCompliance). Contra el plan con el que se
// marcó ese día; sin nada marcado, contra la dieta que estaba vigente esa
// fecha (la última importada ese día o antes -- importar otra conserva
// las anteriores). null si esa fecha no había ninguna dieta importada o
// es un fin de semana sin elegir (no hay menú con el que comparar).
export function getDayCompliance(date) {

    const record = checks.find(c => c.id === date);
    const plan = record
        ? plans.find(p => p.id === record.planId) ?? null
        : getDietPlans().find(p => formatISODate(new Date(p.importedAt)) <= date) ?? null;

    if (!plan) return null;

    const { dayKey } = resolveDietDay(date);
    if (!dayKey) return null;

    const menu = getDietMenu(plan, dayKey, getTrainingTimeForDate(date));

    return computeDayCompliance(menu.day, record?.eaten ?? {}, menu.trainingTime);

}

// Últimos `days` días hasta `today` (incluido), ver getDayCompliance().
export function getComplianceHistory(today, days = 7) {

    const history = [];

    for (let i = days - 1; i >= 0; i--) {

        const date = addDays(today, -i);
        history.push({ date, percent: getDayCompliance(date)?.percent ?? null });

    }

    return history;

}

// Cumplimiento de una semana (lunes `weekStart` a domingo) contando SOLO
// los días ya transcurridos (hasta `today` incluido): comidas marcadas
// sobre comidas del menú, sumando los días que tienen menú
// (getDayCompliance). Así un día con 6 comidas pesa más que uno con 2, y
// el total de la semana es el mismo "X de Y comidas" que el anillo, solo
// que sumado. null si ningún día transcurrido tenía menú -- nunca 0%.
export function getWeekDietCompliance(weekStart, today) {

    let done = 0;
    let total = 0;

    for (let i = 0; i < 7; i++) {

        const date = addDays(weekStart, i);
        if (date > today) break;

        const day = getDayCompliance(date);
        if (!day) continue;

        done += day.done;
        total += day.total;

    }

    return total ? { done, total, percent: Math.round(done / total * 100) } : null;

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

// Fila de días del anillo de cumplimiento: lunes a domingo de la semana de
// `date`, cada uno con su % (null si no hay menú con el que comparar) y si
// es futuro respecto a `today`.
export function getWeekCompliance(date, today) {

    const monday = getWeekStartDate(date);

    return Array.from({ length: 7 }, (_, i) => {

        const day = addDays(monday, i);

        return { date: day, percent: getDayCompliance(day)?.percent ?? null, future: day > today };

    });

}
