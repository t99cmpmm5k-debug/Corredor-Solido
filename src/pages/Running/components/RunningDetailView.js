import "./RunningDetailView.css";

import { formatWeekday, formatDayMonth } from "../../../utils/date.js";
import { formatSecondsAsClock, formatShoeName } from "../../../utils/format.js";
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

// Misma idea que PACE_WINDOW_SEC pero para FC: ventana fija alrededor de
// la FC media propia de la carrera, no del rango min/max real.
const HR_WINDOW_BPM = 15;

function capitalize(text) {

    return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;

}

function chartSplits(workout) {

    const splits = (workout.splits || []).filter(s => s.paceSecPerKm != null);
    if (!splits.length) return [];

    // El heurístico de "vuelta remanente" asume una Vuelta normal cortada a
    // medias al parar el cronómetro — una Recuperación corta de Intervalos
    // (segmentType) es dato real, no un remanente, y nunca debe descartarse
    // por su distancia.
    const last = splits[splits.length - 1];
    const trimmed = last.segmentType == null && last.distanceKm != null && last.distanceKm < RESIDUAL_LAP_THRESHOLD_KM
        ? splits.slice(0, -1)
        : splits;

    return trimmed;

}

function averagePace(workout, splits) {

    // Un entreno de Intervalos mezcla ritmos de Carrera y Recuperación muy
    // distintos entre sí — el ritmo medio de Resumen (workout.avgPaceSecPerKm)
    // también los mezcla, porque la distancia y el tiempo totales de Garmin
    // incluyen el descanso. Aquí interesa el ritmo real del esfuerzo, así
    // que se calcula aparte solo con los tramos de Carrera.
    const workSplits = splits.filter(s => s.segmentType === "work");
    if (workSplits.length) {
        return workSplits.reduce((sum, s) => sum + s.paceSecPerKm, 0) / workSplits.length;
    }

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

function averageHr(workout, splits) {

    if (workout.avgHr != null) return workout.avgHr;

    const values = splits.map(s => s.avgHr).filter(v => v != null);
    if (!values.length) return null;

    return values.reduce((sum, v) => sum + v, 0) / values.length;

}

// % vertical (0 = abajo del todo, 100 = arriba del todo) dentro de la
// misma zona donde crecen las barras — FC alta sube, igual que un ritmo
// rápido sube en barHeightPx(), para que las dos series "suban" cuando
// hay más esfuerzo y se lean con el mismo lenguaje visual.
export function hrPointPercent(avgHr, avgHrRef) {

    const clamped = Math.min(
        Math.max(avgHr, avgHrRef - HR_WINDOW_BPM),
        avgHrRef + HR_WINDOW_BPM
    );

    const fraction = (clamped - (avgHrRef - HR_WINDOW_BPM)) / (HR_WINDOW_BPM * 2);

    return fraction * 100;

}

// Agrupa los splits con FC válida en tramos contiguos — cada hueco
// (sensor perdido, o split sin FC porque viene de Garmin OCR) cierra el
// tramo anterior en vez de dejar que la línea salte por encima
// interpolando un dato que no existe.
export function hrSegments(splits) {

    const segments = [];
    let current = [];

    splits.forEach((split, index) => {

        if (split.avgHr == null) {
            if (current.length) segments.push(current);
            current = [];
            return;
        }

        current.push({ index, avgHr: split.avgHr });

    });

    if (current.length) segments.push(current);

    return segments;

}

function RunningHrOverlay(splits, avgHrRef) {

    const segments = hrSegments(splits);
    if (!segments.length) return "";

    const xPercent = index => ((index + 0.5) / splits.length) * 100;
    const point = p => ({ x: xPercent(p.index), y: hrPointPercent(p.avgHr, avgHrRef) });

    const lines = segments
        .filter(seg => seg.length >= 2)
        .map(seg => `<polyline class="pace-chart-hr-line" points="${seg.map(p => {
            const { x, y } = point(p);
            return `${x},${100 - y}`;
        }).join(" ")}" />`)
        .join("");

    const dots = segments.flat().map(p => {
        const { x, y } = point(p);
        return `<span class="pace-chart-hr-dot" style="left:${x}%;bottom:${y}%"></span>`;
    }).join("");

    // Mismo valor que ya se muestra sobre cada barra de ritmo, pero para
    // FC — solo se pintan donde hrSegments() ya decidió que hay un punto
    // real (nunca sobre un hueco).
    const values = segments.flat().map(p => {
        const { x, y } = point(p);
        return `<span class="pace-chart-hr-value" style="left:${x}%;bottom:${y}%">${Math.round(p.avgHr)}</span>`;
    }).join("");

    return `

        <svg class="pace-chart-hr-lines" viewBox="0 0 100 100" preserveAspectRatio="none">${lines}</svg>

        ${dots}

        ${values}

    `;

}

function RunningPaceChart(splits, avgPaceRef, avgHrRef) {

    // Con Recuperación de por medio, "más lento" sería siempre un tramo de
    // descanso — obvio y sin interés. El destacado de más rápido/más lento
    // solo compara los tramos de Carrera entre sí cuando hay segmentType.
    const paceSplits = splits.some(s => s.segmentType)
        ? splits.filter(s => s.segmentType === "work")
        : splits;

    const fastestPace = Math.min(...paceSplits.map(s => s.paceSecPerKm));
    const slowestPace = Math.max(...paceSplits.map(s => s.paceSecPerKm));
    const hasVariation = fastestPace !== slowestPace;

    // La insignia de FC media y la línea por km son datos independientes:
    // Garmin (OCR) solo trae la media general (pantalla Resumen/
    // Estadísticas) — su "Vueltas" no tabula FC por vuelta, solo la
    // dibuja como gráfica continua, así que no hay forma de leerla por
    // OCR. Amazfit (TCX) sí trae FC por trackpoint y por tanto por split.
    // La insignia se muestra siempre que haya media; la línea solo si hay
    // al menos un split con FC real que graficar — nunca se inventa.
    const hasAvgHr = avgHrRef != null;
    const hasHrLine = splits.some(s => s.avgHr != null);

    return `

        <div class="pace-chart">

            <div class="pace-chart-header">

                <h3 class="pace-chart-title">RITMO POR KILÓMETRO</h3>

                <div class="pace-chart-badges">

                    <span class="pace-chart-avg-badge">${formatSecondsAsClock(avgPaceRef)}/km medio</span>

                    ${hasAvgHr ? `<span class="pace-chart-avg-badge pace-chart-avg-badge--hr">${Math.round(avgHrRef)} ppm medio</span>` : ""}

                </div>

            </div>

            <div class="pace-chart-track">

                <div class="pace-chart-bars">

                    <div class="pace-chart-refline" style="bottom:${REFLINE_BOTTOM_PX}px"></div>

                    ${splits.map(split => {

                        const isRest = split.segmentType === "rest";
                        const isFastest = !isRest && hasVariation && split.paceSecPerKm === fastestPace;
                        const isSlowest = !isRest && hasVariation && split.paceSecPerKm === slowestPace;

                        return `

                            <div class="pace-chart-column">

                                <span class="pace-chart-value">${formatSecondsAsClock(split.paceSecPerKm)}</span>

                                <div
                                    class="pace-chart-bar ${isFastest ? "is-fastest" : ""} ${isSlowest ? "is-slowest" : ""} ${isRest ? "is-rest" : ""}"
                                    style="height:${barHeightPx(split.paceSecPerKm, avgPaceRef)}px"
                                ></div>

                                <span class="pace-chart-lap">${split.lap}</span>

                            </div>

                        `;

                    }).join("")}

                    ${hasHrLine ? `

                        <div class="pace-chart-hr-overlay" style="bottom:${LAP_LABEL_SPACE_PX}px;height:${CHART_HEIGHT_PX}px">

                            ${RunningHrOverlay(splits, avgHrRef)}

                        </div>

                    ` : ""}

                </div>

            </div>

            ${hasHrLine ? `

                <div class="pace-chart-legend">

                    <span class="pace-chart-legend-item"><i class="pace-chart-legend-dot pace-chart-legend-dot--pace"></i>Ritmo</span>

                    <span class="pace-chart-legend-item"><i class="pace-chart-legend-dot pace-chart-legend-dot--hr"></i>FC</span>

                </div>

            ` : ""}

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

// Zapatillas retiradas se excluyen de las opciones (no tiene sentido
// reasignar una carrera a una zapatilla que ya no se usa), salvo que sea
// la que este entreno ya tiene asignada — si no, cambiar de pantalla tras
// retirarla haría "desaparecer" en silencio la que de verdad se usó.
function shoeSelector(workout, shoes) {

    const options = shoes.filter(shoe => shoe.status !== "retired" || shoe.id === workout.shoeId);

    return `

        <select class="detail-shoe-select" data-action="set-workout-shoe" data-workout-id="${workout.id}">

            <option value="" ${!workout.shoeId ? "selected" : ""}>Sin zapatilla</option>

            ${options.map(shoe => `

                <option value="${shoe.id}" ${workout.shoeId === shoe.id ? "selected" : ""}>

                    ${formatShoeName(shoe)}

                </option>

            `).join("")}

        </select>

    `;

}

// badge opcional: { icon, title } -- hoy solo lo usa Temperatura, para
// avisar cuando el valor viene de la estimación climática de Open-Meteo
// (ver weatherEstimate.js) y no de una medición real del reloj.
function detailStat(icon, label, value, badge) {

    return `

        <div class="detail-stat">

            <iconify-icon icon="${icon}"></iconify-icon>

            <div class="detail-stat-text">

                <span class="detail-stat-value">${value}</span>

                <span class="detail-stat-label">

                    ${label}

                    ${badge ? `<iconify-icon icon="${badge.icon}" class="detail-stat-badge" title="${badge.title}"></iconify-icon>` : ""}

                </span>

            </div>

        </div>

    `;

}

export function RunningDetailView(workout, shoes = []) {

    if (!workout) return "";

    const distance = workout.distanceKm != null ? `${workout.distanceKm} km` : "—";
    const duration = workout.durationSec != null ? formatSecondsAsClock(workout.durationSec) : "—";
    const avgPace = workout.avgPaceSecPerKm != null ? `${formatSecondsAsClock(workout.avgPaceSecPerKm)}/km` : "—";

    const splits = chartSplits(workout);
    const avgPaceRef = averagePace(workout, splits);
    const avgHrRef = averageHr(workout, splits);
    const warnings = workout.importWarnings || [];

    const temperature = workout.temperatureC != null ? `${workout.temperatureC}°C` : "—";
    const isEstimatedTemp = workout.temperatureC != null && workout.fieldMeta?.temperatureC?.estimated === true;

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

            ${splits.length >= MIN_SPLITS_FOR_CHART ? RunningPaceChart(splits, avgPaceRef, avgHrRef) : ""}

            <div class="detail-stats">

                ${detailStat("solar:running-round-bold-duotone", "Zapatilla", shoeSelector(workout, shoes))}

                ${detailStat("solar:fire-bold-duotone", "Calorías", workout.calories != null ? `${workout.calories} kcal` : "—")}

                ${detailStat("solar:round-alt-arrow-up-bold-duotone", "Cadencia", workout.avgCadence != null ? `${workout.avgCadence} spm` : "—")}

                ${detailStat("solar:route-bold-duotone", "Desnivel +", workout.elevationGainM != null ? `${workout.elevationGainM} m` : "—")}

                ${detailStat("solar:clock-circle-bold-duotone", "Hora", workout.time || "—")}

                ${detailStat(
                    "solar:temperature-bold-duotone",
                    "Temperatura",
                    temperature,
                    isEstimatedTemp ? { icon: "solar:cloud-bold-duotone", title: "Estimada por ubicación y fecha — no es una medición real del reloj" } : null
                )}

            </div>

        </section>

    `;

}
