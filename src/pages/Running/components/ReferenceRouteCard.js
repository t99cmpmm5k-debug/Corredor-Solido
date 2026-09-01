import { formatSecondsAsClock } from "../../../utils/format.js";
import { buildCardiacDrift } from "../../../utils/cardiacDrift.js";
import { findBestEfficiencyWorkout, buildEfficiencyTrend } from "../referenceRouteEfficiency.js";

// Tarjeta resumen de un recorrido de referencia -- mismo formato pedido
// en la especificación:
//   "8K referencia"
//   "Último: 5:49/km · 151 ppm · 29°C"
//   "Mejor eficiencia: 5:33/km · 150 ppm"
//   "Deriva FC: 3,5% · Muy buena"
//   "Tendencia: +16 s/km respecto al mejor registro"
// Reutilizada tal cual en ReferenceRoutesListView.js (una por recorrido,
// resumen) y ReferenceRouteDetailView.js (el propio recorrido abierto) --
// una sola fuente de verdad para "qué significa cada línea", en vez de
// reescribirla dos veces.
//
// `workouts` ya viene resuelto (los objetos reales de workoutStore.js
// para route.workoutIds, ordenados por fecha) -- esta tarjeta es pura
// presentación, no toca IndexedDB.
function formatPace(paceSecPerKm) {
    return paceSecPerKm != null ? `${formatSecondsAsClock(paceSecPerKm)}/km` : null;
}

function formatHr(avgHr) {
    return avgHr != null ? `${Math.round(avgHr)} ppm` : null;
}

function formatTemp(temperatureC) {
    return temperatureC != null ? `${temperatureC}°C` : null;
}

// Une con " · " solo las partes que de verdad existen -- nunca "—" ni
// huecos vacíos entre separadores por un dato que ese entreno no trae.
function joinParts(parts) {
    return parts.filter(Boolean).join(" · ");
}

function lastWorkoutLine(last) {

    if (!last) return "";

    const parts = joinParts([formatPace(last.avgPaceSecPerKm), formatHr(last.avgHr), formatTemp(last.temperatureC)]);
    if (!parts) return "";

    return `<p class="reference-route-line">Último: <strong>${parts}</strong></p>`;

}

// hasMultiple: hay 2+ entrenos con ritmo+FC reales pero ninguno cae en un
// grupo mutuamente comparable (ver findBestEfficiencyWorkout()) -- no es
// "sin datos", es "los datos que hay no se pueden resumir en un único
// veredicto" (p. ej. cada entreno a una FC muy distinta de los demás).
// Se explica por qué en vez de no mostrar nada, dejando la lista completa
// de abajo (ReferenceRouteDetailView.js) como el sitio donde sí se ve
// cada entreno con su contexto real.
function bestEfficiencyLine(best, hasMultiple) {

    if (!best) {
        if (!hasMultiple) return "";
        return `<p class="reference-route-line reference-route-line--muted">FC demasiado dispersa entre estos entrenos para resumir una mejor eficiencia clara — mira la lista completa.</p>`;
    }

    const parts = joinParts([formatPace(best.avgPaceSecPerKm), formatHr(best.avgHr)]);
    if (!parts) return "";

    return `<p class="reference-route-line">Mejor eficiencia: <strong>${parts}</strong></p>`;

}

function driftLine(best) {

    if (!best) return "";

    const drift = buildCardiacDrift(best, best.splits || []);
    if (!drift) return "";

    const sign = drift.percent >= 0 ? "+" : "";
    const value = `${sign}${drift.percent.toFixed(1).replace(".", ",")}%`;

    return `<p class="reference-route-line">Deriva FC: <strong>${value}</strong> · <span class="reference-route-drift-label reference-route-drift-label--${drift.trend}">${drift.label}</span></p>`;

}

// comparable:false -- FC del último entreno demasiado distinta a la del
// mejor registro para que un simple "+X s/km" signifique algo real (ver
// referenceRouteEfficiency.js). Se muestra la FC de los dos en vez de un
// veredicto de ritmo, para que el usuario lo interprete con contexto en
// vez de una conclusión simplista.
function trendLine(trend) {

    if (!trend) return "";

    if (!trend.comparable) {
        if (trend.reason !== "hr-too-different") return "";

        return `<p class="reference-route-line reference-route-line--muted">FC muy distinta al mejor registro (${Math.round(trend.lastWorkout.avgHr)} ppm vs. ${Math.round(trend.bestWorkout.avgHr)} ppm) — ritmo no comparable directamente.</p>`;
    }

    const sign = trend.deltaSecPerKm >= 0 ? "+" : "";

    return `<p class="reference-route-line reference-route-line--muted">Tendencia: <strong>${sign}${Math.round(trend.deltaSecPerKm)} s/km</strong> respecto al mejor registro</p>`;

}

export function ReferenceRouteCard(route, workouts, { linkToDetail = false, actionsHtml = "" } = {}) {

    const sorted = [...workouts].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    const last = sorted[0] ?? null;
    const best = findBestEfficiencyWorkout(sorted);
    const trend = buildEfficiencyTrend(last, best);

    return `

        <div
            class="reference-route-card"
            ${linkToDetail ? `data-action="open-reference-route-detail" data-route-id="${route.id}"` : ""}
        >

            <div class="reference-route-header">

                <h3 class="reference-route-name">${route.name}</h3>

                <span class="reference-route-count">${workouts.length} entreno${workouts.length === 1 ? "" : "s"}</span>

                ${actionsHtml}

            </div>

            ${workouts.length === 0 ? `

                <p class="reference-route-empty">Sin entrenos asignados todavía. Asígnalos desde el menú ··· de cada entrenamiento.</p>

            ` : `

                ${lastWorkoutLine(last)}

                ${bestEfficiencyLine(best, workouts.length >= 2)}

                ${driftLine(best)}

                ${trendLine(trend)}

            `}

        </div>

    `;

}
