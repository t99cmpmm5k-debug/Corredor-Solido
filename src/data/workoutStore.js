import { STORES, getAll, put } from "./db.js";
import { week, weekStartDate } from "./planData.js";
import { parseISODate, formatISODate } from "../utils/date.js";

const workouts = [];
const shoes = [];
const plannedSessions = [];

let hydrated = null;

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

            id: existing ? existing.id : crypto.randomUUID(),
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

        return syncPlanSnapshot();

    }).catch(err => {

        console.warn("No se pudo cargar el almacenamiento local — la app sigue sin persistencia.", err);

    });

    return hydrated;

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

// --- Escrituras ---

function findMatchingSessionId(date) {

    const candidates = plannedSessions.filter(ps => ps.date === date);
    return candidates.length === 1 ? candidates[0].id : null;

}

export function addWorkout(workoutInput) {

    const workout = {

        ...workoutInput,
        id: crypto.randomUUID(),
        linkedSessionId: findMatchingSessionId(workoutInput.date)

    };

    upsertInto(workouts, STORES.workouts, workout);

    return workout;

}

export function addShoe(shoeInput) {

    const shoe = {

        status: "active",
        ...shoeInput,
        id: crypto.randomUUID()

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

export function retireShoe(id) {

    return updateShoe(id, { status: "retired", retiredDate: formatISODate(new Date()) });

}

// --- Restauración desde backup (conserva el id original del registro) ---

export function restoreWorkout(workout) {

    return upsertInto(workouts, STORES.workouts, workout);

}

export function restoreShoe(shoe) {

    return upsertInto(shoes, STORES.shoes, shoe);

}

export function restorePlannedSession(session) {

    return upsertInto(plannedSessions, STORES.plannedSessions, session);

}
