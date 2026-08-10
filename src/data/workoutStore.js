import { STORES, getAll, put, remove } from "./db.js";
import { week, weekStartDate } from "./planData.js";
import { parseISODate, formatISODate } from "../utils/date.js";
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

function syncPlanSnapshot() {

    const slotByDate = {};
    const writes = [];

    week.forEach(session => {

        const slot = slotByDate[session.date] ?? 0;
        slotByDate[session.date] = slot + 1;

        const existing = plannedSessions.find(
            ps => ps.date === session.date && ps.slot === slot
        );

        const isFrozen = existing &&
            workouts.some(w => w.linkedSessionId === existing.id);

        if (isFrozen) return;

        const record = {

            id: existing ? existing.id : generateId(),
            date: session.date,
            slot,
            weekStartDate,

            day: session.day,
            type: session.type,
            title: session.title,
            subtitle: session.subtitle,
            heroType: session.heroType,
            volume: session.volume,
            load: session.load,
            metrics: session.metrics,
            description: session.description,
            details: session.details

        };

        writes.push(upsertInto(plannedSessions, STORES.plannedSessions, record));

    });

    return Promise.all(writes);

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

        return syncPlanSnapshot();

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
