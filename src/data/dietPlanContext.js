// Puente de solo lectura Plan/Gimnasio -> Nutrición: qué dice el plan de
// una fecha, para proponer la franja ("¿Cuándo entrenas?") y el menú del
// día cuando no se ha elegido nada a mano (ver resolveTrainingTime y
// resolveDietDay en dietStore.js). No guarda nada: se calcula al pintar,
// así que subir, mover o borrar una sesión se refleja en cuanto Nutrición
// se vuelve a pintar.
import { getPlannedSessions } from "./workoutStore.js";
import { getRoutines } from "./gymRoutineStore.js";
import { getTodayGymDay, hasWeeklySchedule } from "../pages/Gym/gymSchedule.js";
import { getWeekStartDate } from "../utils/date.js";
import { WORKOUT_TYPES } from "./workoutTypes.js";

// Días "libres" de un plan: "free" (importados), "rest" (planData antiguo)
// o isRest -- mismo criterio que planDayColor.js. No son sesión.
const REST_TYPES = new Set(["free", "rest"]);

function isTrainingSession(session) {

    return !session.isRest && !REST_TYPES.has(session.type);

}

// Tipo de día para elegir el menú (ver getDietDayResolution en
// dietStore.js). Series = cualquier sesión de calidad: series, tempo y
// carrera. Fuerza ("strength", o "gym" en planes antiguos) = gimnasio.
const SERIES_TYPES = new Set(["intervals", "tempo", "race"]);
const GYM_TYPES = new Set(["strength", "gym"]);

// "longRun" | "series" | "rodaje" | "gym" | "rest". Running y gimnasio el
// mismo día: manda running (y dentro de running, lo más exigente).
function planDayKind(sessions, gymDay) {

    const running = sessions.filter(s => !GYM_TYPES.has(s.type));

    if (running.some(s => s.type === "longRun")) return "longRun";
    if (running.some(s => SERIES_TYPES.has(s.type))) return "series";
    if (running.length) return "rodaje";
    if (gymDay || sessions.length) return "gym";

    return "rest";

}

// Cada día de rutina con el nombre de su rutina (__routineName) -- para
// emparejar el menú de gimnasio por tipo ("Pierna", "Torso"...), ver
// getGymSessionNames().
function allGymDays() {

    return getRoutines().flatMap(routine => routine.days.map(day => ({ ...day, __routineName: routine.name })));

}

// "HH:MM" -> franja. Hoy ninguna sesión del plan ni día de gimnasio trae
// hora (los importadores no la leen); si algún día llega en `startTime`,
// se usa. Cortes: mañana hasta las 11:00, mediodía hasta las 16:30, tarde
// después.
export function trainingTimeFromClock(clock) {

    const match = /^(\d{1,2}):(\d{2})/.exec(String(clock ?? ""));
    if (!match) return null;

    const minutes = Number(match[1]) * 60 + Number(match[2]);

    if (minutes < 11 * 60) return "manana";
    if (minutes < 16 * 60 + 30) return "mediodia";
    return "tarde";

}

// Lo que el plan dice de `date`, o null si el plan no cubre esa fecha
// (sin sesiones de running esa semana y sin días de gimnasio programados)
// -- entonces Nutrición se comporta como siempre. Así un plan importado
// solo para unas semanas no convierte en "descanso" el resto del año.
// { sessions, gymDay, hasLongRun, kind, startTime }:
// - sessions: las de running/carrera/fuerza de ese día (sin días libres);
// - gymDay: el día de rutina programado ese día de la semana, o null;
// - startTime: la hora más temprana que traiga alguna, o null.
export function getPlanDayForDate(date) {

    const weekStart = getWeekStartDate(date);
    const planned = getPlannedSessions().filter(s => s.date);
    const gymDays = allGymDays();

    const coversRunning = planned.some(s => (s.weekStartDate ?? getWeekStartDate(s.date)) === weekStart);
    const coversGym = hasWeeklySchedule(gymDays);

    if (!coversRunning && !coversGym) return null;

    const sessions = planned
        .filter(s => s.date === date && isTrainingSession(s))
        .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));
    const gymDay = getTodayGymDay(gymDays, date);

    const startTime = [...sessions, ...(gymDay ? [gymDay] : [])]
        .map(item => item.startTime)
        .filter(time => trainingTimeFromClock(time))
        .sort()[0] ?? null;

    return {
        sessions,
        gymDay,
        hasLongRun: sessions.some(s => s.type === "longRun"),
        kind: planDayKind(sessions, gymDay),
        startTime
    };

}

// Nombres con los que buscar el tipo de un día de gimnasio: el día de la
// rutina y su rutina, y el título de las sesiones de fuerza del plan.
export function getGymSessionNames(planDay) {

    if (!planDay) return [];

    const gymSessions = planDay.sessions.filter(s => GYM_TYPES.has(s.type));

    return [planDay.gymDay?.title, planDay.gymDay?.__routineName, ...gymSessions.map(s => s.title)]
        .filter(Boolean);

}

export function planDayHasTraining(planDay) {

    return Boolean(planDay && (planDay.sessions.length || planDay.gymDay));

}

// Texto corto de la sesión para "Según tu plan: …": el título de cada
// sesión (o su tipo si no trae) y el día de gimnasio.
export function describePlanDay(planDay) {

    if (!planDayHasTraining(planDay)) return null;

    const parts = planDay.sessions.map(s => s.title || WORKOUT_TYPES[s.type]?.label || "Entreno");
    if (planDay.gymDay) parts.push(planDay.gymDay.title ? `Gimnasio · ${planDay.gymDay.title}` : "Gimnasio");

    return parts.join(" + ");

}
