import { STORES, get, put } from "../data/db.js";
import {
    getWorkouts, getShoes, getPlannedSessions,
    restoreWorkout, restoreShoe, restorePlannedSession,
    deleteWorkout, deletePlannedSession
} from "../data/workoutStore.js";
import { getGymSessions, restoreGymSession, deleteSession as deleteGymSession } from "../data/gymSessionStore.js";
import { getReferenceRoutes, restoreReferenceRoute, deleteReferenceRoute } from "../data/referenceRouteStore.js";
import { getRoutines as getGymRoutines, restoreRoutine as restoreGymRoutine, deleteRoutine as deleteGymRoutine } from "../data/gymRoutineStore.js";
import { isSeedRoutineAwaitingDecision } from "../data/legacyGymSeedCleanup.js";
import { getTombstones, restoreTombstone } from "../data/tombstoneStore.js";
import { notifyDataChanged } from "../data/changeEvents.js";

// Dispatch de una tombstone (ver tombstoneStore.js) a la deleteX() real de
// su store de origen -- solo estos 5 participan en el sync (SYNC_TABLES
// del backend), así que son los únicos que pueden generar tombstones.
const TOMBSTONE_DELETERS = {
    workouts: deleteWorkout,
    plannedSessions: deletePlannedSession,
    gymSessions: deleteGymSession,
    referenceRoutes: deleteReferenceRoute,
    gymRoutines: deleteGymRoutine
};

const SCHEMA_VERSION = 1;
const REMINDER_THRESHOLD_DAYS = 14;
const LAST_EXPORT_KEY = "lastExportAt";

let lastExportAt = null;

export function hydrateBackupMeta() {

    return get(STORES.meta, LAST_EXPORT_KEY).then(record => {
        lastExportAt = record ? record.value : null;
    }).catch(() => {});

}

function setLastExportAt(iso) {

    lastExportAt = iso;
    return put(STORES.meta, { key: LAST_EXPORT_KEY, value: iso }).catch(() => {});

}

// Los 6 stores reales de la app, más las tombstones (borrados pendientes
// de propagar, no un store de datos), sin envoltorio -- misma forma que
// espera POST /api/sync (server/src/syncTables.js: SYNC_KEYS). exportData()
// añade schemaVersion/exportedAt encima de esto para el archivo de
// backup; el sync con el backend usa esto tal cual, sin esos dos campos
// que el servidor no lee.
export function getSyncableData() {

    return {
        workouts: getWorkouts(),
        shoes: getShoes(),
        plannedSessions: getPlannedSessions(),
        // Bug real corregido (Perfil, Capa 3): faltaba desde siempre --
        // gymSessionStore.js sí tenía el histórico real de gimnasio, pero
        // esto nunca lo incluía. Sin esto, "exportar mis datos" era
        // engañoso para quien también registra gimnasio: perdía ese
        // histórico entero si perdía el dispositivo sin haberse dado cuenta.
        gymSessions: getGymSessions(),
        // Mismo bug que gymSessions arriba: referenceRouteStore.js tenía el
        // histórico real pero esto nunca lo incluía.
        referenceRoutes: getReferenceRoutes(),
        // Faltaban desde siempre (2026-09-23): las rutinas solo vivían en el
        // IndexedDB del dispositivo, así que cambiar de móvil o borrar datos
        // las perdía aunque las sesiones sí estuvieran a salvo. Sin las
        // semillas heredadas sobre las que el usuario aún no ha decidido
        // (ver legacyGymSeedCleanup.js) -- esas no salen del dispositivo
        // hasta que conteste el aviso.
        gymRoutines: getGymRoutines().filter(routine => !isSeedRoutineAwaitingDecision(routine)),
        // No es un store de datos reales -- son los borrados pendientes de
        // propagar (ver tombstoneStore.js). Va en el mismo payload que el
        // resto para que el POST /api/sync los guarde con el mismo pipeline
        // genérico (server/src/syncTables.js: SYNC_TABLES.tombstones).
        tombstones: getTombstones()
    };

}

