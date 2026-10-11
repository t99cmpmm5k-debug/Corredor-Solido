import { STORES, getAll, put, remove } from "./db.js";
import { generateId } from "../utils/id.js";
import { formatISODate } from "../utils/date.js";
import { getGymDay, getRoutines } from "./gymRoutineStore.js";
import { notifyDataChanged } from "./changeEvents.js";
import { recordTombstone } from "./tombstoneStore.js";

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

// Restauración desde backup (conserva el id original del registro) --
// mismo patrón que restoreWorkout()/restoreShoe() en workoutStore.js.
// upsertInto() ya hace put-por-id (inserta o reemplaza), así que
// reimportar el mismo backup dos veces no duplica nada.
export function restoreGymSession(session) {

    return upsertInto(session);

}

// Duración media REAL (segundos) de las últimas `limit` sesiones ya
// terminadas de ese dayId concreto -- para GymTodayCard.js, que necesita
// mostrar "~45 min" en un día que todavía no se ha empezado hoy. Nunca
// una estimación inventada: null si no hay ningún historial real de ese
// día (durationUnreliable descarta sesiones con reloj poco fiable, ver
// computeDuration() más abajo -- mismo criterio que el resto de la app,
// mejor omitir el dato que mostrar uno dudoso).
export function getAverageDurationForDay(dayId, { limit = 5 } = {}) {

    const finished = sessions
        .filter(s => s.dayId === dayId && s.finishedAt && s.durationSec != null && !s.durationUnreliable)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, limit);

    if (!finished.length) return null;

    const avgSec = finished.reduce((sum, s) => sum + s.durationSec, 0) / finished.length;

    return Math.round(avgSec);

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
        weight: getLastLoggedSetWeight(exercise.id, index, { name: exercise.name }) ?? exercise.targetWeight,
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
    notifyDataChanged();

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
    recordTombstone("gymSessions", id);
    notifyDataChanged();

}

export function updateSet(sessionId, exerciseId, setIndex, patch) {

    const session = getSessionById(sessionId);
    if (!session) return null;

    const exercise = session.exercises.find(e => e.exerciseId === exerciseId);
    if (!exercise || !exercise.sets[setIndex]) return null;

    Object.assign(exercise.sets[setIndex], patch);

    upsertInto(session);
    notifyDataChanged();

    return session;

}

export function updateExerciseNotes(sessionId, exerciseId, notes) {

    const session = getSessionById(sessionId);
    if (!session) return null;

    const exercise = session.exercises.find(e => e.exerciseId === exerciseId);
    if (!exercise) return null;

    exercise.notes = notes;

    upsertInto(session);
    notifyDataChanged();

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
    notifyDataChanged();

    return session;

}

/*==========================
   EMPAREJADO DE EJERCICIOS ENTRE SESIONES
==========================*/

// Bug real (2026-10-11, "no puedo ver los pesos que he subido"): todo el
// historial emparejaba SOLO por exerciseId, que es el id aleatorio del
// ejercicio dentro de UNA rutina concreta (ver addExerciseToDay() en
// gymRoutineBuilderStore.js). El mismo ejercicio en otra rutina, o en una
// rutina borrada y vuelta a crear, tiene otro id -- "Anterior" salía vacío
// aunque la sesión real estuviera guardada. Ahora se empareja por id y, si
// no hay, por nombre normalizado (sin mayúsculas, tildes ni espacios de
// sobra) -- el nombre ya se guarda en cada sesión desde la primera versión,
// no hace falta cambiar el formato. Igualdad exacta tras normalizar: "Hip
// Thrust" y "Hip Thrust ligero" siguen siendo ejercicios distintos.
export function normalizeExerciseName(name) {

    return String(name ?? "")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

}

// Nombre de un ejercicio a partir de su id: primero en las rutinas
// guardadas, y si la rutina ya no existe, en cualquier sesión que lo
// tenga -- así las llamadas que solo conocen el id (las de siempre)
// también ganan el emparejado por nombre sin tener que pasarlo.
function resolveExerciseName(exerciseId, name) {

    if (name) return name;

    for (const routine of getRoutines()) {

        for (const day of routine.days || []) {

            const exercise = (day.exercises || []).find(e => e.id === exerciseId);
            if (exercise?.name) return exercise.name;

        }

    }

    for (const session of sessions) {

        const exercise = (session.exercises || []).find(e => e.exerciseId === exerciseId);
        if (exercise?.name) return exercise.name;

    }

    return null;

}

