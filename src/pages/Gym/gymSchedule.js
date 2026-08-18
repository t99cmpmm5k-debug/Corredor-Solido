import { addDays, getWeekStartDate, parseISODate } from "../../utils/date.js";

// Mismo vocabulario que src/importers/gym/pdf.js (WEEKDAYS, normalizeText
// sin tildes), indexado como Date.getDay() (0 = domingo). Los días de la
// rutina por defecto (gymData.js) no tienen `weekday` — solo lo tienen los
// días de una rutina importada (ver pdf.js) — así que todo lo de aquí
// depende de que exista ese campo.
const WEEKDAYS_BY_INDEX = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

function weekdayOf(iso) {

    return WEEKDAYS_BY_INDEX[parseISODate(iso).getDay()];

}

function scheduledDays(days) {

    return days.filter(day => day.weekday);

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

// Sesiones completadas vs. programadas de la semana ISO actual (lunes a
// domingo, mismo criterio que Plan) — solo cuenta días con weekday real y
// sesiones que de verdad pertenecen a la rutina activa (scheduledIds),
// para no arrastrar histórico de una rutina ya sustituida.
export function getWeekProgress(days, sessions, todayISO) {

    const scheduled = scheduledDays(days);
    const scheduledIds = new Set(scheduled.map(day => day.id));

    const weekStart = getWeekStartDate(todayISO);
    const weekEnd = addDays(weekStart, 6);

    const completed = sessions.filter(session =>
        session.finishedAt &&
        session.date >= weekStart &&
        session.date <= weekEnd &&
        scheduledIds.has(session.dayId)
    ).length;

    return { completed, total: scheduled.length };

}
