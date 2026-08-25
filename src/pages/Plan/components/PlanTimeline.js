import "./PlanTimeline.css";

import { isToday, addDays, getDayAbbreviation } from "../../../utils/date.js";
import { TimelineDay } from "./TimelineDay/TimelineDay";
import { getGymDayForDate } from "../gymTimelineBridge.js";

// Mismos colores por tipo que WorkoutIcon.css (ahí es donde vive la
// fuente de verdad — esto es su equivalente en JS para poder construir
// el degradado de la línea, que no puede leer clases CSS). Ids de
// WORKOUT_TYPES (src/data/workoutTypes.js) — unificado con el vocabulario
// de la importación de planes, ya no el propio de Plan.
export const TIMELINE_TYPE_COLOR = {
    recovery: "var(--color-text-muted)",
    z2: "var(--color-success)",
    tempo: "var(--color-primary)",
    intervals: "#ff7a33",
    longRun: "var(--color-warning)",
    race: "var(--color-danger)",
    strength: "#2faeff",
    free: "var(--color-text-muted)",
    generic: "var(--color-text-muted)"
};

// El hueco de un día sin sesión real reutiliza el tipo "free" tal cual
// (mismo icono/color muted que ya tenía un día libre de un plan
// importado) en vez de inventar una categoría nueva — "Descanso" es solo
// el título que se lee si esa columna llega a estar seleccionada, igual
// que con cualquier otra.
const REST_DAY_TYPE = "free";
const REST_DAY_TITLE = "Descanso";

function restDayPlaceholder(date) {

    return {
        id: `rest-${date}`,
        date,
        day: getDayAbbreviation(date),
        type: REST_DAY_TYPE,
        title: REST_DAY_TITLE,
        subtitle: null,
        status: "rest",
        volume: 0,
        isRest: true
    };

}

// Superpone el día de gimnasio de esa fecha (si existe, ver
// gymTimelineBridge.js) sobre la celda ya resuelta. Con sesión real de
// running se deja tal cual y solo se marca hasGym para el indicador
// secundario (running manda al tocar el día, ver initPlanEvents.js); sin
// sesión real, el propio hueco de "Descanso" pasa a representar el día de
// gimnasio (mismo tipo "strength" que ya usa el resto de la app).
function attachGymInfo(dayCell, date) {

    const match = getGymDayForDate(date);
    if (!match) return dayCell;

    const { routine, day: gymDay } = match;

    if (!dayCell.isRest) {
        return { ...dayCell, hasGym: true, gymDayId: gymDay.id, gymRoutineId: routine.id };
    }

    return {
        id: `gym-${date}`,
        date,
        day: dayCell.day,
        type: "strength",
        title: gymDay.title,
        subtitle: routine.name,
        status: "rest",
        volume: 0,
        isRest: false,
        gymOnly: true,
        gymDayId: gymDay.id,
        gymRoutineId: routine.id
    };

}

// Siempre 7 columnas (lunes-domingo), tenga la semana sesiones o no — los
// días sin sesión real se rellenan con un hueco de "Descanso" (o, si hay
// un día de gimnasio programado ese día de la semana, con ese día de
// gimnasio -- ver attachGymInfo). Con más de una sesión real el mismo día
// (p. ej. tras mover una) se queda con la primera por slot, mismo criterio
// que ya usa PlanMonthCalendar al tocar un día del mes. Exportada aparte
// para poder testear el relleno sin montar HTML.
export function fillWeekDays(weekStartDate, sessions) {

    const byDate = new Map();

    // Ordenadas por slot antes del dedupe -- getWeekSessions() ya las
    // entrega así, pero no se depende de que quien llame lo haga siempre
    // bien: "la primera por slot" tiene que cumplirse pase lo que pase.
    const sorted = [...sessions].sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));

    sorted.forEach(session => {
        if (!byDate.has(session.date)) byDate.set(session.date, session);
    });

    return Array.from({ length: 7 }, (_, i) => {
        const date = addDays(weekStartDate, i);
        const dayCell = byDate.get(date) ?? restDayPlaceholder(date);
        return attachGymInfo(dayCell, date);
    });

}

export function PlanTimeline(selectedWorkout, sessions, weekStartDate) {

    const days = fillWeekDays(weekStartDate, sessions);
    const todayIndex = days.findIndex(day => isToday(day.date));

    // La línea pasa por el color de cada día, de punta a punta -- con 7
    // columnas fijas siempre hay tramo que dibujar (nunca menos de 2).
    const lineGradient = days
        .map((day, index) => {
            const color = TIMELINE_TYPE_COLOR[day.type] ?? TIMELINE_TYPE_COLOR.generic;
            const stop = (index / (days.length - 1)) * 100;
            return `${color} ${stop}%`;
        })
        .join(", ");

    return `

        <section class="plan-timeline">

            <div
                class="timeline-line"
                style="background:linear-gradient(90deg, ${lineGradient})"
            ></div>

            ${days.map((day, index) =>

                TimelineDay(day, {
                    isToday: index === todayIndex,
                    // Por id, no por fecha: dos sesiones el mismo día (p. ej.
                    // tras mover una) no deben quedar ambas marcadas como
                    // seleccionadas solo por compartir date.
                    isSelected: day.id === selectedWorkout?.id,
                    isCompleted: day.status === "completed",
                    isRest: day.isRest === true
                })

            ).join("")}

        </section>

    `;

}