// El ejercicio de una sesión que corresponde a (exerciseId, name): por id
// si está, si no por nombre normalizado. Defensivo con sesiones antiguas
// (sin exercises/sets): nunca rompe, simplemente no encuentra nada.
export function findSessionExercise(session, exerciseId, name = null) {

    const exercises = Array.isArray(session?.exercises) ? session.exercises : [];

    const byId = exercises.find(e => e.exerciseId === exerciseId);
    if (byId) return byId;

    const key = normalizeExerciseName(name);
    if (!key) return null;

    return exercises.find(e => normalizeExerciseName(e.name) === key) || null;

}

function setsOf(exercise) {

    return Array.isArray(exercise?.sets) ? exercise.sets : [];

}

function doneSetsOf(exercise) {

    return setsOf(exercise)
        .filter(set => set && set.done)
        .map(set => ({ weight: set.weight ?? null, reps: set.reps ?? null }));

}

// Más reciente primero. Dos sesiones el mismo día (dos rutinas distintas):
// desempata la hora de inicio, si la hay.
function compareNewestFirst(a, b) {

    return String(b.date ?? "").localeCompare(String(a.date ?? ""))
        || String(b.startedAt ?? "").localeCompare(String(a.startedAt ?? ""));

}

// Cada sesión (más reciente primero) que contiene ese ejercicio, con el
// ejercicio ya emparejado.
function exerciseOccurrences(exerciseId, { name = null, excludeSessionId = null } = {}) {

    const resolvedName = resolveExerciseName(exerciseId, name);

    return [...sessions]
        .sort(compareNewestFirst)
        .filter(session => session.id !== excludeSessionId)
        .map(session => ({ session, exercise: findSessionExercise(session, exerciseId, resolvedName) }))
        .filter(occurrence => occurrence.exercise);

}

// Peso de ESA MISMA serie (por índice) la última vez que se hizo — para
// prerellenar pirámides (65/70/72,5/75) con el número correcto en cada
// fila, no un único valor repetido. Si la sesión más reciente no llegó a
// marcar esa serie concreta como hecha, se sigue mirando hacia atrás por
// si una sesión anterior sí la tiene, antes de rendirse.
export function getLastLoggedSetWeight(exerciseId, setIndex, { name = null } = {}) {

    for (const { exercise } of exerciseOccurrences(exerciseId, { name })) {

        const set = setsOf(exercise)[setIndex];
        if (set && set.done && set.weight != null) return set.weight;

    }

    return null;

}

// Serie completa (peso Y reps) de ESA MISMA serie (por índice) la última
// vez que se hizo -- misma búsqueda que getLastLoggedSetWeight() de arriba,
// pero devolviendo también las reps.
//
// excludeSessionId: a diferencia de getLastLoggedSetWeight() (solo se
// llama al CREAR una sesión nueva, antes de que exista en `sessions`),
// esta función puede llamarse con una sesión YA en curso -- sin excluirla,
// se compararía consigo misma.
export function getLastLoggedSet(exerciseId, setIndex, { excludeSessionId = null, name = null } = {}) {

    for (const { exercise } of exerciseOccurrences(exerciseId, { name, excludeSessionId })) {

        const set = setsOf(exercise)[setIndex];
        if (set && set.done && set.weight != null) return { weight: set.weight, reps: set.reps };

    }

    return null;

}

// La última sesión REAL con ese ejercicio (al menos una serie hecha) --
// para la columna "Anterior" de la sesión en curso: cada fila enseña la
// serie con el mismo índice de ESA sesión (null si esa serie no se hizo),
// sin mezclar series de sesiones distintas, y la cabecera su fecha.
// Incluye ejercicios sin peso (plancha, core...): weight null, solo reps.
export function getLastExerciseSession(exerciseId, { name = null, excludeSessionId = null } = {}) {

    for (const { session, exercise } of exerciseOccurrences(exerciseId, { name, excludeSessionId })) {

        if (!doneSetsOf(exercise).length) continue;

        return {
            sessionId: session.id,
            date: session.date,
            sets: setsOf(exercise).map(set => (set && set.done ? { weight: set.weight ?? null, reps: set.reps ?? null } : null))
        };

    }

    return null;

}

// Hoja de historial de un ejercicio (toque en su nombre durante la
// sesión): las últimas `limit` sesiones con series hechas (más reciente
// primero, cada serie kg × reps) y el mejor peso de TODO el historial,
// no solo de esas `limit`. Nada de 1RM ni tonelaje -- solo lo guardado.
export function getExerciseLog(exerciseId, { name = null, excludeSessionId = null, limit = 5 } = {}) {

    const entries = [];
    let best = null;

    for (const { session, exercise } of exerciseOccurrences(exerciseId, { name, excludeSessionId })) {

        const sets = doneSetsOf(exercise);
        if (!sets.length) continue;

        if (entries.length < limit) entries.push({ sessionId: session.id, date: session.date, sets });

        for (const set of sets) {
            if (set.weight != null && (best === null || set.weight > best.weight)) {
                best = { weight: set.weight, reps: set.reps, date: session.date };
            }
        }

    }

    return { entries, best };

}

