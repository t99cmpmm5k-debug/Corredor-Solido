import "./RunningDetailView.css";

import { formatWeekday, formatDayMonth } from "../../../utils/date.js";
import { formatSecondsAsClock } from "../../../utils/format.js";
import { RUNNING_WORKOUT_TYPES } from "../../../data/runningWorkoutTypes.js";

// Garmin cierra la vuelta en curso al parar el cronómetro, así que la
// última entrada de splits suele ser un remanente corto (0.01-0.4 km) con
// un ritmo poco representativo — se descarta del gráfico si es así.
const RESIDUAL_LAP_THRESHOLD_KM = 0.3;

// Un solo split no dice nada sobre si hubo positivo/negativo split.
const MIN_SPLITS_FOR_CHART = 2;

// Escala fija alrededor del ritmo medio (no del propio rango min/max de la
// carrera) — si no, una carrera regular y una irregular se verían igual de
// "montañosas", porque la barra más alta siempre sería la vuelta más rápida.
const PACE_WINDOW_SEC = 45;

const CHART_HEIGHT_PX = 120;
const MIN_BAR_HEIGHT_PX = 4;
const LAP_LABEL_SPACE_PX = 20;
const REFLINE_BOTTOM_PX = LAP_LABEL_SPACE_PX + CHART_HEIGHT_PX / 2;

function capitalize(text) {

    return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;

}

function chartSplits(workout) {

    const splits = (workout.splits || []).filter(s => s.paceSecPerKm != null);
    if (!splits.length) return [];

    const last = splits[splits.length - 1];
    const trimmed = last.distanceKm != null && last.distanceKm < RESIDUAL_LAP_THRESHOLD_KM
        ? splits.slice(0, -1)
        : splits;

    return trimmed;

}

function averagePace(workout, splits) {

    if (workout.avgPaceSecPerKm != null) return workout.avgPaceSecPerKm;
    if (!splits.length) return null;

    return splits.reduce((sum, s) => sum + s.paceSecPerKm, 0) / splits.length;

}

function barHeightPx(paceSecPerKm, avgPaceRef) {

    const clamped = Math.min(
        Math.max(paceSecPerKm, avgPaceRef - PACE_WINDOW_SEC),
        avgPaceRef + PACE_WINDOW_SEC
    );

    const fraction = (avgPaceRef + PACE_WINDOW_SEC - clamped) / (PACE_WINDOW_SEC * 2);

    return Math.max(MIN_BAR_HEIGHT_PX, fraction * CHART_HEIGHT_PX);

}

function RunningPaceChart(splits, avgPaceRef) {

    const fastestPace = Math.min(...splits.map(s => s.paceSecPerKm));
    const slowestPace = Math.max(...splits.map(s => s.paceSecPerKm));
    const hasVariation = fastestPace !== slowestPace;

    return `

        <div class="pace-chart">

            <div class="pace-chart-header">

                <h3 class="pace-chart-title">RITMO POR KILÓMETRO</h3>

                <span class="pace-chart-avg-badge">${formatSecondsAsClock(avgPaceRef)}/km medio</span>

            </div>

            <div class="pace-chart-track">

                <div class="pace-chart-refline" style="bottom:${REFLINE_BOTTOM_PX}px"></div>

                <div class="pace-chart-bars">

                    ${splits.map(split => {

                        const isFastest = hasVariation && split.paceSecPerKm === fastestPace;
                        const isSlowest = hasVariation && split.paceSecPerKm === slowestPace;
                        const showValue = isFastest || isSlowest;

                        return `

                            <div class="pace-chart-column">

                                <span class="pace-chart-value">${showValue ? formatSecondsAsClock(split.paceSecPerKm) : ""}</span>

                                <div
                                    class="pace-chart-bar ${isFastest ? "is-fastest" : ""} ${isSlowest ? "is-slowest" : ""}"
                                    style="height:${barHeightPx(split.paceSecPerKm, avgPaceRef)}px"
                                ></div>

                                <span class="pace-chart-lap">${split.lap}</span>

                            </div>

                        `;

                    }).join("")}

                </div>

            </div>

        </div>

    `;

}

