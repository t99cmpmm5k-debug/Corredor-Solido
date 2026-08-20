import "./GymExerciseDetailView.css";

import { formatDayMonth } from "../../../utils/date.js";

function formatWeight(weight, weightUnit) {

    return `${weight} ${weightUnit === "kg/mano" ? "kg/mano" : "kg"}`;

}

function formatVolume(volume, weightUnit) {

    return `${Math.round(volume)} ${weightUnit === "kg/mano" ? "kg/mano" : "kg"}`;

}

// "4×8" cuando todas las series hechas comparten reps (el caso normal) —
// si no coinciden (alguna serie se cortó antes o se hizo alguna extra con
// menos peso) se enseña solo el número de series, sin fingir un dato
// uniforme que no es real. El desglose exacto está siempre disponible al
// desplegar la fila (ver HistoryRow).
function setsSummary(sets) {

    const reps = sets.map(s => s.reps);
    const sameReps = reps.every(r => r === reps[0]);

    return sameReps ? `${sets.length}×${reps[0]}` : `${sets.length} series`;

}

// Resumen de progreso: compara la primera y la última sesión del
// histórico. Con menos de 2 sesiones no hay "desde cuándo" que contar —
// solo se enseña el número de sesiones, igual que "Primera vez" en el
// mini-gráfico de la sesión en curso (GymExerciseHistoryChart.js).
function ProgressSummary(history, weightUnit) {

    if (history.length < 2) {

        return `

            <div class="gym-detail-summary gym-detail-summary--single">

                <div class="gym-detail-summary-item">
                    <span class="gym-detail-summary-value">${history.length}</span>
                    <span class="gym-detail-summary-label">${history.length === 1 ? "Sesión" : "Sesiones"}</span>
                </div>

            </div>

        `;

    }

    const first = history[0];
    const last = history[history.length - 1];

    const weightDelta = last.bestWeight - first.bestWeight;
    const volumeDelta = last.volume - first.volume;

    const sign = value => (value > 0 ? "+" : "");

    return `

        <div class="gym-detail-summary">

            <div class="gym-detail-summary-item">
                <span class="gym-detail-summary-value">${sign(weightDelta)}${weightDelta} ${weightUnit === "kg/mano" ? "kg/mano" : "kg"}</span>
                <span class="gym-detail-summary-label">Desde ${formatDayMonth(first.date)}</span>
            </div>

            <div class="gym-detail-summary-item">
                <span class="gym-detail-summary-value">${sign(volumeDelta)}${Math.round(volumeDelta)} kg</span>
                <span class="gym-detail-summary-label">Volumen</span>
            </div>

            <div class="gym-detail-summary-item">
                <span class="gym-detail-summary-value">${history.length}</span>
                <span class="gym-detail-summary-label">Sesiones</span>
            </div>

        </div>

    `;

}

function HistoryRow(entry, weightUnit, expandedSessionId) {

    const expanded = expandedSessionId === entry.sessionId;

    return `

        <div class="gym-history-row-group">

            <button class="gym-history-row ${expanded ? "is-expanded" : ""}" data-action="toggle-history-row" data-session-id="${entry.sessionId}">

                <span class="gym-history-cell gym-history-cell--date">${formatDayMonth(entry.date)}</span>

                <span class="gym-history-cell">${formatWeight(entry.bestWeight, weightUnit)}</span>

                <span class="gym-history-cell">${setsSummary(entry.sets)}</span>

                <span class="gym-history-cell">${formatVolume(entry.volume, weightUnit)}</span>

                <iconify-icon icon="solar:alt-arrow-right-bold-duotone" class="gym-history-row-chevron ${expanded ? "is-expanded" : ""}"></iconify-icon>

            </button>

            ${expanded ? `

                <div class="gym-history-row-detail">

                    ${entry.sets.map((set, index) => `

                        <div class="gym-history-set-line">
                            <span class="gym-history-set-index">Serie ${index + 1}</span>
                            <span>${formatWeight(set.weight, weightUnit)} × ${set.reps}</span>
                            <span class="gym-history-set-rir">${set.rir != null ? `RIR ${set.rir}` : "—"}</span>
                        </div>

                    `).join("")}

                    <button class="gym-history-delete" data-action="delete-gym-session" data-session-id="${entry.sessionId}">

                        <iconify-icon icon="solar:trash-bin-trash-bold-duotone"></iconify-icon>
                        Borrar sesión

                    </button>

                </div>

            ` : ""}

        </div>

    `;

}

