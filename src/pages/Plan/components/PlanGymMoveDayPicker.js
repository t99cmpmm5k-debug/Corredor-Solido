import "./PlanMoveDayPicker.css";

import { WEEKDAY_OPTIONS } from "../../Gym/gymSchedule.js";
import { getRoutines } from "../../../data/gymRoutineStore.js";

// Vive en el mismo hueco que PlanTimeline/PlanMoveDayPicker dentro de
// PlanHeader (ver Plan.js) -- misma clase .plan-timeline y mismas clases
// .move-day* (PlanMoveDayPicker.css) para que se lea como el mismo
// selector, aunque aquí las 7 columnas sean días de la SEMANA (Lunes...
// Domingo, WEEKDAY_OPTIONS de gymSchedule.js) en vez de 7 fechas
// concretas de la semana que se esté viendo -- un día de gimnasio no
// tiene fecha propia, es un patrón recurrente (day.weekday), así que su
// destino real es "qué día de la semana" y no "qué fecha", a diferencia
// de PlanMoveDayPicker (running).
//
// isOccupied aquí no es "otra sesión ese día" (concepto de fecha) sino
// "otro día de OTRA rutina ya usa este mismo weekday" -- misma señal
// visual (.move-day-dot) que ya usa PlanMoveDayPicker, mismo criterio de
// "no bloquea el toque, solo avisa" (dos rutinas pueden compartir día a
// propósito, p. ej. Torso + Cardio el mismo lunes).
export function PlanGymMoveDayPicker(gymDay) {

    const allDays = getRoutines().flatMap(routine => routine.days);

    return `

        <div class="plan-timeline plan-move-picker">

            ${WEEKDAY_OPTIONS.map(({ id, label }) => {

                const isCurrent = gymDay.weekday === id;
                const isOccupied = !isCurrent && allDays.some(d => d.id !== gymDay.id && d.weekday === id);

                return `

                    <div
                        class="move-day ${isCurrent ? "is-current" : ""} ${isOccupied ? "is-occupied" : ""}"
                        ${isCurrent ? "" : `data-action="move-gym-day-to" data-weekday="${id}"`}
                    >

                        <span class="move-day-number">${label.slice(0, 3).toUpperCase()}</span>

                        ${isCurrent
                            ? `<span class="move-day-current">AQUÍ</span>`
                            : isOccupied ? `<span class="move-day-dot"></span>` : ""}

                    </div>

                `;

            }).join("")}

        </div>

    `;

}
