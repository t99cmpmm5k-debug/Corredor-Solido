import { STORES, getAll, put, remove } from "./db.js";
import { parseISODate, formatISODate, getWeekStartDate, getDayAbbreviation } from "../utils/date.js";
import { generateId } from "../utils/id.js";

const workouts = [];
const shoes = [];
const plannedSessions = [];

let hydrated = null;
let possibleDataLoss = false;

// Señal aparte de IndexedDB a propósito: si el motor de IndexedDB del
// navegador es el que falla o se vacía (sospecha real en iOS Safari), un
// flag guardado en la propia IndexedDB desaparecería con el resto — no
// serviría para detectar el borrado. localStorage es un almacén distinto.
const HAD_DATA_KEY = "corredor-solido-had-data";

function markHadData() {
    try {
        localStorage.setItem(HAD_DATA_KEY, "true");
    } catch {
        // Privado/cuota agotada — no es motivo para romper el guardado.
    }
}

function hadDataBefore() {
    try {
        return localStorage.getItem(HAD_DATA_KEY) === "true";
    } catch {
        return false;
    }
}

function todayMidnight() {

    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());

}

function upsertInto(list, storeName, record) {

    const index = list.findIndex(item => item.id === record.id);
    if (index === -1) list.push(record);
    else list[index] = record;

    return put(storeName, record).catch(() => {});

}

export function hydrate() {

    if (hydrated) return hydrated;

    hydrated = Promise.all([
        getAll(STORES.workouts),
        getAll(STORES.shoes),
        getAll(STORES.plannedSessions)
    ]).then(([loadedWorkouts, loadedShoes, loadedPlannedSessions]) => {

        workouts.push(...loadedWorkouts);
        shoes.push(...loadedShoes);
        plannedSessions.push(...loadedPlannedSessions);

        // Si antes hubo entrenos guardados (localStorage lo recuerda) y
        // ahora IndexedDB viene vacía, no es "primera vez" — es sospechoso
        // de que el navegador ha vaciado el almacenamiento por su cuenta.
        possibleDataLoss = workouts.length === 0 && hadDataBefore();

    }).catch(err => {

        console.warn("No se pudo cargar el almacenamiento local — la app sigue sin persistencia.", err);
        possibleDataLoss = hadDataBefore();

    });

    return hydrated;

}

// true si hubo entrenos guardados en algún momento y ahora no hay
// ninguno — señal de posible borrado del navegador, no de que el
// usuario nunca haya importado nada. Se calcula una vez en hydrate().
export function getPossibleDataLoss() {

    return possibleDataLoss;

}

// --- Lecturas ---

export function getWorkouts() {

    return workouts;

}

export function getShoes() {

    return shoes;

}

export function getPlannedSessions() {

    return plannedSessions;

}

export function getSessionsForDate(date) {

    return plannedSessions.filter(ps => ps.date === date);

}

// Sesiones semanales recurrentes (date:null + weekday por diseño, p. ej.
// una tabla de gimnasio importada de un PDF) — todavía no se muestran en
// ningún sitio de la UI (Plan/Home solo leen getCurrentWeekSessions(),
// que las ignora al no tener weekStartDate); este getter existe para
// poder verificar que se guardaron bien y como base de una fase futura
// que sí las muestre.
export function getRecurringSessions() {

    return plannedSessions.filter(ps => ps.date == null && ps.weekday != null);

}

export function getWorkoutForSession(sessionId) {

    return workouts.find(w => w.linkedSessionId === sessionId) || null;

}

export function getSessionStatus(sessionId) {

    const isCompleted = workouts.some(w => w.linkedSessionId === sessionId);
    if (isCompleted) return "completed";

    const session = plannedSessions.find(ps => ps.id === sessionId);
    if (!session) return "pending";

    return parseISODate(session.date) > todayMidnight() ? "upcoming" : "pending";

}

