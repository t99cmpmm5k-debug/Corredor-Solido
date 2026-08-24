import { addDays, getWeekStartDate, parseISODate } from "../../utils/date.js";

// Indexado como Date.getDay() (0 = domingo). El constructor manual de
// rutinas (ver gymRoutineBuilderStore.js) no asigna `weekday` a los días
// que crea — solo lo tendría un día que lo traiga por algún otro medio —
// así que todo lo de aquí depende de que exista ese campo, y hoy no se
// activa para ninguna rutina (ninguna regresión: tampoco lo tenían las 3
// rutinas por defecto antes de este cambio).
const WEEKDAYS_BY_INDEX = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

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

export function getWeekProgress(days, sessions, todayISO) {

    return {
        completed: completedThisWeek(days, sessions, todayISO).length,
        total: scheduledDays(days).length
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
