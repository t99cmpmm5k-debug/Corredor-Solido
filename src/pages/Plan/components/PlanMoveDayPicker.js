import "./PlanMoveDayPicker.css";

import { addDays, getDayAbbreviation, formatDayNumber } from "../../../utils/date.js";

// Vive en el mismo hueco que PlanTimeline dentro de PlanHeader (ver
// Plan.js) — misma clase .plan-timeline a propósito, para heredar el
// swipe de cambio de semana (initTimelineSwipe en initPlanEvents.js)
// sin tocarlo: solo hay un .plan-timeline en la página en cada momento,
// nunca los dos a la vez.
//
// A diferencia de PlanTimeline (una columna por sesión), aquí hay
// siempre 7 columnas — una por cada día de la semana, tenga sesión o
// no — porque el destino de un movimiento puede ser un día vacío que
// PlanTimeline ni siquiera dibuja.
export function PlanMoveDayPicker(weekStartDate, sessions, movingSession) {

    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i));

    return `

        <div class="plan-timeline plan-move-picker">

            ${days.map(date => {

                const isCurrent = date === movingSession.date;
                const isOccupied = !isCurrent && sessions.some(
                    s => s.date === date && s.id !== movingSession.id
                );

                return `

                    <div
                        class="move-day ${isCurrent ? "is-current" : ""} ${isOccupied ? "is-occupied" : ""}"
                        ${isCurrent ? "" : `data-action="move-session-to" data-date="${date}"`}
                    >

                        <span class="move-day-name">${getDayAbbreviation(date)}</span>

                        <span class="move-day-number">${formatDayNumber(date)}</span>

                        ${isCurrent
                            ? `<span class="move-day-current">AQUÍ</span>`
                            : isOccupied ? `<span class="move-day-dot"></span>` : ""}

                    </div>

                `;

            }).join("")}

        </div>

    `;

}
