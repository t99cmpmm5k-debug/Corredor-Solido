// Limpieza, una sola vez por instalación, de las rutinas semilla heredadas
// (ver legacyGymSeed.js). Nunca borra sola: propone las que siguen
// intactas y el usuario elige cuáles eliminar -- aunque sean plantilla,
// puede haberlas usado de verdad sin saberlo (p. ej. Rafa, cuyo historial
// de sesiones cuelga de esos mismos ids).
//
// Estado en meta (misma store que lastExportAt/lastSyncAt):
//   { done, decisions: { [routineId]: "kept" | "deleted" } }
// `done` cierra la comprobación para siempre en esta instalación; las
// decisiones por rutina garantizan además que una rutina conservada no se
// vuelve a proponer aunque `done` se perdiera.
//
// Con las rutinas en el sync (2026-09-23) la decisión "kept" viaja además
// DENTRO de la propia rutina (routine.seedCleanupDecision) -- el meta es
// local, y sin esto un móvil nuevo recibiría del servidor la rutina
// conservada y volvería a preguntar por ella. Y una semilla sobre la que
// aún no se ha decidido NO se sube (isSeedRoutineAwaitingDecision, usado
// por getSyncableData() en backup.js): el primer push sale al arrancar,
// antes de que el usuario conteste el aviso.
import { STORES, get, put } from "./db.js";
import { deleteRoutine, updateRoutine } from "./gymRoutineStore.js";
import { matchUntouchedSeedRoutine } from "./legacyGymSeed.js";

export const SEED_CLEANUP_META_KEY = "gymSeedRoutineCleanup";

const EMPTY_STATE = { done: false, decisions: {} };

// Último estado conocido, para la consulta síncrona de
// isSeedRoutineAwaitingDecision(). null = aún sin cargar.
let cachedState = null;

export function loadSeedCleanupState() {

    return get(STORES.meta, SEED_CLEANUP_META_KEY)
        .then(record => record?.value ? { ...EMPTY_STATE, ...record.value } : { ...EMPTY_STATE })
        .catch(() => ({ ...EMPTY_STATE }))
        .then(state => (cachedState = state));

}

// Llamada una vez al arrancar, junto al resto de hidrataciones (main.js).
export function hydrateSeedCleanupState() {

    return loadSeedCleanupState().then(() => {});

}

function saveSeedCleanupState(state) {

    cachedState = state;
    return put(STORES.meta, { key: SEED_CLEANUP_META_KEY, value: state }).catch(() => {});

}

function isKeptByRecord(routine) {

    return routine.seedCleanupDecision === "kept";

}

// Semilla intacta sobre la que esta instalación aún no ha decidido nada --
// no se sube al servidor ni entra en el backup hasta que el usuario
// conteste. Con el estado aún sin cargar se asume que sí está pendiente
// (lo seguro: como mucho se sube un push más tarde, nunca antes de tiempo).
// Con la comprobación ya cerrada (`done`) y sin decisión propia, la
// semilla llegó después (sync/backup de otro dispositivo): ya no se va a
// preguntar por ella aquí, así que se trata como una rutina normal.
export function isSeedRoutineAwaitingDecision(routine) {

    if (!matchUntouchedSeedRoutine(routine) || isKeptByRecord(routine)) return false;
    if (!cachedState) return true;

    return !cachedState.done && !cachedState.decisions[routine.id];

}

// Rutinas semilla intactas sobre las que el usuario aún no ha decidido.
export function getPendingSeedRoutines(routines, state) {

    if (state.done) return [];

    return routines.filter(routine =>
        !state.decisions[routine.id] && !isKeptByRecord(routine) && matchUntouchedSeedRoutine(routine)
    );

}

// Sin candidatas no hay nada que preguntar -- se cierra igualmente, para
// no volver a comprobar en cada apertura.
export function markSeedCleanupDone(state) {

    return saveSeedCleanupState({ ...state, done: true });

}

// Graba "kept" en la propia rutina (y la sube en el siguiente sync).
function stampKept(routine) {

    if (isKeptByRecord(routine)) return;

    routine.seedCleanupDecision = "kept";
    updateRoutine(routine.id, { name: routine.name, days: routine.days, progressionNote: routine.progressionNote });

}

// Instalaciones que ya contestaron el aviso antes de que la decisión
// viajara en la rutina: solo la tenían en el meta local.
export function stampKeptDecisions(routines, state) {

    routines
        .filter(routine => state.decisions[routine.id] === "kept")
        .forEach(stampKept);

}

// selectedIds: las que el usuario marcó para eliminar; el resto de
// candidatas quedan como "kept" y no se vuelven a proponer.
export function resolveSeedCleanup(candidates, selectedIds, state) {

    const selected = new Set(selectedIds);
    const decisions = { ...state.decisions };

    candidates.forEach(routine => {

        if (selected.has(routine.id)) {
            deleteRoutine(routine.id);
            decisions[routine.id] = "deleted";
        } else {
            decisions[routine.id] = "kept";
        }

    });

    // El estado se guarda ANTES de sellar las conservadas: stampKept()
    // dispara un sync, y ese push ya debe verlas como decididas.
    return saveSeedCleanupState({ done: true, decisions }).then(() => {
        candidates.filter(routine => !selected.has(routine.id)).forEach(stampKept);
    });

}
