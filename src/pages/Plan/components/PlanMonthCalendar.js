import { MonthCalendar, buildCalendarWeeks } from "../../../components/MonthCalendar/MonthCalendar.js";
import { getWorkoutIcon } from "../../../components/WorkoutIcon/WorkoutIcon.js";
import { getWeekSessions } from "../../../data/workoutStore.js";
import { parseISODate } from "../../../utils/date.js";
import { TIMELINE_TYPE_COLOR } from "./PlanTimeline.js";

// Todas las sesiones de las semanas (lunes-domingo) que cubren la
// rejilla del mes — buildCalendarWeeks() ya las devuelve completas, y
// cada semana empieza justo en su weekStartDate (week[0]), así que se
// puede pedir directamente a getWeekSessions() sin duplicar la lógica
// de qué semana cae dónde. Dedupe por weekStartDate porque dos filas de
// la rejilla nunca comparten semana, pero por claridad se protege igual.
function sessionsForMonthGrid(monthDate) {

    const weeks = buildCalendarWeeks(monthDate);
    const seenWeekStarts = new Set();
    const sessions = [];

    weeks.forEach(week => {

        const weekStart = week[0];
        if (seenWeekStarts.has(weekStart)) return;
        seenWeekStarts.add(weekStart);

        sessions.push(...getWeekSessions(weekStart));

    });

    return sessions;

}

// Un marcador por sesión, agrupados por día — mismo icono/color que ya
// usan PlanTimeline (TIMELINE_TYPE_COLOR) y WorkoutIcon en el resto de
// Plan, nunca una paleta nueva. Exportada aparte de PlanMonthCalendar
// para poder testear el mapeo sin pasar por el store real (IndexedDB).
export function buildMarkersByDate(sessions) {

    const markersByDate = {};

    sessions.forEach(session => {

        if (!session.date) return;

        const marker = {
            icon: getWorkoutIcon(session.type),
            color: TIMELINE_TYPE_COLOR[session.type] ?? TIMELINE_TYPE_COLOR.generic
        };

        (markersByDate[session.date] ??= []).push(marker);

    });

    return markersByDate;

}

// Envuelve el MonthCalendar genérico (el mismo componente de Carreras,
// sin tocarlo) con cómo Plan calcula sus marcadores y qué acción dispara
// tocar un día — initPlanEvents.js la cablea igual que ya hace con el
// resto de data-action de la pantalla.
export function PlanMonthCalendar(monthIso, selectedDate = null) {

    const monthDate = parseISODate(monthIso);
    const sessions = sessionsForMonthGrid(monthDate);
    const markersByDate = buildMarkersByDate(sessions);

    return MonthCalendar(monthDate, {
        markersByDate,
        selectedDate,
        dataAction: "select-plan-calendar-day",
        // A diferencia del uso "solo lectura" por defecto (ver
        // MonthCalendar.js): en Plan un día sin marcadores SÍ es tocable —
        // abre el formulario de creación manual de sesión, mismo punto de
        // entrada que un "Descanso" en la línea temporal semanal.
        disableEmptyDays: false
    });

}
