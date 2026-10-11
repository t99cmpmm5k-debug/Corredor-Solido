import { getExerciseHistory } from "../../../data/gymSessionStore.js";
import { formatDayMonth } from "../../../utils/date.js";

// Sin línea con un único punto — no dice nada sobre progreso, solo
// mostraría el badge de texto (mismo umbral que MIN_SPLITS_FOR_CHART en
// RunningDetailView.js).
const MIN_POINTS_FOR_LINE = 2;

// Un decimal como mucho, sin ceros de sobra, coma decimal -- mismo criterio
// que formatKm() en utils/format.js.
function formatSignedWeight(delta) {

    const rounded = Math.round(Math.abs(delta) * 10) / 10;
    const text = (Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)).replace(".", ",");

    return `+${text}`;

}

// Cabecera de comparación con la ÚLTIMA sesión real del ejercicio
// (previous = getLastExerciseSession(), ya emparejada por id o nombre):
// su fecha -- el kg × reps de cada serie va en la columna "Anterior" de la
// tabla, fila a fila. En verde cuánto ha subido hoy el mejor peso, solo
// si ya hay alguna serie de hoy hecha y de verdad ha subido. Sin ninguna
// sesión anterior: "Primera vez".
export function PreviousSessionBadge(previous, weightUnit, todayBestWeight = null) {

    if (!previous) return `<span class="gym-exercise-badge">Primera vez</span>`;

    const mainText = `Anterior · ${formatDayMonth(previous.date)}`;

    const previousWeights = previous.sets.filter(set => set && set.weight != null).map(set => set.weight);
    const previousBest = previousWeights.length ? Math.max(...previousWeights) : null;

    const delta = todayBestWeight != null && previousBest != null ? todayBestWeight - previousBest : null;

    const deltaHtml = delta != null && delta > 0
        ? `<span class="gym-exercise-badge-delta">${formatSignedWeight(delta)}${weightUnit === "kg/mano" ? "kg/mano" : "kg"} vs última sesión</span>`
        : "";

    return `<span class="gym-exercise-badge">${mainText}</span>${deltaHtml}`;

}

// Mini-gráfico de progreso: SVG a mano con <polyline>, mismo patrón que
// RunningHrOverlay en RunningDetailView.js — puntos normalizados a un
// viewBox 0-100 con preserveAspectRatio="none" para la línea, y los puntos
// como <span> posicionados en % (no <circle> dentro del propio SVG, que
// "none" estiraría a elipses).
export function GymExerciseHistoryChart(exerciseId, weightUnit, currentSessionId, todayBestWeight = null, { name = null, previous = null } = {}) {

    // currentSessionId excluye la sesión en curso — la comparación con lo
    // anterior debe hablar de sesiones pasadas, no de una serie que se
    // acaba de marcar como hecha en la sesión que se está viendo ahora
    // mismo.
    const points = getExerciseHistory(exerciseId, { excludeSessionId: currentSessionId, name });
    const badge = PreviousSessionBadge(previous, weightUnit, todayBestWeight);

    if (!points.length) return badge;

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
