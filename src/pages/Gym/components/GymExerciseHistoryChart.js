import { getExerciseHistory, getPreviousExerciseSummary } from "../../../data/gymSessionStore.js";

// Sin línea con un único punto — no dice nada sobre progreso, solo
// mostraría el badge de texto (mismo umbral que MIN_SPLITS_FOR_CHART en
// RunningDetailView.js).
const MIN_POINTS_FOR_LINE = 2;

function formatWeight(weight, weightUnit) {

    return `${weight} ${weightUnit === "kg/mano" ? "kg/mano" : "kg"}`;

}

// Un decimal como mucho, sin ceros de sobra, coma decimal -- mismo criterio
// que formatKm() en utils/format.js.
function formatSignedWeight(delta) {

    const rounded = Math.round(Math.abs(delta) * 10) / 10;
    const text = (Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)).replace(".", ",");

    return `+${text}`;

}

// Cabecera de comparación con la sesión anterior REAL (Fase 2.2) -- ya no
// solo "mejor serie anterior", sino la sesión completa ("Anterior: 4×6 @
// 60kg"), y en verde cuánto ha subido el peso de hoy si ha subido (dato
// real de la propia sesión en curso, nunca inventado -- si todavía no hay
// ninguna serie marcada hoy, o no hay sesión anterior, no se muestra
// delta).
function PreviousSessionBadge(exerciseId, weightUnit, currentSessionId, todayBestWeight) {

    const previous = getPreviousExerciseSummary(exerciseId, { excludeSessionId: currentSessionId });

    if (!previous) return `<span class="gym-exercise-badge">Primera vez</span>`;

    const mainText = `Anterior: ${previous.setsCount}×${previous.reps} @ ${formatWeight(previous.weight, weightUnit)}`;

    const delta = todayBestWeight != null ? todayBestWeight - previous.weight : null;

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
export function GymExerciseHistoryChart(exerciseId, weightUnit, currentSessionId, todayBestWeight = null) {

    // currentSessionId excluye la sesión en curso — la comparación con lo
    // anterior debe hablar de sesiones pasadas, no de una serie que se
    // acaba de marcar como hecha en la sesión que se está viendo ahora
    // mismo.
    const points = getExerciseHistory(exerciseId, { excludeSessionId: currentSessionId });
    const badge = PreviousSessionBadge(exerciseId, weightUnit, currentSessionId, todayBestWeight);

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
