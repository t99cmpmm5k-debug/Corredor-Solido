import { STORES, getAll, get, put } from "./db.js";
import { generateId } from "../utils/id.js";
import { gymDays as defaultGymDays } from "./gymData.js";

const ACTIVE_ROUTINE_KEY = "activeGymRoutineId";

const routines = [];
let activeRoutineId = null;

let hydrated = null;

export function hydrate() {

    if (hydrated) return hydrated;

    hydrated = Promise.all([
        getAll(STORES.gymRoutines),
        get(STORES.meta, ACTIVE_ROUTINE_KEY)
    ]).then(([loadedRoutines, activeRecord]) => {

        routines.push(...loadedRoutines);
        activeRoutineId = activeRecord ? activeRecord.value : null;

    }).catch(err => {

        console.warn("No se pudo cargar la rutina de gimnasio importada — la app sigue con la rutina por defecto.", err);

    });

    return hydrated;

}

export function getGymDays() {

    const active = routines.find(r => r.id === activeRoutineId);
    return active ? active.days : defaultGymDays;

}

export function getGymDay(dayId) {

    return getGymDays().find(day => day.id === dayId) || null;

}

// Deshacer una importación no borra la rutina nueva (queda en la store por
// si se quiere volver a activar) — solo mueve el puntero de "activa" de
// vuelta a la anterior. Sin window.confirm ni nada que perder: mucho más
// simple que el borrado por lote de Plan (ver deletePlannedSessionsByBatch)
// porque aquí no hay "sesiones ya registradas" que puedan quedar huérfanas
// (los ids de ejercicio son deterministas por nombre, así que el histórico
// de gymSessionStore sigue encontrando el mismo exerciseId tras deshacer).
export function saveImportedRoutine(days, sourceName) {

    const previousActiveId = activeRoutineId;

    const routine = {
        id: generateId(),
        importedAt: new Date().toISOString(),
        sourceName,
        days
    };

    routines.push(routine);
    activeRoutineId = routine.id;

    return Promise.all([
        put(STORES.gymRoutines, routine),
        put(STORES.meta, { key: ACTIVE_ROUTINE_KEY, value: routine.id })
    ]).then(() => ({ routineId: routine.id, previousActiveId }));

}

export function undoRoutineImport(previousActiveId) {

    activeRoutineId = previousActiveId;

    return put(STORES.meta, { key: ACTIVE_ROUTINE_KEY, value: previousActiveId }).catch(() => {});

}