// Enriquece una plannedSession con 3 campos derivados, nunca inventados:
// day (para mostrar, se deriva de date — no todo origen lo trae ya),
// status (getSessionStatus ya existente) y volume (distanceKm si lo hay,
// 0 si no — misma semántica que un día de gimnasio/descanso sin
// distancia real que aportar al total semanal).
function withDerivedFields(session) {

    return {

        ...session,
        day: getDayAbbreviation(session.date),
        status: getSessionStatus(session.id),
        volume: session.distanceKm ?? 0

    };

}

export function getCurrentWeekSessions() {

    const currentWeekStart = getWeekStartDate(formatISODate(new Date()));

    return plannedSessions
        .filter(ps => ps.weekStartDate === currentWeekStart)
        .sort((a, b) => a.date.localeCompare(b.date) || a.slot - b.slot)
        .map(withDerivedFields);

}

// null si no hay ninguna sesión planificada hoy — a diferencia del viejo
// planData.js (que garantizaba una sesión por cada día de la semana), un
// plan importado no tiene por qué cubrir todos los días.
export function getTodaySession() {

    const sessions = getSessionsForDate(formatISODate(new Date()));
    if (sessions.length === 0) return null;

    return withDerivedFields(sessions[0]);

}

// Sustituye a getVolume() de planData.js: goal = suma de volume
// (distanceKm real) de toda la semana actual, completed = la parte de
// esa suma ya con status "completed".
export function getWeekVolume() {

    const sessions = getCurrentWeekSessions();

    const goal = sessions.reduce((sum, s) => sum + s.volume, 0);
    const completed = sessions
        .filter(s => s.status === "completed")
        .reduce((sum, s) => sum + s.volume, 0);

    return { completed, goal };

}

export function getShoeTotalKm(shoeId) {

    return workouts
        .filter(w => w.shoeId === shoeId)
        .reduce((sum, w) => sum + (w.distanceKm || 0), 0);

}

const SIMILAR_DISTANCE_TOLERANCE_KM = 0.1;
const SIMILAR_DURATION_TOLERANCE_SEC = 30;

// Misma fecha + distancia y duración a poca distancia entre sí — no exige
// coincidencia exacta (el mismo OCR puede leer un segundo distinto entre
// dos pasadas), pero dos carreras de verdad distintas casi nunca coinciden
// en las dos cosas a la vez. Si falta un dato en cualquiera de los dos
// lados, no se puede comparar con fiabilidad y no se marca como duplicado.
export function findSimilarWorkout(date, distanceKm, durationSec) {

    if (distanceKm == null || durationSec == null) return null;

    return workouts.find(w =>
        w.date === date &&
        w.distanceKm != null &&
        w.durationSec != null &&
        Math.abs(w.distanceKm - distanceKm) <= SIMILAR_DISTANCE_TOLERANCE_KM &&
        Math.abs(w.durationSec - durationSec) <= SIMILAR_DURATION_TOLERANCE_SEC
    ) || null;

}

// --- Escrituras ---

function findMatchingSessionId(date) {

    const candidates = plannedSessions.filter(ps => ps.date === date);
    return candidates.length === 1 ? candidates[0].id : null;

}

export function addWorkout(workoutInput) {

    const workout = {

        ...workoutInput,
        id: generateId(),
        linkedSessionId: findMatchingSessionId(workoutInput.date)

    };

    upsertInto(workouts, STORES.workouts, workout);
    markHadData();

    return workout;

}

export function deleteWorkout(id) {

    const index = workouts.findIndex(w => w.id === id);
    if (index === -1) return;

    workouts.splice(index, 1);
    remove(STORES.workouts, id).catch(() => {});

}

export function addShoe(shoeInput) {

    const shoe = {

        status: "active",
        ...shoeInput,
        id: generateId()

    };

    upsertInto(shoes, STORES.shoes, shoe);

    return shoe;

}

export function updateShoe(id, patch) {

    const shoe = shoes.find(s => s.id === id);
    if (!shoe) return null;

    Object.assign(shoe, patch);
    put(STORES.shoes, shoe).catch(() => {});

    return shoe;

}

