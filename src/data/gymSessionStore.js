import { STORES, getAll, put } from "./db.js";
import { generateId } from "../utils/id.js";
import { formatISODate } from "../utils/date.js";
import { getGymDay } from "./gymData.js";

const sessions = [];

let hydrated = null;

function upsertInto(session) {

    const index = sessions.findIndex(s => s.id === session.id);
    if (index === -1) sessions.push(session);
    else sessions[index] = session;

    return put(STORES.gymSessions, session).catch(() => {});

}

export function hydrate() {

    if (hydrated) return hydrated;

    hydrated = getAll(STORES.gymSessions).then(loaded => {

        sessions.push(...loaded);

    }).catch(err => {

        console.warn("No se pudo cargar el histórico de gimnasio — la app sigue sin persistencia.", err);

    });

    return hydrated;

}

export function getGymSessions() {

    return sessions;

}

// Primer número que aparece en la cifra de la tabla ("6-8" → 6,
// "40-60s" → 40) — punto de partida de cada serie nueva.
function firstNumber(text) {

    const match = String(text).match(/\d+/);
    return match ? Number(match[0]) : null;

}

function buildInitialSets(exercise) {

    const reps = firstNumber(exercise.targetReps);

    // Cada serie parte del peso de ESA MISMA serie la última vez (pirámide:
    // serie 1 con la serie 1, serie 2 con la serie 2...), no de un único
    // valor repetido en las 4 — ver getLastLoggedSetWeight más abajo.
    return Array.from({ length: exercise.sets }, (_, index) => ({
        weight: getLastLoggedSetWeight(exercise.id, index) ?? exercise.targetWeight,
        reps,
        done: false
    }));

}

export function startSession(dayId) {

    const today = formatISODate(new Date());

    // Si ya hay una sesión de hoy para este día, se retoma siempre —
    // "Guardar sesión" es un checkpoint, no un cierre: entrar dos veces al
    // mismo día el mismo día de calendario debe seguir donde lo dejaste,
    // haya pulsado "Guardar sesión" o no. Antes esto excluía las sesiones
    // con finishedAt, así que en cuanto guardabas una vez, la siguiente
    // entrada creaba una sesión nueva y "olvidaba" todo lo registrado.
    const existing = sessions.find(s => s.dayId === dayId && s.date === today);

    if (existing) return existing;

    const day = getGymDay(dayId);
    if (!day) return null;

    const session = {

        id: generateId(),
        date: today,
        dayId,
        finishedAt: null,

        exercises: day.exercises.map(exercise => ({
            exerciseId: exercise.id,
            name: exercise.name,
            sets: buildInitialSets(exercise)
        }))

    };

    upsertInto(session);

    return session;

}

export function getSessionById(id) {

    return sessions.find(s => s.id === id) || null;

}

export function updateSet(sessionId, exerciseId, setIndex, patch) {

    const session = getSessionById(sessionId);
    if (!session) return null;

    const exercise = session.exercises.find(e => e.exerciseId === exerciseId);
    if (!exercise || !exercise.sets[setIndex]) return null;

    Object.assign(exercise.sets[setIndex], patch);

    upsertInto(session);

    return session;

}

export function finishSession(sessionId) {

    const session = getSessionById(sessionId);
    if (!session) return null;

    session.finishedAt = new Date().toISOString();

    upsertInto(session);

    return session;

}

// Peso de ESA MISMA serie (por índice) la última vez que se hizo — para
// prerellenar pirámides (65/70/72,5/75) con el número correcto en cada
// fila, no un único valor repetido. Si la sesión más reciente no llegó a
// marcar esa serie concreta como hecha, se sigue mirando hacia atrás por
// si una sesión anterior sí la tiene, antes de rendirse.
export function getLastLoggedSetWeight(exerciseId, setIndex) {

    const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));

    for (const session of sorted) {

        const exercise = session.exercises.find(e => e.exerciseId === exerciseId);
        if (!exercise) continue;

        const set = exercise.sets[setIndex];
        if (set && set.done && set.weight != null) return set.weight;

    }

    return null;

}

// Peso de la ÚLTIMA serie hecha de la sesión más reciente que tocó este
// ejercicio — usado solo para el badge "Última vez" (un valor de un
// vistazo), no para prerellenar series (ver getLastLoggedSetWeight).
export function getLastLoggedWeight(exerciseId) {

    const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));

    for (const session of sorted) {

        const exercise = session.exercises.find(e => e.exerciseId === exerciseId);
        if (!exercise) continue;

        const doneSets = exercise.sets.filter(s => s.done && s.weight != null);
        if (doneSets.length) return doneSets[doneSets.length - 1].weight;

    }

    return null;

}
