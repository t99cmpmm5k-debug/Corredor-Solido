import "./PlanTimeline.css";

import { week } from "../../../data/planData";
import { isToday } from "../../../utils/date.js";
import { TimelineDay } from "./TimelineDay/TimelineDay";

// Mismos colores por tipo que WorkoutIcon.css (ahí es donde vive la
// fuente de verdad — esto es su equivalente en JS para poder construir
// el degradado de la línea, que no puede leer clases CSS).
const TIMELINE_TYPE_COLOR = {
    easy: "var(--color-success)",
    gym: "#2faeff",
    series: "#25c8ff",
    long: "var(--color-warning)",
    rest: "var(--color-text-muted)",
    free: "var(--color-text-muted)"
};

export function PlanTimeline(selectedWorkout) {

    const todayIndex = week.findIndex(session => isToday(session.date));

    // La línea pasa por el color de cada día, de punta a punta —
    // no solo hasta "hoy".
    const lineGradient = week
        .map((session, index) => {
            const color = TIMELINE_TYPE_COLOR[session.type] ?? TIMELINE_TYPE_COLOR.free;
            const stop = (index / (week.length - 1)) * 100;
            return `${color} ${stop}%`;
        })
        .join(", ");

    return `

        <section class="plan-timeline">

            <div
                class="timeline-line"
                style="background:linear-gradient(90deg, ${lineGradient})"
            ></div>

            ${week.map((session, index) =>

                TimelineDay(session, {
                    isToday: index === todayIndex,
                    isSelected: session.day === selectedWorkout.day,
                    isCompleted: session.status === "completed"
                })

            ).join("")}

        </section>

    `;

}
