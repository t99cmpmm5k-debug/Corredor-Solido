import { STORES, get, put } from "../data/db.js";
import {
    getWorkouts, getShoes, getPlannedSessions,
    restoreWorkout, restoreShoe, restorePlannedSession
} from "../data/workoutStore.js";

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
        plannedSessions: getPlannedSessions()

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

}

export function importDataFromFile(file) {

    return file.text().then(text => importData(JSON.parse(text)));

}

export function getBackupStatus() {

    const hasData = getWorkouts().length > 0;

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
