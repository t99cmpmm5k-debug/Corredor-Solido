import "./TimelineDay.css";
import { WorkoutIcon } from "../../../../components/WorkoutIcon/WorkoutIcon";
import { formatDayNumber } from "../../../../utils/date.js";
import { resolveDayColorKey } from "../../planDayColor.js";
import { WORKOUT_TYPES } from "../../../../data/workoutTypes.js";

// Cápsula bajo el día seleccionado (fase 3 del pulido de Plan): antes
// mostraba session.title/subtitle tal cual, casi siempre null para una
// sesión real (solo lo rellena una importación con datos explícitos) --
// "MAR 25 / 8 km · Rodaje (Z2)", siempre con datos reales: el día+fecha
// (mismos campos que ya pinta .timeline-top arriba, repetidos aquí para
// que la cápsula se lea sola sin tener que mirar arriba), el km real si
// lo hay (nunca "0 km"), y el título real de la sesión si lo trae la
// importación -- o si no, la etiqueta genérica de su tipo
// (WORKOUT_TYPES, la misma que ya usa el resto de la app) en vez de
// dejarlo en blanco. Un día de gimnasio sigue mostrando el nombre real
// de su rutina (session.subtitle, puesto por attachGymInfo() en
// PlanTimeline.js) sin tocar.
function buildCapsuleText(session) {

    if (session.subtitle) return session.subtitle;

    const parts = [];

    if (session.volume > 0) parts.push(`${session.volume} km`);
    parts.push(session.title || WORKOUT_TYPES[session.type]?.label || "Sesión");

    return `${session.day} ${formatDayNumber(session.date)} / ${parts.join(" · ")}`;

}

// isToday: fecha real de hoy -- lift+brillo (ya existía) MÁS un punto
// pequeño (.day-today-dot) sobre el icono, señal explícita aparte del
// halo grande de selección para que "hoy" y "seleccionado" nunca se
// confundan cuando son el mismo día (caso por defecto al entrar en Plan).
// isSelected: día tocado en el timeline, controla lo que se ve abajo
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

                ${isToday ? `<span class="day-today-dot" aria-label="Hoy"></span>` : ""}

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

            ${isSelected ? `
                <div class="timeline-bottom">

                    <span class="timeline-capsule">

                        ${buildCapsuleText(session)}

                    </span>

                </div>
            ` : ""}

        </div>

    `;

}
