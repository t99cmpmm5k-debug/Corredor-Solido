import { STORES, getAll, put, remove } from "./db.js";
import { generateId } from "../utils/id.js";
import { formatISODate } from "../utils/date.js";
import { getGymDay } from "./gymRoutineStore.js";

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
        startedAt: new Date().toISOString(),
        finishedAt: null,
        durationSec: null,
        durationUnreliable: false,

        exercises: day.exercises.map(exercise => ({
            exerciseId: exercise.id,
            name: exercise.name,
            sets: buildInitialSets(exercise),
            notes: ""
        }))

    };

    upsertInto(session);

    return session;

}

export function getSessionById(id) {

    return sessions.find(s => s.id === id) || null;

}

export function deleteSession(id) {

    const index = sessions.findIndex(s => s.id === id);
    if (index === -1) return;

    sessions.splice(index, 1);

    remove(STORES.gymSessions, id).catch(() => {});

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

export function updateExerciseNotes(sessionId, exerciseId, notes) {

    const session = getSessionById(sessionId);
    if (!session) return null;

    const exercise = session.exercises.find(e => e.exerciseId === exerciseId);
    if (!exercise) return null;

    exercise.notes = notes;

    upsertInto(session);

    return session;

}

// Tope razonable para lo que puede durar un entrenamiento de verdad —
// primer paso hacia el entrenador de carga (ACWR): la duración real es la
// unidad común entre Running y Gimnasio, pero solo sirve si es de fiar.
// Por encima de esto no es "una sesión larga", es la app cerrada a medio
// entrenamiento (pantalla bloqueada, el móvil se quedó sin batería...) y
// reanudada horas después vía el "checkpoint" de startSession() — mejor no
// guardar ningún número que fingir que esas horas fueron entrenamiento.
const MAX_REASONABLE_SESSION_DURATION_SEC = 4 * 60 * 60;

// null+unreliable si no hay startedAt que fiarse (sesión previa a este
// cambio, aunque hoy ya no debería poder pasar por finishSession sin él),
// si el reloj da una duración negativa, o si supera el tope de arriba.
function computeDuration(startedAtIso, finishedAtIso) {

    if (!startedAtIso) return { durationSec: null, durationUnreliable: false };

    const seconds = Math.round((new Date(finishedAtIso) - new Date(startedAtIso)) / 1000);

    if (seconds < 0 || seconds > MAX_REASONABLE_SESSION_DURATION_SEC) {
        return { durationSec: null, durationUnreliable: true };
    }

    return { durationSec: seconds, durationUnreliable: false };

}

export function finishSession(sessionId) {

    const session = getSessionById(sessionId);
    if (!session) return null;

    const finishedAt = new Date().toISOString();
    const { durationSec, durationUnreliable } = computeDuration(session.startedAt, finishedAt);

    session.finishedAt = finishedAt;
    session.durationSec = durationSec;
    session.durationUnreliable = durationUnreliable;

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

// Serie temporal real para el mini-gráfico de progreso: una sesión (con
// al menos una serie marcada como hecha) aporta un punto, con el peso
// máximo entre sus series hechas ("mejor serie" de esa sesión) — no la
// media ni la última, para que el punto represente lo más exigente que se
// levantó ese día. Solo sesiones con dato real; nada interpolado.
//
// excludeSessionId excluye la sesión en curso: sin esto, marcar la
// primera serie de hoy como hecha convertía la propia sesión activa en su
// "mejor serie anterior" — un badge que se supone habla del pasado
// mostrando algo que acabas de hacer hace un segundo.
export function getExerciseHistory(exerciseId, { limit = 8, excludeSessionId = null } = {}) {

    const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
    const points = [];

    for (const session of sorted) {

        if (session.id === excludeSessionId) continue;

        const exercise = session.exercises.find(e => e.exerciseId === exerciseId);
        if (!exercise) continue;

        const doneWeights = exercise.sets
            .filter(s => s.done && s.weight != null)
            .map(s => s.weight);

        if (!doneWeights.length) continue;

        points.push({ date: session.date, weight: Math.max(...doneWeights) });

    }

    return points.slice(-limit);

}

// Histórico completo (sin tope) para la pantalla de detalle de ejercicio
// (Fase 4) — a diferencia de getExerciseHistory(), que solo saca el mejor
// peso de cada sesión para el mini-gráfico, aquí hace falta cada serie
// hecha (peso, reps) para poder construir la tabla de HISTORIAL, el
// desglose por fila y el volumen (peso×reps sumado) de cada sesión.
// excludeSessionId con el mismo motivo que en getExerciseHistory: la
// sesión en curso no cuenta como "historial" todavía.
//
// No se lee/expone `rir` aquí aunque una sesión antigua todavía lo tenga
// guardado en IndexedDB (campo retirado de la interfaz, no de los datos
// históricos ya guardados) — este es el único sitio por el que ese dato
// llegaba a la UI, así que basta con dejar de mapearlo.
export function getExerciseSessionHistory(exerciseId, { excludeSessionId = null } = {}) {

    const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
    const history = [];

    for (const session of sorted) {

        if (session.id === excludeSessionId) continue;

        const exercise = session.exercises.find(e => e.exerciseId === exerciseId);
        if (!exercise) continue;

        const doneSets = exercise.sets.filter(s => s.done && s.weight != null && s.reps != null);
        if (!doneSets.length) continue;

        history.push({
            sessionId: session.id,
            date: session.date,
            sets: doneSets.map(({ weight, reps }) => ({ weight, reps })),
            bestWeight: Math.max(...doneSets.map(s => s.weight)),
            volume: doneSets.reduce((sum, s) => sum + s.weight * s.reps, 0)
        });

    }

    return history;

}