// Retroactivo: entrenamientos guardados antes de que existiera el tipo
// no tienen workout.type — se ve "Sin tipo" en vez de caer por defecto
// en la primera opción real, para no fingir una clasificación que nunca
// se hizo. En cuanto se elige uno, updateWorkoutType() lo persiste sin
// pasar por el wizard de importación (ver initRunningEvents.js).
function typeSelector(workout) {

    return `

        <select class="detail-type-select" data-action="set-workout-type" data-workout-id="${workout.id}">

            <option value="" ${!workout.type ? "selected" : ""} disabled hidden>Sin tipo</option>

            ${RUNNING_WORKOUT_TYPES.map(option => `

                <option value="${option.id}" ${workout.type === option.id ? "selected" : ""}>

                    ${option.label}

                </option>

            `).join("")}

        </select>

    `;

}

function detailStat(icon, label, value) {

    return `

        <div class="detail-stat">

            <iconify-icon icon="${icon}"></iconify-icon>

            <div class="detail-stat-text">

                <span class="detail-stat-value">${value}</span>

                <span class="detail-stat-label">${label}</span>

            </div>

        </div>

    `;

}

export function RunningDetailView(workout) {

    if (!workout) return "";

    const distance = workout.distanceKm != null ? `${workout.distanceKm} km` : "—";
    const duration = workout.durationSec != null ? formatSecondsAsClock(workout.durationSec) : "—";
    const avgPace = workout.avgPaceSecPerKm != null ? `${formatSecondsAsClock(workout.avgPaceSecPerKm)}/km` : "—";

    const splits = chartSplits(workout);
    const avgPaceRef = averagePace(workout, splits);
    const warnings = workout.importWarnings || [];

    return `

        <section class="running-detail">

            <header class="wizard-header">

                <button class="wizard-close" data-action="close-detail">

                    <iconify-icon icon="solar:close-circle-bold-duotone"></iconify-icon>

                </button>

                <div class="detail-title">

                    <h2>${capitalize(formatWeekday(workout.date))} · ${formatDayMonth(workout.date)}</h2>

                    ${workout.time ? `<span class="detail-time">${workout.time}</span>` : ""}

                </div>

                ${typeSelector(workout)}

            </header>

            ${warnings.length ? `

                <div class="wizard-banner wizard-banner-warning">

                    <iconify-icon icon="solar:danger-circle-bold-duotone"></iconify-icon>

                    <ul>

                        ${warnings.map(w => `<li>${w}</li>`).join("")}

                    </ul>

                </div>

            ` : ""}

            <div class="detail-summary">

                <div class="detail-summary-item">
                    <span class="detail-summary-value">${distance}</span>
                    <span class="detail-summary-label">Distancia</span>
                </div>

                <div class="detail-summary-item">
                    <span class="detail-summary-value">${duration}</span>
                    <span class="detail-summary-label">Duración</span>
                </div>

                <div class="detail-summary-item">
                    <span class="detail-summary-value">${avgPace}</span>
                    <span class="detail-summary-label">Ritmo medio</span>
                </div>

            </div>

            ${splits.length >= MIN_SPLITS_FOR_CHART ? RunningPaceChart(splits, avgPaceRef) : ""}

            <div class="detail-stats">

                ${detailStat("solar:fire-bold-duotone", "Calorías", workout.calories != null ? `${workout.calories} kcal` : "—")}

                ${detailStat("solar:round-alt-arrow-up-bold-duotone", "Cadencia", workout.avgCadence != null ? `${workout.avgCadence} spm` : "—")}

                ${detailStat("solar:mountains-bold-duotone", "Desnivel +", workout.elevationGainM != null ? `${workout.elevationGainM} m` : "—")}

                ${detailStat("solar:clock-circle-bold-duotone", "Hora", workout.time || "—")}

            </div>

        </section>

    `;

}
