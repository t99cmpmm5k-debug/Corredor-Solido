import { STORES, getAll, put, remove } from "./db.js";
import { parseISODate, formatISODate, getWeekStartDate, getDayAbbreviation } from "../utils/date.js";
import { generateId } from "../utils/id.js";

const workouts = [];
const shoes = [];
const plannedSessions = [];
const plannedRaces = [];

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
        getAll(STORES.plannedSessions),
        getAll(STORES.plannedRaces)
    ]).then(([loadedWorkouts, loadedShoes, loadedPlannedSessions, loadedPlannedRaces]) => {

        workouts.push(...loadedWorkouts);
        shoes.push(...loadedShoes);
        plannedSessions.push(...loadedPlannedSessions);
        plannedRaces.push(...loadedPlannedRaces);

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

export function getPlannedRaces() {

    return plannedRaces;

}

// Solo las que aún no han pasado — "de hoy en adelante", igual que
// getSessionStatus() considera "upcoming" una sesión con fecha futura.
// No filtra por si ya existe un workout real ese día: enlazar una carrera
// planificada con su entreno importado es una heurística que no se ha
// pedido, de momento son dos registros independientes (ver CLAUDE.md).
export function getUpcomingPlannedRaces() {

    const today = todayMidnight();

    return plannedRaces
        .filter(r => r.date && parseISODate(r.date) >= today)
        .sort((a, b) => a.date.localeCompare(b.date));

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

// Por id en vez de por fecha+semana: el timeline de Plan reutiliza este
// mismo componente dentro del selector de día de Home (ver SessionCard.js),
// donde "la semana" no tiene por qué coincidir con la que esté navegando
// Plan en ese momento — el id no depende de en qué semana se pintó.
export function getSessionById(id) {

    const session = plannedSessions.find(ps => ps.id === id);
    return session ? withDerivedFields(session) : null;

}

export function getWeekSessions(weekStartDate) {

    return plannedSessions
        .filter(ps => ps.weekStartDate === weekStartDate)
        .sort((a, b) => a.date.localeCompare(b.date) || a.slot - b.slot)
        .map(withDerivedFields);

}

export function getCurrentWeekSessions() {

    return getWeekSessions(getWeekStartDate(formatISODate(new Date())));

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

// Borra solo la sesión PLANIFICADA, nunca el entreno real — son dos
// registros en dos stores distintos. Si esta sesión ya tenía un
// entreno real enlazado, ese entreno se queda tal cual en el
// histórico de Running; su linkedSessionId se queda apuntando a un id
// que ya no existe (huérfano, inofensivo — nada lo vuelve a buscar
// desde ese lado, getWorkoutForSession/getSessionStatus solo
// consultan desde plannedSessions hacia workouts, nunca al revés).
export function deletePlannedSession(id) {

    const index = plannedSessions.findIndex(ps => ps.id === id);
    if (index === -1) return;

    plannedSessions.splice(index, 1);
    remove(STORES.plannedSessions, id).catch(() => {});

}

// Deshacer una importación entera de una sentada — borra todas las
// sesiones que quedaron marcadas con ese importBatchId (ver
// importPlannedSessions). Las que esa importación se saltó por estar
// "congeladas" (ya con entreno real enlazado) nunca tomaron el
// batchId nuevo, así que quedan fuera y no se tocan.
export function deletePlannedSessionsByBatch(batchId) {

    const toDelete = plannedSessions.filter(ps => ps.importBatchId === batchId);

    toDelete.forEach(session => deletePlannedSession(session.id));

    return toDelete.length;

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

// Asignación retroactiva de zapatilla desde el detalle de una carrera ya
// guardada — el caso normal es asignarla más tarde, no en el momento de
// guardar. A diferencia de updateWorkoutType(), shoeId nunca vino de OCR
// ni de un clasificador (siempre fue una elección del usuario), así que
// no hay fieldMeta que tocar aquí. getShoeTotalKm() suma sobre este mismo
// array en memoria en cada llamada, sin caché — el kilometraje de la
// zapatilla queda al día solo con este cambio, sin trabajo extra.
export function updateWorkoutShoe(id, shoeId) {

    const workout = workouts.find(w => w.id === id);
    if (!workout) return null;

    workout.shoeId = shoeId;

    put(STORES.workouts, workout).catch(() => {});

    return workout;

}

export function retireShoe(id) {

    return updateShoe(id, { status: "retired", retiredDate: formatISODate(new Date()) });

}

// Mover una sesión planificada a otro día (misma semana o distinta) —
// weekStartDate se recalcula siempre desde la nueva fecha, nunca se
// arrastra el valor viejo (si no, una sesión movida a otra semana
// seguiría apareciendo en la semana original). slot se reasigna al
// final de los que ya hubiera ese día destino, para no chocar con su
// propio slot de origen si por casualidad coincidiera.
// Una sesión con entreno real enlazado (status "completed") no se
// puede mover — ya ocurrió en una fecha real; el botón "Mover" ya se
// oculta para ese caso, esto es la misma regla del lado de los datos.
export function movePlannedSession(id, newDate) {

    const session = plannedSessions.find(ps => ps.id === id);
    if (!session) return null;

    if (workouts.some(w => w.linkedSessionId === id)) return null;

    const slot = plannedSessions.filter(ps => ps.date === newDate && ps.id !== id).length;

    session.date = newDate;
    session.weekStartDate = getWeekStartDate(newDate);
    session.slot = slot;

    put(STORES.plannedSessions, session).catch(() => {});

    return session;

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

    // Una por llamada, no por sesión — es lo que agrupa "todo lo que
    // trajo este archivo" para poder deshacerlo de una vez (ver
    // deletePlannedSessionsByBatch). Una sesión "congelada" (existing +
    // isFrozen más abajo) nunca se reescribe, así que se queda con el
    // batchId de cuando de verdad se creó — reimportar el mismo plan
    // desplaza el batchId de las que sí se actualizan hacia esta
    // importación, que es la que "deshacer" debe deshacer.
    const batchId = generateId();

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
                importBatchId: batchId,
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
            importBatchId: batchId,
            ...sharedSessionFields(session)
        };

        writes.push(upsertInto(plannedSessions, STORES.plannedSessions, record));
        written += 1;

    });

    return Promise.all(writes).then(() => ({ written, skippedFrozen, batchId }));

}

// Borra una carrera planificada (calendario de Carreras) — no toca ningún
// workout real, son dos stores distintos igual que deletePlannedSession()
// frente a workouts.
export function deletePlannedRace(id) {

    const index = plannedRaces.findIndex(r => r.id === id);
    if (index === -1) return;

    plannedRaces.splice(index, 1);
    remove(STORES.plannedRaces, id).catch(() => {});

}

// Deshacer una importación entera de una sentada — mismo patrón que
// deletePlannedSessionsByBatch().
export function deletePlannedRacesByBatch(batchId) {

    const toDelete = plannedRaces.filter(r => r.importBatchId === batchId);

    toDelete.forEach(race => deletePlannedRace(race.id));

    return toDelete.length;

}

// Importación de un calendario de carreras (ver src/importers/races/) —
// dedupe por fecha+nombre: reimportar el mismo archivo actualiza las
// carreras ya guardadas en vez de duplicarlas, igual que
// importPlannedSessions() dedupe por fecha+slot.
//
// "region" es la excepción a "el archivo manda": no es un campo que el
// wizard deje editar ni que todos los archivos traigan (los dos primeros
// calendarios de Murcia no lo llevan, se etiquetaron por la migración de
// db.js) — si el archivo entrante no trae region, reimportarlo NO debe
// borrar la que ya tuviera guardada esa carrera. Sin este `?? existing`,
// reimportar un calendario antiguo sin region pisaba silenciosamente el
// region ya migrado con null y el filtro por región se quedaba vacío.
export function importPlannedRaces(races) {

    const batchId = generateId();
    const writes = [];

    races.forEach(race => {

        const existing = plannedRaces.find(
            r => r.date === race.date && r.name === race.name
        );

        const record = {
            id: existing ? existing.id : generateId(),
            date: race.date,
            type: race.type,
            name: race.name,
            location: race.location,
            registrationDeadline: race.registrationDeadline,
            url: race.url,
            region: race.region ?? existing?.region ?? null,
            importBatchId: batchId
        };

        writes.push(upsertInto(plannedRaces, STORES.plannedRaces, record));

    });

    return Promise.all(writes).then(() => ({ written: races.length, batchId }));

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
