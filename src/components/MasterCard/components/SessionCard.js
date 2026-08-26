import { getState } from "../../../core/state.js";
import { PlanTimeline } from "../../../pages/Plan/components/PlanTimeline.js";
import { getCurrentWeekSessions, getWorkoutForSession } from "../../../data/workoutStore.js";
import { formatISODate, getWeekStartDate } from "../../../utils/date.js";

// Etiqueta corta por tipo -- la "zona" que pide el formato compacto
// ("8 km · Zona 2 · ~46 min") es la del propio tipo de sesión, no un
// campo aparte (targetHrZone ya no se muestra aquí, ver comentario en
// compactSummary()).
const ZONE_LABEL = {
    z2: "Zona 2",
    tempo: "Tempo",
    intervals: "Series",
    longRun: "Tirada larga",
    recovery: "Recuperación",
    race: "Carrera",
    strength: "Fuerza",
    free: "Libre",
    generic: "Entreno"
};

// Compactado 2026-08-26: antes esta cabecera solo traía workout.title
// (genérico) y una rejilla de métricas aparte debajo (distancia/
// duración/ritmo/FC en tarjetas grandes) -- ahora es una sola línea con
// lo esencial. La duración es real si el propio plan la trae
// (durationSec), o una estimación calculada de dos datos reales ya
// existentes (distancia × ritmo objetivo) si no -- nunca un número
// inventado sin ninguna de las dos piezas. targetHrZone se deja fuera:
// la "zona" ya la representa el tipo (Z2, Tempo...), mostrar las dos
// hubiera sido redundante en una línea que se quiere leer de un vistazo.
function compactSummary(workout) {

    const parts = [];

    if (workout.distanceKm != null) parts.push(`${workout.distanceKm} km`);

    parts.push(ZONE_LABEL[workout.type] ?? workout.title ?? "Entreno");

    const durationSec = workout.durationSec ?? (
        workout.distanceKm != null && workout.targetPaceSecPerKm != null
            ? Math.round(workout.distanceKm * workout.targetPaceSecPerKm)
            : null
    );

    if (durationSec != null) parts.push(`~${Math.round(durationSec / 60)} min`);

    return parts.join(" · ");

}

export function SessionCard(workout) {

    const summary = compactSummary(workout);
    const detailExpanded = getState().sessionDetailExpanded;
    const weekPickerExpanded = getState().weekPickerExpanded;

    // status ya viene resuelto por withDerivedFields()/getSessionStatus()
    // (workoutStore.js) -- "completed" solo si un Workout real tiene
    // linkedSessionId === workout.id, nunca por fecha/heurística. Si es
    // "completed", SIEMPRE hay un workout real que lo respalda (es el
    // mismo campo que decidió el status), así que completedWorkoutId no
    // puede quedar null aquí -- nada que inventar.
    const completed = workout.status === "completed";
    const completedWorkoutId = completed ? getWorkoutForSession(workout.id)?.id ?? null : null;

    return `

<section class="session-card">

    <div class="session-glass"></div>

    <div class="session-highlight"></div>

    <svg class="session-outline">

        <path class="session-outline-stroke"></path>

    </svg>

    <div class="session-content">

        <header class="session-header">

            <div class="session-title">

                <i data-lucide="footprints"></i>

                <span>RUNNING DE HOY</span>

            </div>

            <div class="session-header-actions">

                ${completed ? `

                    <span class="session-completed-badge">

                        <i data-lucide="check-circle"></i>

                        Finalizada

                    </span>

                ` : ""}

                <button
                    class="session-change"
                    data-action="toggle-week-picker"
                    aria-expanded="${weekPickerExpanded}"
                >

                    <i data-lucide="refresh-cw"></i>

                    ${weekPickerExpanded ? "Cerrar" : "Cambiar"}

                </button>

            </div>

        </header>

        ${weekPickerExpanded ? `

            <div class="session-week-picker">

                ${PlanTimeline(workout, getCurrentWeekSessions(), getWeekStartDate(formatISODate(new Date())))}

            </div>

        ` : ""}

        <div class="session-type">

            <i data-lucide="footprints"></i>

            <span>${summary}</span>

        </div>

        ${completed ? `

            <button
                class="session-button"
                data-action="view-completed-workout"
                data-workout-id="${completedWorkoutId ?? ""}"
            >

                <i data-lucide="check"></i>

                Ver resumen

            </button>

        ` : workout.description ? `

            <button
                class="session-button"
                data-action="toggle-session-detail"
                aria-expanded="${detailExpanded}"
            >

                <i data-lucide="chevron-down"></i>

                ${detailExpanded ? "Ocultar detalles" : "Ver entrenamiento"}

            </button>

            ${detailExpanded ? `

                <p class="session-detail-description">

                    ${workout.description}

                </p>

            ` : ""}

        ` : `

            <button class="session-button">

                <i data-lucide="play"></i>

                Iniciar entrenamiento

            </button>

        `}

    </div>

</section>

`;

}
