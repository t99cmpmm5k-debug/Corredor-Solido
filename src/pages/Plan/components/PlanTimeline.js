import "./PlanTimeline.css";

import { isToday, addDays, getDayAbbreviation } from "../../../utils/date.js";
import { TimelineDay } from "./TimelineDay/TimelineDay";
import { getGymDayForDate } from "../gymTimelineBridge.js";
import { resolveDayColor } from "../planDayColor.js";

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

    const { routine, day: gymDay, finishedSession } = match;
    const gymCompleted = finishedSession != null;

    if (!dayCell.isRest) {
        return {
            ...dayCell,
            hasGym: true,
            gymDayId: gymDay.id,
            gymRoutineId: routine.id,
            gymCompleted,
            gymSessionId: finishedSession?.id ?? null
        };
    }

    return {
        id: `gym-${date}`,
        date,
        day: dayCell.day,
        type: "strength",
        title: gymDay.title,
        subtitle: routine.name,
        // "completed" activa el mismo day-check que ya usa running (ver
        // isCompleted en PlanTimeline()/TimelineDay.js) -- un día solo de
        // gimnasio no necesita un segundo indicador aparte.
        status: gymCompleted ? "completed" : "rest",
        volume: 0,
        isRest: false,
        gymOnly: true,
        gymCompleted,
        gymDayId: gymDay.id,
        gymRoutineId: routine.id,
        gymSessionId: finishedSession?.id ?? null,
        // La lista real de ejercicios de este día -- el timeline no la
        // necesitaba hasta ahora, pero la tarjeta de detalle inline de
        // gimnasio en Plan sí (ver PlanGymDayCard.js/buildGymOnlyDay() más
        // abajo), y ya está aquí mismo en gymDay sin tener que volver a
        // consultar el puente.
        exercises: gymDay.exercises
    };

}

// Mismo objeto sintético que ya construye attachGymInfo() para el hueco
// "solo gimnasio" del timeline -- reexpuesto para que initPlanEvents.js lo
// guarde tal cual en selectedWorkout al tocar el día (tarjeta de detalle
// inline de gimnasio en Plan, ver PlanGymDayCard.js) sin reconstruir el
// mismo mapeo id/title/subtitle en un segundo sitio. null si esa fecha no
// tiene de verdad ningún día de gimnasio programado -- no debería llamarse
// en ese caso, initPlanEvents.js solo lo hace cuando el propio día ya
// renderizado trae data-gym-day-id.
export function buildGymOnlyDay(date) {

    const result = attachGymInfo(restDayPlaceholder(date), date);
    return result.gymOnly ? result : null;

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
            const color = resolveDayColor(day);
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
