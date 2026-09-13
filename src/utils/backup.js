import { STORES, get, put } from "../data/db.js";
import {
    getWorkouts, getShoes, getPlannedSessions,
    restoreWorkout, restoreShoe, restorePlannedSession
} from "../data/workoutStore.js";
import { getGymSessions, restoreGymSession } from "../data/gymSessionStore.js";
import { getReferenceRoutes } from "../data/referenceRouteStore.js";

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

export function exportData() {

    const payload = {

        schemaVersion: SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        workouts: getWorkouts(),
        shoes: getShoes(),
        plannedSessions: getPlannedSessions(),
        // Bug real corregido (Perfil, Capa 3): faltaba desde siempre --
        // gymSessionStore.js sí tenía el histórico real de gimnasio, pero
        // exportData() nunca lo incluía. Sin esto, "exportar mis datos" era
        // engañoso para quien también registra gimnasio: perdía ese
        // histórico entero si perdía el dispositivo sin haberse dado cuenta.
        gymSessions: getGymSessions()

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

export function importData(payload) {

    if (!payload || payload.schemaVersion !== SCHEMA_VERSION) {
        throw new Error("Archivo de backup con un formato de versión no reconocido.");
    }

    (payload.workouts || []).forEach(restoreWorkout);
    (payload.shoes || []).forEach(restoreShoe);
    (payload.plannedSessions || []).forEach(restorePlannedSession);
    // "|| []" cubre backups exportados ANTES de este fix -- no traen
    // gymSessions, y no hay nada que restaurar de ese campo, no un error.
    (payload.gymSessions || []).forEach(restoreGymSession);

}

export function importDataFromFile(file) {

    return file.text().then(text => importData(JSON.parse(text)));

}

// Antes solo miraba getWorkouts() -- alguien que solo registra gimnasio
// (sin ningún entreno de running todavía) nunca veía el recordatorio,
// aunque sí tuviera un histórico real que perder. Con la corrección de
// gymSessions en exportData()/importData() de arriba, tiene sentido que
// "hay algo que perder" también mire ese store.
function hasDataWorthBackingUp() {
    return getWorkouts().length > 0 || getGymSessions().length > 0;
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
        referenceRoutes: getReferenceRoutes().length,
        shoes: getShoes().length,
        plannedSessions: getPlannedSessions().length
    };

}
