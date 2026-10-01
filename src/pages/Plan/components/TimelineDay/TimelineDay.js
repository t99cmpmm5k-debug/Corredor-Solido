import "./TimelineDay.css";
import { WorkoutIcon } from "../../../../components/WorkoutIcon/WorkoutIcon";
import { formatDayNumber } from "../../../../utils/date.js";
import { resolveDayColorKey } from "../../planDayColor.js";

// isToday: fecha real de hoy -- doble anillo (borde) en vez de un nodo
// más grande (pulido final 2026-10-01), ver TimelineDay.css.
// isSelected: día tocado en el timeline, controla lo que se ve abajo --
// su señal propia es la marca bajo el nodo (.day-center::after), así
// "hoy" (anillo) y "seleccionado" (marca) nunca se confunden cuando son
// el mismo día (caso por defecto al entrar en Plan).
// isCompleted: session.status === "completed", muestra el check
// isRest: hueco de "Descanso" sin sesión real (ver fillWeekDays() en
// PlanTimeline.js) -- no necesita cursor de "tocable", el click en la
// franja ya no hace nada por sí solo (getSessionById() de su id sintético
// no encuentra ninguna sesión real).
// session.hasGym / gymOnly / gymDayId: día de gimnasio superpuesto por
// attachGymInfo() en PlanTimeline.js -- ver initPlanEvents.js para cómo se
// usa data-gym-day-id al tocar la columna.
export function TimelineDay(session, { isToday, isSelected, isCompleted, isRest = false }) {

    // Color con significado fijo (ver planDayColor.js) -- se aplica en
    // .day-center para anular ahí el color por TIPO que WorkoutIcon.css ya
    // trae de fábrica (usado tal cual en el resto de la app), sin tocar
    // esa hoja de estilos global.
    const colorClass = `day-color-${resolveDayColorKey(session)}`;

    return `

        <div
            class="
                timeline-day
                ${isToday ? "is-today" : ""}
                ${isSelected ? "is-selected" : ""}
                ${isRest ? "is-rest" : ""}
            "
            data-session-id="${session.id}"
            data-date="${session.date}"
            data-gym-day-id="${session.gymDayId ?? ""}"
            data-gym-completed="${session.gymCompleted ? "true" : ""}"
        >

            <div class="timeline-top">

                <span class="day-name">

                    ${session.day}

                </span>

                <span class="day-number">

                    ${formatDayNumber(session.date)}

                </span>

            </div>

            <div class="day-center ${colorClass}">

                ${WorkoutIcon(session.type, { selected: isSelected })}

                ${isCompleted ? `
                    <span class="day-check">
                        <iconify-icon icon="solar:check-circle-bold"></iconify-icon>
                    </span>
                ` : ""}

                ${session.hasGym ? `
                    <span class="day-gym-badge ${session.gymCompleted ? "is-completed" : ""}">
                        <iconify-icon icon="solar:dumbbell-large-bold-duotone"></iconify-icon>
                    </span>
                ` : ""}

            </div>

        </div>

    `;

}
