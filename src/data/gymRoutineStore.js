// Rutinas de gimnasio guardadas -- store CRUD real (antes solo existía
// "importar" + un único puntero de "rutina activa"; ver CLAUDE.md). Todas
// las rutinas guardadas viven aquí y son igual de gestionables (ver/editar/
// borrar) — ya no hay concepto de "activa", la pantalla de Gimnasio lista
// todas a la vez (ver Gym.js).
import { STORES, getAll, put, remove } from "./db.js";
import { generateId } from "../utils/id.js";

// Patrón habitual del usuario (lunes/miércoles/viernes) -- valor por
// defecto SUGERIDO solo para una rutina NUEVA que no trae ningún día
// elegido a mano (ver createRoutine() más abajo), nunca para las ya
// existentes ni cuando el selector manual de GymRoutineBuilder.js sí
// trae un weekday real. Mismo vocabulario que WEEKDAY_OPTIONS en
// gymSchedule.js -- no se importa de allí para no crear un ciclo
// (gymSchedule.js no depende de este store), se mantiene la lista en
// paralelo a propósito.
const DEFAULT_WEEKDAY_PATTERN = ["lunes", "miercoles", "viernes"];

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

// El primer día del patrón (lunes/miércoles/viernes) que ningún día de
// ninguna rutina YA GUARDADA esté usando -- null si los 3 ya están
// ocupados (no hay un cuarto día en el patrón, se deja sin asignar a
// propósito en vez de inventar uno).
function nextAvailablePatternWeekday() {

    const usedWeekdays = new Set(
        routines.flatMap(routine => routine.days.map(day => day.weekday)).filter(Boolean)
    );

    return DEFAULT_WEEKDAY_PATTERN.find(day => !usedWeekdays.has(day)) ?? null;

}

// days ya viene con ids puestos (el constructor los genera al añadir cada
// día/ejercicio, ver gymRoutineBuilderStore.js) -- aquí solo se envuelve
// con id/fechas de la rutina en sí.
//
// Asignación automática de día (lunes/miércoles/viernes, en ese orden) --
// SOLO para una rutina nueva que no trae ningún weekday propio (el
// selector manual se dejó en "Sin día fijo" en todos sus días). Si el
// usuario SÍ eligió un día a mano en cualquiera de los días, ese valor
// manda tal cual y no se toca nada aquí. Se asigna solo al primer día de
// la rutina -- el caso real (y el único que contempla este patrón) es una
// rutina de un solo día; una rutina con varios días sin asignar se queda
// con el resto sin tocar, no se reparte el patrón entre ellos.
export function createRoutine({ name, days, progressionNote }) {

    const now = new Date().toISOString();

    const hasManualWeekday = days.some(day => day.weekday);
    const autoWeekday = hasManualWeekday ? null : nextAvailablePatternWeekday();

    const finalDays = (autoWeekday && days.length > 0)
        ? days.map((day, index) => index === 0 ? { ...day, weekday: autoWeekday } : day)
        : days;

    const routine = {
        id: generateId(),
        name,
        days: finalDays,
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

// "Mover sesión" de gimnasio (ver PlanGymDayCard.js/PlanGymMoveDayPicker.js
// en Plan) -- a diferencia de mover una sesión de running (que reasigna una
// FECHA concreta dentro de esa semana, ver movePlannedSession() en
// workoutStore.js), un día de gimnasio no tiene fecha propia: es un patrón
// recurrente por día de la semana (day.weekday), así que "moverlo" cambia
// ESE campo -- afecta a todas las semanas futuras, no solo a la que se
// esté viendo en Plan en ese momento. updateRoutine() no tiene un update
// parcial de un solo día, así que se reescribe el array `days` entero de
// la rutina que lo contiene, igual que hace el propio constructor al
// guardar cualquier otro cambio. null si dayId no pertenece a ninguna
// rutina guardada (defensivo, no debería pasar: solo se llama con un id
// que ya viene de un día real pintado en Plan).
export function moveRoutineDayToWeekday(dayId, weekday) {

    for (const routine of routines) {

        const index = routine.days.findIndex(d => d.id === dayId);
        if (index === -1) continue;

        const days = routine.days.map((day, i) => i === index ? { ...day, weekday } : day);
        return updateRoutine(routine.id, { name: routine.name, days, progressionNote: routine.progressionNote });

    }

    return null;

}

export function deleteRoutine(id) {

    const index = routines.findIndex(r => r.id === id);
    if (index === -1) return;

    routines.splice(index, 1);

    remove(STORES.gymRoutines, id).catch(() => {});

}
