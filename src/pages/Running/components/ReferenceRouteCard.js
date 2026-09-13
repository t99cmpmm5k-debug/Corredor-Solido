import { formatSecondsAsClock } from "../../../utils/format.js";
import { buildCardiacDrift } from "../../../utils/cardiacDrift.js";
import { findBestEfficiencyWorkout, buildEfficiencyTrend, buildFirstLastComparison, FIRST_LAST_TEMP_NOTE_THRESHOLD_C } from "../referenceRouteEfficiency.js";

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

// "5:49/km @151 ppm" -- mismo formato pedido en la especificación de esta
// mejora (con "@" antes de la FC, distinto del " · " que separa el resto
// de partes de una línea porque aquí ambos valores describen EL MISMO
// punto, no dos datos independientes).
function paceAtHr(workout) {

    const pace = formatPace(workout.avgPaceSecPerKm);
    if (!pace) return null;

    return workout.avgHr != null ? `${pace} @${Math.round(workout.avgHr)} ppm` : pace;

}

const FIRST_LAST_VERDICT = {
    improved: { trend: "up", label: "Mejora real" },
    worsened: { trend: "down", label: "Ligero empeoramiento" },
    unchanged: { trend: "flat", label: "Sin cambios" }
};

// Primera vez vs última vez en este recorrido -- distinta de trendLine()
// (que compara el ÚLTIMO contra el de MEJOR eficiencia, no el primero).
// Reutiliza el mismo criterio de FC similar que el resto de esta tarjeta
// (ver referenceRouteEfficiency.js): con FC muy distinta entre ambos
// extremos NO se declara "mejora"/"empeoramiento" -- se muestran los dos
// datos con su temperatura si difiere mucho (posible explicación real) y
// una frase neutra, dejando que el usuario lo interprete él mismo.
function firstLastLine(comparison) {

    if (!comparison) return "";

    const headline = `${paceAtHr(comparison.first)} → ${paceAtHr(comparison.last)}`;

    if (!comparison.comparable) {

        if (comparison.reason !== "hr-too-different") return "";

        const { first, last } = comparison;
        const bigTempSwing = first.temperatureC != null && last.temperatureC != null
            && Math.abs(last.temperatureC - first.temperatureC) >= FIRST_LAST_TEMP_NOTE_THRESHOLD_C;

        const tempNote = bigTempSwing ? ` (${first.temperatureC}°C → ${last.temperatureC}°C)` : "";

        return `<p class="reference-route-line reference-route-line--muted">Primera vez → última vez: ${headline}${tempNote} — condiciones distintas, compara con cautela.</p>`;

    }

    const { trend, label } = FIRST_LAST_VERDICT[comparison.verdict];

    return `<p class="reference-route-line">Primera vez → última vez: <strong>${headline}</strong> · <span class="reference-route-drift-label reference-route-drift-label--${trend}">${label}</span></p>`;

}

export function ReferenceRouteCard(route, workouts, { linkToDetail = false, actionsHtml = "" } = {}) {

    const sorted = [...workouts].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    const last = sorted[0] ?? null;
    const best = findBestEfficiencyWorkout(sorted);
    const trend = buildEfficiencyTrend(last, best);

    // Solo en el detalle propio del recorrido (linkToDetail:false, ver
    // ReferenceRouteDetailView.js) -- la tarjeta resumen de la lista
    // (linkToDetail:true) ya está pensada como un resumen compacto, no el
    // sitio para una segunda comparación además de "Tendencia".
    const firstLast = linkToDetail ? null : buildFirstLastComparison(sorted);

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

                ${firstLastLine(firstLast)}

            `}

        </div>

    `;

}
