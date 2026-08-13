import { formatSecondsAsClock } from "../../../utils/format.js";
import { getState } from "../../../core/state.js";

// Mismos iconos Lucide que ya usaba planData.js en sus arrays "metrics"
// hardcodeados — aquí se construyen desde los campos reales presentes en
// vez de venir ya hechos, mostrando solo los que de verdad tengan valor.
function buildMetrics(workout) {

    const metrics = [];

    if (workout.distanceKm != null) {
        metrics.push({ icon: "map-pinned", label: "Distancia", value: workout.distanceKm, unit: "km" });
    }

    if (workout.durationSec != null) {
        metrics.push({ icon: "clock-3", label: "Duración", value: formatSecondsAsClock(workout.durationSec) });
    }

    if (workout.targetPaceSecPerKm != null) {
        metrics.push({ icon: "gauge", label: "Ritmo objetivo", value: formatSecondsAsClock(workout.targetPaceSecPerKm), unit: "/km" });
    }

    if (workout.targetHrZone != null) {
        metrics.push({ icon: "heart", label: "Zona FC", value: workout.targetHrZone });
    }

    return metrics;

}

export function SessionCard(workout) {

    const metrics = buildMetrics(workout);
    const detailExpanded = getState().sessionDetailExpanded;

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

                <i data-lucide="zap"></i>

                <span>SESIÓN DE HOY</span>

            </div>

            <button class="session-change">

                <i data-lucide="refresh-cw"></i>

                Cambiar

            </button>

        </header>

        <div class="session-type">

            <i data-lucide="footprints"></i>

            <span>${workout.title ?? "Entrenamiento"}</span>

        </div>

        ${metrics.length ? `

            <div class="session-metrics">

                ${metrics.map(metric => `

                    <div class="metric">

                        <i data-lucide="${metric.icon}"></i>

                        <strong>${metric.value}${metric.unit ? `<span class="metric-unit">${metric.unit}</span>` : ""}</strong>

                        <span>${metric.label}</span>

                    </div>

                `).join("")}

            </div>

        ` : ""}

        ${workout.description ? `

            <button
                class="session-detail-toggle"
                data-action="toggle-session-detail"
                aria-expanded="${detailExpanded}"
            >

                <i data-lucide="chevron-down"></i>

                <span>${detailExpanded ? "Ocultar detalles" : "Ver entrenamiento"}</span>

            </button>

            ${detailExpanded ? `

                <p class="session-detail-description">

                    ${workout.description}

                </p>

            ` : ""}

        ` : ""}

        <button class="session-button">

            <i data-lucide="play"></i>

            Iniciar entrenamiento

        </button>

    </div>

</section>

`;

}
