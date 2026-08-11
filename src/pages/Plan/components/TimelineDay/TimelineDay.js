import "./TimelineDay.css";
import { WorkoutIcon } from "../../../../components/WorkoutIcon/WorkoutIcon";
import { formatDayNumber } from "../../../../utils/date.js";

// isToday: fecha real de hoy (más grande + más brillo)
// isSelected: día tocado en el timeline, controla lo que se ve abajo
// isCompleted: session.status === "completed", muestra el check
export function TimelineDay(session, { isToday, isSelected, isCompleted }) {

    return `

        <div
            class="
                timeline-day
                ${isToday ? "is-today" : ""}
                ${isSelected ? "is-selected" : ""}
            "
            data-date="${session.date}"
        >

            <div class="timeline-top">

                <span class="day-name">

                    ${session.day}

                </span>

                <span class="day-number">

                    ${formatDayNumber(session.date)}

                </span>

            </div>

            <div class="day-center">

                ${WorkoutIcon(session.type, { selected: isSelected })}

                ${isCompleted ? `
                    <span class="day-check">
                        <iconify-icon icon="solar:check-circle-bold"></iconify-icon>
                    </span>
                ` : ""}

            </div>

            <div class="day-stem ${session.type ?? "generic"} ${isSelected ? "is-selected" : ""}"></div>

            ${isSelected ? `
                <div class="timeline-bottom">

                    ${session.title ? `
                        <span class="timeline-title">

                            ${session.title}

                        </span>
                    ` : ""}

                    ${session.subtitle ? `
                        <span class="timeline-subtitle">

                            ${session.subtitle}

                        </span>
                    ` : ""}

                </div>
            ` : ""}

        </div>

    `;

}
