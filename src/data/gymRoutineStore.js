// Rutinas de gimnasio guardadas -- store CRUD real (antes solo existía
// "importar" + un único puntero de "rutina activa"; ver CLAUDE.md). Todas
// las rutinas guardadas viven aquí y son igual de gestionables (ver/editar/
// borrar) — ya no hay concepto de "activa", la pantalla de Gimnasio lista
// todas a la vez (ver Gym.js).
import { STORES, getAll, put, remove } from "./db.js";
import { generateId } from "../utils/id.js";

const routines = [];

let hydrated = null;

export function hydrate() {

    if (hydrated) return hydrated;

    hydrated = getAll(STORES.gymRoutines).then(loaded => {

        routines.push(...loaded);

    }).catch(err => {

        console.warn("No se pudieron cargar las rutinas de gimnasio — la app sigue sin persistencia.", err);

    });

    return hydrated;

}

export function getRoutines() {

    return routines;

}

export function getRoutineById(id) {

    return routines.find(r => r.id === id) || null;

}

// Busca en TODAS las rutinas guardadas -- ya no hay una única "rutina
// activa" de la que tirar primero, cada día vive dentro de la rutina que
// lo contiene y hace falta recorrerlas todas para encontrarlo.
export function getGymDay(dayId) {

    for (const routine of routines) {

        const day = routine.days.find(d => d.id === dayId);
        if (day) return day;

    }

    return null;

}

function upsertInto(routine) {

    const index = routines.findIndex(r => r.id === routine.id);
    if (index === -1) routines.push(routine);
    else routines[index] = routine;

    return put(STORES.gymRoutines, routine).catch(() => {});

}

// days ya viene con ids puestos (el constructor los genera al añadir cada
// día/ejercicio, ver gymRoutineBuilderStore.js) -- aquí solo se envuelve
// con id/fechas de la rutina en sí.
export function createRoutine({ name, days, progressionNote }) {

    const now = new Date().toISOString();

    const routine = {
        id: generateId(),
        name,
        days,
        progressionNote: progressionNote || "",
        createdAt: now,
        updatedAt: now
    };

    routines.push(routine);

    return put(STORES.gymRoutines, routine).then(() => routine);

}

export function updateRoutine(id, { name, days, progressionNote }) {

    const routine = getRoutineById(id);
    if (!routine) return null;

    routine.name = name;
    routine.days = days;
    routine.progressionNote = progressionNote || "";
    routine.updatedAt = new Date().toISOString();

    upsertInto(routine);

    return routine;

}

export function deleteRoutine(id) {

    const index = routines.findIndex(r => r.id === id);
    if (index === -1) return;

    routines.splice(index, 1);

    remove(STORES.gymRoutines, id).catch(() => {});

}
