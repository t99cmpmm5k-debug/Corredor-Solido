import { addDays, getWeekStartDate, parseISODate } from "../../utils/date.js";

// Indexado como Date.getDay() (0 = domingo). Hasta 2026-08-26 el
// constructor manual de rutinas (ver gymRoutineBuilderStore.js) no tenía
// ninguna forma de que el usuario asignara `weekday` a un día -- ni las 3
// rutinas por defecto lo traían tampoco -- así que todo lo de aquí
// dependía de un campo que en la práctica nunca llegaba a existir. Ahora
// el constructor SÍ lo asigna (selector de día en GymRoutineBuilder.js,
// ver WEEKDAY_OPTIONS más abajo, mismo vocabulario que este array).
const WEEKDAYS_BY_INDEX = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

// Opciones del selector de día de semana del constructor (lunes primero,
// convención habitual de calendario en español -- WEEKDAYS_BY_INDEX de
// arriba sigue indexado como Date.getDay() a propósito, para el cálculo
// de fechas, son dos cosas distintas). Exportado para no duplicar aquí
// ni el vocabulario ("miercoles" sin tilde, etc.) ni el orden en
// GymRoutineBuilder.js.
export const WEEKDAY_OPTIONS = [
    { id: "lunes", label: "Lunes" },
    { id: "martes", label: "Martes" },
    { id: "miercoles", label: "Miércoles" },
    { id: "jueves", label: "Jueves" },
    { id: "viernes", label: "Viernes" },
    { id: "sabado", label: "Sábado" },
    { id: "domingo", label: "Domingo" }
];

function weekdayOf(iso) {

    return WEEKDAYS_BY_INDEX[parseISODate(iso).getDay()];

}

// Por id, sin repetir -- si el mismo día llegase a aparecer más de una
// vez en `days` (dos rutinas que comparten un día, o un día repetido
// dentro del array de una misma rutina), ninguna de las 4 funciones de
// aquí abajo debe contarlo ni pintarlo dos veces. Puramente defensivo:
// nunca toca ni borra nada guardado, solo cómo se cuenta/pinta.
function scheduledDays(days) {

    const seenIds = new Set();

    return days.filter(day => {

        if (!day.weekday) return false;
        if (seenIds.has(day.id)) return false;

        seenIds.add(day.id);
        return true;

    });

}

export function hasWeeklySchedule(days) {

    return scheduledDays(days).length > 0;

}

export function getTodayGymDay(days, todayISO) {

    const today = weekdayOf(todayISO);

    return scheduledDays(days).find(day => day.weekday === today) ?? null;

}

// Próxima fecha real (estrictamente después de hoy) en la que cae cada día
// programado, ordenadas cronológicamente. Si dos días comparten weekday
// (caso raro), cada uno conserva su propia próxima fecha por separado —
// nunca se salta un día por buscar solo el primer match global.
export function getUpcomingGymDays(days, todayISO, count = 4) {

    const upcoming = scheduledDays(days).map(day => {

        let date = todayISO;

        for (let i = 0; i < 7; i++) {
            date = addDays(date, 1);
            if (weekdayOf(date) === day.weekday) break;
        }

        return { day, date };

    });

    upcoming.sort((a, b) => a.date.localeCompare(b.date));

    return upcoming.slice(0, count);

}

// Sesiones completadas de la semana ISO actual (lunes a domingo, mismo
// criterio que Plan) — solo cuenta sesiones que de verdad pertenecen a la
// rutina activa (scheduledIds), para no arrastrar histórico de una rutina
// ya sustituida. Compartido por getWeekProgress() (solo el conteo) y
// getWeekSessions() (el listado para poder borrar desde el resumen
// semanal) para no duplicar el criterio de "qué cuenta como esta semana".
function completedThisWeek(days, sessions, todayISO) {

    const scheduledIds = new Set(scheduledDays(days).map(day => day.id));

    const weekStart = getWeekStartDate(todayISO);
    const weekEnd = addDays(weekStart, 6);

    return sessions.filter(session =>
        session.finishedAt &&
        session.date >= weekStart &&
        session.date <= weekEnd &&
        scheduledIds.has(session.dayId)
    );

}

// Ejercicios/series REALES de la semana (solo series marcadas como hechas,
// mismo criterio que sessionSetsProgress() en GymSessionView.js) -- no el
// volumen planificado de la rutina, lo que de verdad se hizo en las
// sesiones ya terminadas de completedThisWeek(). `session.exercises` puede
// faltar en fixtures/datos antiguos sin ese campo -- `?? []` en vez de
// asumirlo siempre presente.
function weekTotals(finishedSessions) {

    let exercises = 0;
    let sets = 0;

    finishedSessions.forEach(session => {

        (session.exercises ?? []).forEach(exercise => {

            exercises += 1;
            sets += (exercise.sets ?? []).filter(set => set.done).length;

        });

    });

    return { exercises, sets };

}

export function getWeekProgress(days, sessions, todayISO) {

    const finished = completedThisWeek(days, sessions, todayISO);

    return {
        completed: finished.length,
        total: scheduledDays(days).length,
        ...weekTotals(finished)
    };

}

// Mismas sesiones que cuenta getWeekProgress(), pero el listado completo
// en vez de solo el número — para el desplegable del resumen semanal
// donde se pueden borrar una a una. Más reciente primero, igual que
// HistoryTab en GymExerciseDetailView.js.
export function getWeekSessions(days, sessions, todayISO) {

    return completedThisWeek(days, sessions, todayISO)
        .sort((a, b) => b.date.localeCompare(a.date));

}

// La sesión terminada (finishedAt) para un día concreto en una fecha
// concreta -- null si no hay ninguna o sigue sin terminar. A diferencia de
// completedThisWeek()/getWeekProgress(), que cuentan CUALQUIER día
// programado de toda la semana, esta busca un dayId ya resuelto (por
// getTodayGymDay/getGymDayForDate) en una fecha exacta -- la usan Home y
// Plan para saber si "hoy" (o el día que se esté pintando) ya se hizo de
// verdad, no solo si está programado.
export function getFinishedGymSessionForDay(dayId, sessions, dateISO) {

    return sessions.find(s => s.dayId === dayId && s.date === dateISO && s.finishedAt) ?? null;

}