// Valor más repetido de una lista de reps -- para resumir una sesión con
// alguna serie irregular ("4×6" aunque una serie se cortase en 5) sin
// inventar un promedio que nadie hizo de verdad. Empate: gana el primero
// que aparece.
function modeOfReps(values) {

    const counts = new Map();
    let best = values[0];
    let bestCount = 0;

    for (const value of values) {

        const count = (counts.get(value) || 0) + 1;
        counts.set(value, count);

        if (count > bestCount) {
            bestCount = count;
            best = value;
        }

    }

    return best;

}

// Resumen de la sesión anterior REAL de un ejercicio -- para la tarjeta de
// "ejercicio completado" y el resumen final. null si no hay ninguna sesión
// pasada con datos.
export function getPreviousExerciseSummary(exerciseId, { excludeSessionId = null, name = null } = {}) {

    const history = getExerciseSessionHistory(exerciseId, { excludeSessionId, name });
    if (!history.length) return null;

    const last = history[history.length - 1];

    return {
        date: last.date,
        setsCount: last.sets.length,
        reps: modeOfReps(last.sets.map(s => s.reps)),
        weight: last.bestWeight
    };

}

// Serie temporal real para el mini-gráfico de progreso: una sesión (con
// al menos una serie marcada como hecha) aporta un punto, con el peso
// máximo entre sus series hechas ("mejor serie" de esa sesión). Solo
// sesiones con dato real; nada interpolado. Orden cronológico.
//
// excludeSessionId excluye la sesión en curso: sin esto, marcar la
// primera serie de hoy convertía la propia sesión activa en su "mejor
// serie anterior".
export function getExerciseHistory(exerciseId, { limit = 8, excludeSessionId = null, name = null } = {}) {

    const points = [];

    for (const { session, exercise } of exerciseOccurrences(exerciseId, { name, excludeSessionId }).reverse()) {

        const doneWeights = setsOf(exercise)
            .filter(s => s && s.done && s.weight != null)
            .map(s => s.weight);

        if (!doneWeights.length) continue;

        points.push({ date: session.date, weight: Math.max(...doneWeights) });

    }

    return points.slice(-limit);

}

// Histórico completo (orden cronológico) con cada serie hecha (peso, reps)
// de cada sesión. No se lee/expone `rir` aunque una sesión antigua todavía
// lo tenga guardado en IndexedDB (campo retirado de la interfaz, no de los
// datos históricos ya guardados).
export function getExerciseSessionHistory(exerciseId, { excludeSessionId = null, name = null } = {}) {

    const history = [];

    for (const { session, exercise } of exerciseOccurrences(exerciseId, { name, excludeSessionId }).reverse()) {

        const doneSets = setsOf(exercise).filter(s => s && s.done && s.weight != null && s.reps != null);
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

/*==========================
   HISTORIAL DE ENTRENOS (Rutinas → "Entrenos hechos")
==========================*/

// Una sesión tal cual está guardada, reducida a lo que se ve en el
// historial: solo ejercicios con al menos una serie hecha, cada serie
// kg × reps (weight null en ejercicios sin peso). Abrir un día ya crea
// una sesión vacía (ver startSession()), así que una sesión sin ninguna
// serie hecha no es un "entreno hecho" -- setCount 0 y se filtra fuera.
export function summarizeGymSession(session) {

    const exercises = (Array.isArray(session?.exercises) ? session.exercises : [])
        .map(exercise => ({
            exerciseId: exercise.exerciseId ?? null,
            name: exercise.name || "Ejercicio",
            sets: doneSetsOf(exercise)
        }))
        .filter(exercise => exercise.sets.length);

    return {
        id: session.id,
        date: session.date,
        dayId: session.dayId ?? null,
        exercises,
        exerciseCount: exercises.length,
        setCount: exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0)
    };

}

// Entrenos hechos, más reciente primero (sin tope: la sección de Rutinas
// corta a 3, el historial completo los quiere todos).
export function getCompletedGymSessions() {

    return [...sessions]
        .sort(compareNewestFirst)
        .map(summarizeGymSession)
        .filter(summary => summary.setCount > 0);

}
