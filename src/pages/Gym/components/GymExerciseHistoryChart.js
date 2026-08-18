import { getExerciseHistory } from "../../../data/gymSessionStore.js";

// Sin línea con un único punto — no dice nada sobre progreso, solo
// mostraría el badge de texto (mismo umbral que MIN_SPLITS_FOR_CHART en
// RunningDetailView.js).
const MIN_POINTS_FOR_LINE = 2;

function formatWeight(weight, weightUnit) {

    return `${weight} ${weightUnit === "kg/mano" ? "kg/mano" : "kg"}`;

}

// Mini-gráfico de progreso: SVG a mano con <polyline>, mismo patrón que
// RunningHrOverlay en RunningDetailView.js — puntos normalizados a un
// viewBox 0-100 con preserveAspectRatio="none" para la línea, y los puntos
// como <span> posicionados en % (no <circle> dentro del propio SVG, que
// "none" estiraría a elipses).
export function GymExerciseHistoryChart(exerciseId, weightUnit, currentSessionId) {

    // currentSessionId excluye la sesión en curso — "mejor serie anterior"
    // debe hablar de sesiones pasadas, no de una serie que se acaba de
    // marcar como hecha en la sesión que se está viendo ahora mismo.
    const points = getExerciseHistory(exerciseId, { excludeSessionId: currentSessionId });

    if (!points.length) {
        return `<span class="gym-exercise-badge">Primera vez</span>`;
    }

    const last = points[points.length - 1];
    const badge = `<span class="gym-exercise-badge">Mejor serie anterior: ${formatWeight(last.weight, weightUnit)}</span>`;

    if (points.length < MIN_POINTS_FOR_LINE) return badge;

    const weights = points.map(p => p.weight);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const range = max - min;

    const coords = points.map((p, i) => ({
        x: (i / (points.length - 1)) * 100,
        y: range === 0 ? 50 : ((p.weight - min) / range) * 100
    }));

    const linePoints = coords.map(c => `${c.x},${100 - c.y}`).join(" ");
    const dots = coords.map(c => `<span class="gym-history-dot" style="left:${c.x}%;bottom:${c.y}%"></span>`).join("");

    return `

        <div class="gym-history">

            ${badge}

            <div class="gym-history-track">

                <svg class="gym-history-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <polyline class="gym-history-line" points="${linePoints}" />
                </svg>

                ${dots}

            </div>

        </div>

    `;

}
