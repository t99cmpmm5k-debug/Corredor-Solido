import "./WeeklyProgressChart.css";

import { formatSecondsAsClock, formatKm } from "../../../utils/format.js";
import { formatDayMonth } from "../../../utils/date.js";

// "Progreso" (Running, Capa 2) -- volumen (barras) + ritmo medio (línea
// superpuesta) de las últimas 4 semanas reales, `weeks` ya viene calculado
// por buildWeeklyProgress() (ver runningWeeklyProgress.js para el porqué
// de solo estas 2 métricas). Mismo lenguaje visual que
// ReferenceRouteEvolutionChart.js (barra = métrica principal, línea+puntos
// = métrica secundaria, SVG 0-100 superpuesto) -- código propio porque el
// eje X aquí es una SEMANA agregada, no un entreno suelto, así que la
// forma del dato de entrada (y qué hacer con una semana sin entrenos) es
// distinta.
const CHART_HEIGHT_PX = 110;
const MIN_BAR_HEIGHT_PX = 4;

function average(values) {
    return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// Escala simple 0..max (no una ventana ± como en ReferenceRouteEvolutionChart):
// ahí las repeticiones de un mismo recorrido varían poco entre sí y una
// ventana estrecha exagera la diferencia real; aquí el volumen semanal de
// alguien puede ir de 0 (semana sin correr) a 60km+, así que la escala
// tiene que arrancar en 0 de verdad -- una ventana ± aplanaría justo la
// semana en 0 que el requisito pide que se vea clara.
// MIN_BAR_HEIGHT_PX siempre, incluso en 0km -- una semana real sin
// entrenos necesita un testigo visible (el rayado de
// .weekly-progress-bar--empty) para leerse como "sin actividad", no como
// si esa columna no existiera.
function barHeightPx(km, maxKm) {

    if (km <= 0 || maxKm <= 0) return MIN_BAR_HEIGHT_PX;

    return Math.max(MIN_BAR_HEIGHT_PX, (km / maxKm) * CHART_HEIGHT_PX);

}

function paceLabel(avgPaceSecPerKm) {
    return avgPaceSecPerKm != null ? `${formatSecondsAsClock(avgPaceSecPerKm)}/km` : null;
}

// La línea de ritmo solo conecta semanas CONSECUTIVAS en el eje X que
// además tengan ritmo real -- una semana sin entrenos (o con entrenos
// pero sin ritmo, caso raro) corta la línea en vez de interpolar un dato
// que no existe, mismo criterio que hrSegments() en
// ReferenceRouteEvolutionChart.js/RunningDetailView.js.
function paceSegments(weeks) {

    const segments = [];
    let current = [];

    weeks.forEach((week, index) => {

        if (week.avgPaceSecPerKm == null) {
            if (current.length) segments.push(current);
            current = [];
            return;
        }

        current.push({ index, avgPaceSecPerKm: week.avgPaceSecPerKm });

    });

    if (current.length) segments.push(current);

    return segments;

}

function PaceOverlay(weeks, paceRef, paceWindowSec) {

    const segments = paceSegments(weeks);
    if (!segments.length) return "";

    const xPercent = index => ((index + 0.5) / weeks.length) * 100;

    // Ritmo rápido (número bajo) sube en el gráfico, igual que barHeightPx
    // hace subir la barra de km cuanta más distancia -- las dos series
    // "suben" cuando hay más volumen/mejor ritmo, nunca al revés.
    const yPercent = pace => {
        const clamped = Math.min(Math.max(pace, paceRef - paceWindowSec), paceRef + paceWindowSec);
        return ((paceRef + paceWindowSec - clamped) / (paceWindowSec * 2)) * 100;
    };

    const point = p => ({ x: xPercent(p.index), y: yPercent(p.avgPaceSecPerKm) });

    const lines = segments
        .filter(seg => seg.length >= 2)
        .map(seg => `<polyline class="weekly-progress-pace-line" points="${seg.map(p => {
            const { x, y } = point(p);
            return `${x},${100 - y}`;
        }).join(" ")}" />`)
        .join("");

    const dots = segments.flat().map(p => {
        const { x, y } = point(p);
        return `<span class="weekly-progress-pace-dot" style="left:${x}%;bottom:${y}%" title="${paceLabel(p.avgPaceSecPerKm)}"></span>`;
    }).join("");

    return `

        <svg class="weekly-progress-pace-lines" viewBox="0 0 100 100" preserveAspectRatio="none">${lines}</svg>

        ${dots}

    `;

}

// Ventana visual de la línea de ritmo alrededor de la media real de las
// semanas con dato -- mismo motivo que PACE_WINDOW_SEC en
// ReferenceRouteEvolutionChart.js (sin ventana, una variación real de
// pocos segundos/km apenas movería la línea), pero más ancha (45s) porque
// aquí se comparan semanas enteras de tipos de entreno distintos, no
// repeticiones del mismo recorrido.
const PACE_WINDOW_SEC = 45;

function WeeklyProgressUnavailable() {

    return `

        <div class="weekly-progress-card">

            <div class="weekly-progress-header">

                <span class="weekly-progress-icon">
                    <iconify-icon icon="solar:chart-square-bold-duotone"></iconify-icon>
                </span>

                <span class="weekly-progress-label">PROGRESO</span>

            </div>

            <p class="weekly-progress-message">Necesitas entrenos reales en al menos 2 semanas distintas para ver tu progreso semanal.</p>

        </div>

    `;

}

export function WeeklyProgressChart(progress) {

    if (!progress.available) return WeeklyProgressUnavailable();

    const { weeks } = progress;

    const maxKm = Math.max(...weeks.map(w => w.totalKm));
    const weeksWithPace = weeks.filter(w => w.avgPaceSecPerKm != null);
    const paceRef = weeksWithPace.length ? average(weeksWithPace.map(w => w.avgPaceSecPerKm)) : null;

    return `

        <div class="weekly-progress-card">

            <div class="weekly-progress-header">

                <span class="weekly-progress-icon">
                    <iconify-icon icon="solar:chart-square-bold-duotone"></iconify-icon>
                </span>

                <div class="weekly-progress-header-text">
                    <span class="weekly-progress-label">PROGRESO</span>
                    <span class="weekly-progress-sublabel">Últimas ${weeks.length} semanas · volumen y ritmo medio</span>
                </div>

            </div>

            <div class="weekly-progress-track">

                <div class="weekly-progress-bars">

                    ${paceRef != null ? `

                        <div class="weekly-progress-pace-overlay" style="bottom:34px;height:${CHART_HEIGHT_PX}px">

                            ${PaceOverlay(weeks, paceRef, PACE_WINDOW_SEC)}

                        </div>

                    ` : ""}

                    ${weeks.map(week => `

                        <div class="weekly-progress-column">

                            <span class="weekly-progress-km-value">${week.hasWorkouts ? `${formatKm(week.totalKm)} km` : "—"}</span>

                            <div class="weekly-progress-bar ${week.hasWorkouts ? "" : "weekly-progress-bar--empty"}" style="height:${barHeightPx(week.totalKm, maxKm)}px"></div>

                            <span class="weekly-progress-week-label">${formatDayMonth(week.weekStart)}</span>

                        </div>

                    `).join("")}

                </div>

            </div>

            <div class="weekly-progress-legend">

                <span class="weekly-progress-legend-item">
                    <span class="weekly-progress-legend-swatch weekly-progress-legend-swatch--km"></span>
                    Km
                </span>

                ${paceRef != null ? `

                    <span class="weekly-progress-legend-item">
                        <span class="weekly-progress-legend-swatch weekly-progress-legend-swatch--pace"></span>
                        Ritmo medio
                    </span>

                ` : ""}

            </div>

        </div>

    `;

}