export function exportData() {

    const payload = {

        schemaVersion: SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        ...getSyncableData()

    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `corredor-solido-backup-${payload.exportedAt.slice(0, 10)}.json`;
    link.click();

    URL.revokeObjectURL(url);

    return setLastExportAt(payload.exportedAt);

}

// Aplica un lote de los 6 stores reales (workouts/shoes/plannedSessions/
// gymSessions/referenceRoutes/gymRoutines) más las tombstones, contra los stores en
// memoria + IndexedDB -- compartido entre importData() (backup manual, con
// schemaVersion) y syncManager.js (merge de un pull, sin ese envoltorio:
// ver el comentario de getSyncableData() arriba sobre la diferencia de
// forma). Único sitio con la lista de los 6 stores que participan aquí,
// para no repetirla en dos módulos que tendrían que recordar mantenerse en
// sincronía.
export function applyRestoreBatch(payload) {

    (payload.workouts || []).forEach(restoreWorkout);
    (payload.shoes || []).forEach(restoreShoe);
    (payload.plannedSessions || []).forEach(restorePlannedSession);
    // "|| []" cubre backups exportados ANTES de este fix -- no traen
    // gymSessions, y no hay nada que restaurar de ese campo, no un error.
    (payload.gymSessions || []).forEach(restoreGymSession);
    // Mismo "|| []" que gymSessions arriba -- ningún backup anterior a este
    // cambio trae referenceRoutes.
    (payload.referenceRoutes || []).forEach(restoreReferenceRoute);
    // Mismo "|| []": ni los backups ni el servidor traían rutinas antes.
    (payload.gymRoutines || []).forEach(restoreGymRoutine);

    // Las tombstones se aplican DESPUÉS de restaurar los 4 stores de
    // arriba, nunca antes -- así un borrado siempre gana si por lo que sea
    // llegan ambos a la vez (un pull no debería traer nunca un registro
    // vivo y su propia tombstone a la vez, pero si pasara, que gane el
    // borrado es la regla segura). deleteX() ya no hace nada si el
    // registro no existe en local (findIndex === -1), así que aplicar una
    // tombstone ya conocida es un no-op limpio, no un error.
    (payload.tombstones || []).forEach(tombstone => {

        restoreTombstone(tombstone);
        TOMBSTONE_DELETERS[tombstone.storeKey]?.(tombstone.recordId);

    });

}

export function importData(payload) {

    if (!payload || payload.schemaVersion !== SCHEMA_VERSION) {
        throw new Error("Archivo de backup con un formato de versión no reconocido.");
    }

    applyRestoreBatch(payload);

    // Para que un backup importado a mano también acabe subido al
    // servidor por la sincronización continua (Fase 4) -- sin esto, el
    // mismo agujero de esta sesión (import local que nunca llega al
    // servidor) seguiría abierto para cualquiera que restaure un backup.
    notifyDataChanged();

}

export function importDataFromFile(file) {

    return file.text().then(text => importData(JSON.parse(text)));

}

// Antes solo miraba workouts/gymSessions -- extendido a los 6 stores
// reales (ver getSyncableData()), para el recordatorio de backup de más
// abajo. "tombstones" se excluye a propósito -- no son datos que perder,
// son borrados ya hechos; alguien que borró todo su histórico no debería
// ver el aviso de "tienes datos sin exportar" solo por eso.
export function hasDataWorthBackingUp() {
    const { tombstones, ...realData } = getSyncableData();
    return Object.values(realData).some(records => records.length > 0);
}

export function getBackupStatus() {

    const hasData = hasDataWorthBackingUp();

    if (!lastExportAt) {
        return { daysSinceExport: null, shouldRemind: hasData };
    }

    const msSinceExport = Date.now() - new Date(lastExportAt).getTime();
    const daysSinceExport = Math.floor(msSinceExport / (1000 * 60 * 60 * 24));

    return {
        daysSinceExport,
        shouldRemind: hasData && daysSinceExport >= REMINDER_THRESHOLD_DAYS
    };

}

// Resumen de solo lectura para Perfil (Capa 3) -- ningún cálculo, solo
// contar lo que YA está cargado en memoria (hidratado desde IndexedDB al
// arrancar, ver main.js). Cada store real que existe hoy tiene su línea;
// si no hay ni un solo registro en total, quien pinte esto puede decidir
// no mostrar la tarjeta (nada que resumir todavía).
export function getDataSummary() {

    return {
        workouts: getWorkouts().length,
        gymSessions: getGymSessions().length,
        gymRoutines: getGymRoutines().length,
        referenceRoutes: getReferenceRoutes().length,
        shoes: getShoes().length,
        plannedSessions: getPlannedSessions().length
    };

}
