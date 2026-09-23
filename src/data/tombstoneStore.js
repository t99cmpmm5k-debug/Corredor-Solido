import { STORES, getAll, put } from "./db.js";

// Registro de borrados reales -- lo consultan getSyncableData()/
// applyRestoreBatch() (backup.js) para que un borrado se propague de
// verdad por el sync en vez de que el próximo pull traiga de vuelta un
// registro que ya se había subido antes de borrarlo (bug real corregido:
// el push a /api/sync siempre fue puramente aditivo, INSERT ... ON
// DUPLICATE KEY UPDATE, nunca borra nada él solo).
//
// `id` es compuesto ("storeKey:recordId"), no el id del registro
// original -- así conviven en una sola store/tabla las tombstones de los
// 5 stores borrables que participan en el sync (workouts, plannedSessions,
// gymSessions, referenceRoutes, gymRoutines). plannedRaces/customExercises
// no generan tombstones porque no están en SYNC_TABLES (server/src/
// syncTables.js) y por tanto no pueden resucitar así.
const tombstones = [];

let hydrated = null;

export function hydrate() {

    if (hydrated) return hydrated;

    hydrated = getAll(STORES.tombstones).then(loaded => {
        tombstones.push(...loaded);
    }).catch(() => {});

    return hydrated;

}

function upsertLocal(tombstone) {

    const index = tombstones.findIndex(t => t.id === tombstone.id);
    if (index === -1) tombstones.push(tombstone);
    else tombstones[index] = tombstone;

    return put(STORES.tombstones, tombstone).catch(() => {});

}

// Se llama desde cada deleteX() real (deleteWorkout, deletePlannedSession,
// deleteSession de gimnasio, deleteReferenceRoute) justo después de borrar
// el registro en local.
export function recordTombstone(storeKey, recordId) {

    upsertLocal({
        id: `${storeKey}:${recordId}`,
        storeKey,
        recordId,
        deletedAt: new Date().toISOString()
    });

}

export function getTombstones() {

    return tombstones;

}

// Upsert ciego por id, mismo criterio que restoreWorkout/restoreShoe/etc --
// solo guarda la tombstone recibida (de un pull o de un backup importado),
// no borra nada por sí sola. Aplicar el borrado real es cosa de
// applyRestoreBatch(), que llama a la deleteX() correspondiente.
export function restoreTombstone(tombstone) {

    return upsertLocal(tombstone);

}
