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
import { STORES, get, put } from "./db.js";
import { deleteRoutine } from "./gymRoutineStore.js";
import { matchUntouchedSeedRoutine } from "./legacyGymSeed.js";

export const SEED_CLEANUP_META_KEY = "gymSeedRoutineCleanup";

const EMPTY_STATE = { done: false, decisions: {} };

export function loadSeedCleanupState() {

    return get(STORES.meta, SEED_CLEANUP_META_KEY)
        .then(record => record?.value ? { ...EMPTY_STATE, ...record.value } : { ...EMPTY_STATE })
        .catch(() => ({ ...EMPTY_STATE }));

}

function saveSeedCleanupState(state) {

    return put(STORES.meta, { key: SEED_CLEANUP_META_KEY, value: state }).catch(() => {});

}

// Rutinas semilla intactas sobre las que el usuario aún no ha decidido.
export function getPendingSeedRoutines(routines, state) {

    if (state.done) return [];

    return routines.filter(routine =>
        !state.decisions[routine.id] && matchUntouchedSeedRoutine(routine)
    );

}

// Sin candidatas no hay nada que preguntar -- se cierra igualmente, para
// no volver a comprobar en cada apertura.
export function markSeedCleanupDone(state) {

    return saveSeedCleanupState({ ...state, done: true });

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

    return saveSeedCleanupState({ done: true, decisions });

}
