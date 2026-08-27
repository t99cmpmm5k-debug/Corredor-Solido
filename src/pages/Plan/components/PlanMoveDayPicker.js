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
// no — porque el destino de un movimiento/duplicado puede ser un día
// vacío que PlanTimeline ni siquiera dibuja.
//
// mode: "move" (por defecto) o "duplicate" (menú "···" de
// PlanWorkoutCard, fase 4 del pulido de Plan) -- mismo grid de 7 días,
// solo cambia qué data-action dispara el tap y si el propio día de
// origen se puede tocar (duplicar SÍ permite tocar el día de origen —
// duplicar dentro del mismo día es un caso real, "quiero repetir esta
// sesión otra vez hoy"; mover no, moverla a su propio día no significa
// nada).
export function PlanMoveDayPicker(weekStartDate, sessions, session, mode = "move") {

    const isDuplicate = mode === "duplicate";
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i));

    return `

        <div class="plan-timeline plan-move-picker">

            ${days.map(date => {

                const isCurrent = !isDuplicate && date === session.date;
                const isOccupied = !isCurrent && sessions.some(
                    s => s.date === date && s.id !== session.id
                );

                return `

                    <div
                        class="move-day ${isCurrent ? "is-current" : ""} ${isOccupied ? "is-occupied" : ""}"
                        ${isCurrent ? "" : `data-action="${isDuplicate ? "duplicate-session-to" : "move-session-to"}" data-date="${date}"`}
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
