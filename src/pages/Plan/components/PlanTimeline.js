import "./PlanTimeline.css";

import { getCurrentWeekSessions } from "../../../data/workoutStore.js";
import { isToday } from "../../../utils/date.js";
import { TimelineDay } from "./TimelineDay/TimelineDay";

// Mismos colores por tipo que WorkoutIcon.css (ahí es donde vive la
// fuente de verdad — esto es su equivalente en JS para poder construir
// el degradado de la línea, que no puede leer clases CSS). Ids de
// WORKOUT_TYPES (src/data/workoutTypes.js) — unificado con el vocabulario
// de la importación de planes, ya no el propio de Plan.
const TIMELINE_TYPE_COLOR = {
    recovery: "var(--color-text-muted)",
    z2: "var(--color-success)",
    tempo: "var(--color-primary)",
    intervals: "#25c8ff",
    longRun: "var(--color-warning)",
    race: "var(--color-danger)",
    strength: "#2faeff",
    free: "var(--color-text-muted)",
    generic: "var(--color-text-muted)"
};

export function PlanTimeline(selectedWorkout) {

    const sessions = getCurrentWeekSessions();
    const todayIndex = sessions.findIndex(session => isToday(session.date));

    // La línea pasa por el color de cada día, de punta a punta —
    // no solo hasta "hoy". Con 0 o 1 sesión no hay tramo que dibujar
    // (index/(length-1) dividiría por cero) — se deja un color plano.
    const lineGradient = sessions.length > 1
        ? sessions
            .map((session, index) => {
                const color = TIMELINE_TYPE_COLOR[session.type] ?? TIMELINE_TYPE_COLOR.generic;
                const stop = (index / (sessions.length - 1)) * 100;
                return `${color} ${stop}%`;
            })
            .join(", ")
        : TIMELINE_TYPE_COLOR[sessions[0]?.type] ?? TIMELINE_TYPE_COLOR.generic;

    return `

        <section class="plan-timeline">

            <div
                class="timeline-line"
                style="background:linear-gradient(90deg, ${lineGradient})"
            ></div>

            ${sessions.map((session, index) =>

                TimelineDay(session, {
                    isToday: index === todayIndex,
                    isSelected: session.date === selectedWorkout?.date,
                    isCompleted: session.status === "completed"
                })

            ).join("")}

        </section>

    `;

}