function HistoryTab(history, weightUnit, expandedSessionId) {

    if (!history.length) {

        return `

            <div class="gym-detail-empty">
                <iconify-icon icon="solar:notebook-bold-duotone"></iconify-icon>
                <p>Aún no hay sesiones registradas de este ejercicio.</p>
            </div>

        `;

    }

    // Más reciente primero — al revés que el orden cronológico en el que
    // llega history() (necesario para el gráfico y el resumen).
    const reversed = [...history].reverse();

    return `

        <div class="gym-history-table">

            <div class="gym-history-row gym-history-row--header">

                <span class="gym-history-cell gym-history-cell--date">FECHA</span>
                <span class="gym-history-cell">PESO</span>
                <span class="gym-history-cell">SERIES</span>
                <span class="gym-history-cell">VOLUMEN</span>
                <span class="gym-history-row-chevron-spacer"></span>

            </div>

            ${reversed.map(entry => HistoryRow(entry, weightUnit, expandedSessionId)).join("")}

        </div>

    `;

}

// Mismo patrón de SVG a mano que GymExerciseHistoryChart.js/
// RunningHrOverlay (RunningDetailView.js) — <polyline> sobre un viewBox
// 0-100 con preserveAspectRatio="none", puntos como <span> posicionados en
// %. Aquí sin tope de puntos (toma el histórico completo).
function GraphsTab(history, weightUnit) {

    if (history.length < 2) {

        return `

            <div class="gym-detail-empty">
                <iconify-icon icon="solar:chart-2-bold-duotone"></iconify-icon>
                <p>Hacen falta al menos dos sesiones para ver la evolución.</p>
            </div>

        `;

    }

    const weights = history.map(h => h.bestWeight);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const range = max - min;

    const coords = history.map((entry, index) => ({
        x: (index / (history.length - 1)) * 100,
        y: range === 0 ? 50 : ((entry.bestWeight - min) / range) * 100
    }));

    const linePoints = coords.map(c => `${c.x},${100 - c.y}`).join(" ");

    const dots = coords.map((c, index) => `

        <span class="gym-detail-chart-dot" style="left:${c.x}%;bottom:${c.y}%" title="${formatWeight(history[index].bestWeight, weightUnit)}"></span>

    `).join("");

    const last = history[history.length - 1];

    return `

        <div class="gym-detail-chart">

            <div class="gym-detail-chart-header">

                <h3 class="gym-detail-chart-title">EVOLUCIÓN DE PESO</h3>

                <span class="gym-detail-chart-badge">${formatWeight(last.bestWeight, weightUnit)}</span>

            </div>

            <div class="gym-detail-chart-track">

                <svg class="gym-detail-chart-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <polyline class="gym-detail-chart-line" points="${linePoints}" />
                </svg>

                ${dots}

            </div>

            <div class="gym-detail-chart-axis">
                <span>${formatDayMonth(history[0].date)}</span>
                <span>${formatDayMonth(last.date)}</span>
            </div>

        </div>

    `;

}

export function GymExerciseDetailView(definition, history, activeTab, expandedSessionId) {

    return `

        <div class="gym-detail">

            <header class="gym-detail-header">

                <button class="gym-close" data-action="close-exercise-detail">

                    <iconify-icon icon="solar:close-circle-bold-duotone"></iconify-icon>

                </button>

                <h2>${definition.name}</h2>

            </header>

            ${ProgressSummary(history, definition.weightUnit)}

            <div class="gym-detail-tabs">

                <button class="gym-detail-tab ${activeTab === "historial" ? "is-active" : ""}" data-action="set-exercise-detail-tab" data-tab="historial">HISTORIAL</button>

                <button class="gym-detail-tab ${activeTab === "graficas" ? "is-active" : ""}" data-action="set-exercise-detail-tab" data-tab="graficas">GRÁFICAS</button>

            </div>

            ${activeTab === "graficas" ? GraphsTab(history, definition.weightUnit) : HistoryTab(history, definition.weightUnit, expandedSessionId)}

        </div>

    `;

}