// Asignación retroactiva del tipo de entrenamiento (easy/series/tempo/
// long/race) desde el detalle de una carrera ya guardada — sin
// reimportar. corrected:true igual que cuando se edita a mano en
// Revisar: en ambos casos el valor viene del usuario, no de la
// heurística de clasifyWorkoutType.js.
export function updateWorkoutType(id, type) {

    const workout = workouts.find(w => w.id === id);
    if (!workout) return null;

    workout.type = type;
    workout.fieldMeta = {
        ...(workout.fieldMeta || {}),
        type: { confidence: null, corrected: true }
    };

    put(STORES.workouts, workout).catch(() => {});

    return workout;

}

export function retireShoe(id) {

    return updateShoe(id, { status: "retired", retiredDate: formatISODate(new Date()) });

}

function sharedSessionFields(session) {

    return {
        type: session.type,
        title: session.title,
        distanceKm: session.distanceKm,
        durationSec: session.durationSec,
        targetPaceSecPerKm: session.targetPaceSecPerKm,
        targetHrZone: session.targetHrZone,
        description: session.description
    };

}

// Importación de un plan (ver src/importers/plan/): cada sesión ya trae su
// propia fecha, así que weekStartDate se deriva (lunes de esa semana) en
// vez de depender del weekStartDate fijo de planData.js. Mismo criterio de
// slot y de "sesión congelada" que syncPlanSnapshot, para no pisar una
// sesión que ya tiene un entreno real enlazado — pero mirando también las
// plannedSessions ya existentes en memoria (no solo el lote importado), no
// solo las que trae este propio import.
//
// Una sesión puede venir sin fecha A PROPÓSITO (date:null + weekday, p. ej.
// una tabla de gimnasio semanal de un PDF — "los lunes, en general...", no
// una fecha real) — no es lo mismo que "no se pudo determinar la fecha".
// No tiene weekStartDate (no hay fecha de la que derivarlo) ni puede
// "congelarse" (no hay fecha con la que un entreno real pueda enlazarse),
// así que usa su propia clave de deduplicado, por weekday en vez de por
// date.
export function importPlannedSessions(sessions) {

    const slotByDate = {};
    const slotByWeekday = {};
    const writes = [];
    let written = 0;
    let skippedFrozen = 0;

    sessions.forEach(session => {

        const isRecurring = session.date == null && session.weekday != null;

        if (isRecurring) {

            const slot = slotByWeekday[session.weekday] ?? 0;
            slotByWeekday[session.weekday] = slot + 1;

            const existing = plannedSessions.find(
                ps => ps.date == null && ps.weekday === session.weekday && ps.slot === slot
            );

            const record = {
                id: existing ? existing.id : generateId(),
                date: null,
                weekday: session.weekday,
                slot,
                weekStartDate: null,
                ...sharedSessionFields(session)
            };

            writes.push(upsertInto(plannedSessions, STORES.plannedSessions, record));
            written += 1;

            return;

        }

        const slot = slotByDate[session.date] ?? 0;
        slotByDate[session.date] = slot + 1;

        const existing = plannedSessions.find(
            ps => ps.date === session.date && ps.slot === slot
        );

        const isFrozen = existing &&
            workouts.some(w => w.linkedSessionId === existing.id);

        if (isFrozen) {
            skippedFrozen += 1;
            return;
        }

        const record = {
            id: existing ? existing.id : generateId(),
            date: session.date,
            slot,
            weekStartDate: getWeekStartDate(session.date),
            ...sharedSessionFields(session)
        };

        writes.push(upsertInto(plannedSessions, STORES.plannedSessions, record));
        written += 1;

    });

    return Promise.all(writes).then(() => ({ written, skippedFrozen }));

}

// --- Restauración desde backup (conserva el id original del registro) ---

export function restoreWorkout(workout) {

    markHadData();
    return upsertInto(workouts, STORES.workouts, workout);

}

export function restoreShoe(shoe) {

    return upsertInto(shoes, STORES.shoes, shoe);

}

export function restorePlannedSession(session) {

    return upsertInto(plannedSessions, STORES.plannedSessions, session);

}
