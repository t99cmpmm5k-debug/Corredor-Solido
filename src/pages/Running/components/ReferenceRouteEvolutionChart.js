import "./ReferenceRouteEvolutionChart.css";

import { formatDayMonth } from "../../../utils/date.js";
import { formatSecondsAsClock } from "../../../utils/format.js";

// Gráfico de evolución de un recorrido de referencia -- ritmo medio y FC
// media por fecha, con la temperatura como dato puramente contextual
// (etiqueta pequeña bajo cada punto, nunca una serie más a comparar).
// Mismo lenguaje visual que RunningPaceChart (RunningDetailView.js: barra
// = ritmo, ventana fija alrededor de la media para no "aplanar" la
// variación real; línea+puntos = FC, en un SVG 0-100 superpuesto), pero
// código propio -- ahí el eje X es un split (km) DENTRO de un entreno, aquí
// es un ENTRENO entero dentro del recorrido; las funciones de esa pantalla
// no son reutilizables tal cual porque la forma del dato de entrada es
// distinta (workout, no split).
const CHART_HEIGHT_PX = 110;
const MIN_BAR_HEIGHT_PX = 4;

// Ventana más estrecha que la de RunningPaceChart (45s) a propósito: los
// entrenos de un mismo recorrido de referencia son, por definición,
// repeticiones del mismo esfuerzo aproximado -- su variación real de
// ritmo entre sí es mucho menor que la variación entre entrenos de tipos
// distintos de toda la app.
const PACE_WINDOW_SEC = 20;
const HR_WINDOW_BPM = 10;

// Alto real de las 2 etiquetas bajo cada barra (fecha + temperatura, ver
// .route-chart-date/.route-chart-temp en ReferenceRoutesListView.css) --
// el overlay de FC (position:absolute) necesita este mismo "bottom" para
// que su eje 0-100% coincida con la zona real de las barras, no con la
// columna entera (que incluye esas 2 etiquetas debajo). Valor medido
// contra el CSS real (line-height + gap de .route-chart-column), no
// inventado -- si esas reglas cambian, este número debe seguirlas.
const LABEL_SPACE_PX = 38;

function average(values) {
    return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function barHeightPx(paceSecPerKm, avgPaceRef) {

    const clamped = Math.min(
        Math.max(paceSecPerKm, avgPaceRef - PACE_WINDOW_SEC),
        avgPaceRef + PACE_WINDOW_SEC
    );

    const fraction = (avgPaceRef + PACE_WINDOW_SEC - clamped) / (PACE_WINDOW_SEC * 2);

    return Math.max(MIN_BAR_HEIGHT_PX, fraction * CHART_HEIGHT_PX);

}

// Mismo sentido que barHeightPx(): FC alta sube, igual que un ritmo
// rápido sube -- las dos series "suben" cuando hay más esfuerzo real.
function hrPointPercent(avgHr, avgHrRef) {

    const clamped = Math.min(
        Math.max(avgHr, avgHrRef - HR_WINDOW_BPM),
        avgHrRef + HR_WINDOW_BPM
    );

    return ((clamped - (avgHrRef - HR_WINDOW_BPM)) / (HR_WINDOW_BPM * 2)) * 100;

}

// La línea de FC solo conecta workouts CONSECUTIVOS en el eje X que
// además tengan FC real -- un hueco (entreno sin FC en medio de la serie)
// corta la línea en vez de saltar por encima interpolando un dato que no
// existe, mismo criterio que hrSegments() en RunningDetailView.js.
function hrSegments(workouts) {

    const segments = [];
    let current = [];

    workouts.forEach((workout, index) => {

        if (workout.avgHr == null) {
            if (current.length) segments.push(current);
            current = [];
            return;
        }

        current.push({ index, avgHr: workout.avgHr });

    });

    if (current.length) segments.push(current);

    return segments;

}

function HrOverlay(workouts, avgHrRef) {

    const segments = hrSegments(workouts);
    if (!segments.length) return "";

    const xPercent = index => ((index + 0.5) / workouts.length) * 100;
    const point = p => ({ x: xPercent(p.index), y: hrPointPercent(p.avgHr, avgHrRef) });

    const lines = segments
        .filter(seg => seg.length >= 2)
        .map(seg => `<polyline class="route-chart-hr-line" points="${seg.map(p => {
            const { x, y } = point(p);
            return `${x},${100 - y}`;
        }).join(" ")}" />`)
        .join("");

    const dots = segments.flat().map(p => {
        const { x, y } = point(p);
        return `<span class="route-chart-hr-dot" style="left:${x}%;bottom:${y}%" title="${Math.round(p.avgHr)} ppm"></span>`;
    }).join("");

    return `

        <svg class="route-chart-hr-lines" viewBox="0 0 100 100" preserveAspectRatio="none">${lines}</svg>

        ${dots}

    `;

}

// Sin al menos 2 entrenos con ritmo real, un gráfico de "evolución" no
// dice nada -- mismo criterio que MIN_SPLITS_FOR_CHART en RunningDetailView.js.
const MIN_WORKOUTS_FOR_CHART = 2;

export function ReferenceRouteEvolutionChart(workouts) {

    const withPace = workouts.filter(w => w.avgPaceSecPerKm != null);
    if (withPace.length < MIN_WORKOUTS_FOR_CHART) return "";

    const chronological = [...withPace].sort((a, b) => (a.date || "").localeCompare(b.date || ""));

    const avgPaceRef = average(chronological.map(w => w.avgPaceSecPerKm));
    const withHr = chronological.filter(w => w.avgHr != null);
    const avgHrRef = withHr.length ? average(withHr.map(w => w.avgHr)) : null;
    const hasHr = withHr.length > 0;

    return `

        <div class="route-evolution-chart">

            <div class="route-chart-header">

                <h3 class="route-chart-title">EVOLUCIÓN</h3>

                <div class="route-chart-badges">

                    <span class="route-chart-avg-badge">${formatSecondsAsClock(avgPaceRef)}/km medio</span>

                    ${hasHr ? `<span class="route-chart-avg-badge route-chart-avg-badge--hr">${Math.round(avgHrRef)} ppm medio</span>` : ""}

                </div>

            </div>

            <div class="route-chart-track">

                <div class="route-chart-bars">

                    ${hasHr ? `

                        <div class="route-chart-hr-overlay" style="bottom:${LABEL_SPACE_PX}px;height:${CHART_HEIGHT_PX}px">

                            ${HrOverlay(chronological, avgHrRef)}

                        </div>

                    ` : ""}

                    ${chronological.map(workout => `

                        <div class="route-chart-column">

                            <span class="route-chart-pace-value">${formatSecondsAsClock(workout.avgPaceSecPerKm)}</span>

                            <div class="route-chart-bar" style="height:${barHeightPx(workout.avgPaceSecPerKm, avgPaceRef)}px"></div>

                            <span class="route-chart-date">${formatDayMonth(workout.date)}</span>

                            ${workout.temperatureC != null ? `<span class="route-chart-temp">${workout.temperatureC}°C</span>` : ""}

                        </div>

                    `).join("")}

                </div>

            </div>

        </div>

    `;

}
