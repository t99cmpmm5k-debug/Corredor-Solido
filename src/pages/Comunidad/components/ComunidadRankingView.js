import "./ComunidadRankingView.css";

import { formatSecondsAsClock, formatKm } from "../../../utils/format.js";
import { formatDayMonth } from "../../../utils/date.js";
import {
    buildFastestPaceRanking, buildZ2Ranking, buildConsistencyRanking, buildLongRunRanking, buildSolidRanking,
    filterEntrenosByPeriod, MAX_ROWS
} from "../communityRanking.js";

// Mismo escapeHtml local que ya usa Comunidad.js por el mismo motivo -- el
// alias es texto libre de OTRO usuario.
function escapeHtml(text) {

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

}

// Coma española, un decimal -- mismo criterio que formatKm() (utils/format.js).
function formatPercent(value) {
    return `${value.toFixed(1).replace(".", ",")}%`;
}

// Pulido de cierre (punto 7) -- selector temporal Semana/Mes/Histórico,
// "week" por defecto (comunidadStore.js). Mismo lenguaje visual de chips
// que .comunidad-activity-filters (ComunidadActividadView.css), reescrito
// aparte porque viven en pantallas distintas.
const PERIODS = ["week", "month", "all"];
const PERIOD_LABELS = { week: "Semana", month: "Mes", all: "Histórico" };
const PERIOD_TITLE_WORD = { week: "semana", month: "mes", all: "histórico" };

function ComunidadRankingPeriodSelector(activePeriod) {

    return `

        <div class="comunidad-ranking-period-selector">

            ${PERIODS.map(period => `

                <button
                    class="comunidad-ranking-period-chip ${period === activePeriod ? "is-active" : ""}"
                    data-action="select-comunidad-ranking-period"
                    data-period="${period}"
                >

                    ${PERIOD_LABELS[period]}

                </button>

            `).join("")}

        </div>

    `;

}

// "General" (punto 7, respuesta explícita pedida por la especificación):
// la posición del usuario en "Ranking Sólido" (el compuesto de constancia +
// Z2 + tirada larga, ver communityRanking.js) -- es la única de las 5
// tablas pensada como un resumen global del esfuerzo, no de un solo gesto
// (ritmo/tirada/Z2 sueltos), así que es el candidato más razonable a
// "posición general" sin inventar un criterio nuevo aparte. Km/sesiones
// totales son datos reales de LA MISMA ventana activa (nunca fijos a
// "semana" aunque el selector esté en "Mes"/"Histórico"). Si el usuario no
// tiene alias configurado (myAlias null), no hay tarjeta -- mismo criterio
// de "nunca adivinar cuál sería" que ya rige el resto de Ranking.
function buildPersonalSummary(entrenos, myAlias, period) {

    if (!myAlias) return null;

    const windowed = filterEntrenosByPeriod(entrenos, { period });
    const mine = windowed.filter(e => e.alias === myAlias);

    const totalKm = mine.reduce((sum, e) => sum + (e.distanceKm ?? 0), 0);
    const sessions = mine.length;

    const solid = buildSolidRanking(entrenos, { period });
    const positionIndex = solid.findIndex(r => r.alias === myAlias);

    return { position: positionIndex === -1 ? null : positionIndex + 1, totalKm, sessions };

}

function ComunidadRankingPersonalSummary(summary, period) {

    if (!summary) return "";

    const positionText = summary.sessions === 0
        ? "Sin actividad esta ventana"
        : `${summary.position}.º general`;

    const sessionsWord = summary.sessions === 1 ? "sesión" : "sesiones";

    return `

        <div class="comunidad-ranking-summary-card">

            <span class="comunidad-ranking-summary-title">Tu ${PERIOD_TITLE_WORD[period]}</span>

            <span class="comunidad-ranking-summary-line">

                ${positionText} · ${formatKm(summary.totalKm)} km · ${summary.sessions} ${sessionsWord}

            </span>

        </div>

    `;

}

// Mismos 2 estados no-tabla (cargando/error) que ya usa Actividad,
// reutilizando literalmente sus clases (.comunidad-empty/.comunidad-retry-button,
// Comunidad.css -- compartidas porque la página siempre está montada) --
// misma data comunidadStore.entrenosState para las dos pestañas, así que
// el mismo botón "Reintentar" ya cableado en initComunidadEvents.js sirve
// aquí sin tocar nada más.
function ComunidadRankingState(icon, text, actionHtml = "") {

    return `

        <div class="comunidad-empty">

            <iconify-icon icon="${icon}"></iconify-icon>

            <p>${text}</p>

            ${actionHtml}

        </div>

    `;

}

// Podio (punto 8): 1º con el color horario de acento, 2º/3º en un azul
// grisáceo neutral, resto sin resaltar -- solo dentro del top 3 real de
// CADA tabla (nunca en la fila propia añadida aparte si queda fuera del
// top 5, esa nunca puede ser también un puesto de podio por definición).
function podiumClass(index) {

    if (index === 0) return "is-podium-1";
    if (index === 1 || index === 2) return "is-podium-2-3";
    return "";

}

function podiumIcon(index) {

    if (index === 0) return `<iconify-icon class="comunidad-ranking-podium-icon" icon="solar:cup-star-bold-duotone"></iconify-icon>`;
    if (index === 1 || index === 2) return `<iconify-icon class="comunidad-ranking-podium-icon" icon="solar:medal-ribbons-star-bold-duotone"></iconify-icon>`;
    return "";

}

// rows: SIEMPRE el listado COMPLETO ya ordenado (communityRanking.js ya no
// recorta a 5 -- ese recorte, y el añadido de la fila propia si queda fuera
// del top 5, son decisión de este componente). showValue:false (solo
// "Ranking Sólido") oculta la columna de valor -- es una puntuación interna
// de ponderación, "puede bastar con el orden resultante" (especificación).
// contextFn opcional: (row) => texto pequeño bajo el alias (distancia/fecha
// del entreno que produjo ese valor -- Mejor ritmo medio/Mejor tirada larga).
function ComunidadRankingRow(row, index, myAlias, formatValue, showValue, contextFn) {

    const isMine = row.alias === myAlias;
    const context = contextFn ? contextFn(row) : null;

    return `

        <li class="comunidad-ranking-row ${isMine ? "is-mine" : ""} ${podiumClass(index)}">

            <span class="comunidad-ranking-position">${index + 1}</span>

            <span class="comunidad-ranking-alias-block">

                <span class="comunidad-ranking-alias">${escapeHtml(row.alias)} ${podiumIcon(index)}</span>

                ${context ? `<span class="comunidad-ranking-context">${context}</span>` : ""}

            </span>

            ${showValue ? `<span class="comunidad-ranking-value">${formatValue(row.value)}</span>` : ""}

        </li>

    `;

}

// Recorta a los MAX_ROWS mejores + añade la fila propia (con su posición
// REAL en la lista completa, nunca renumerada) si el usuario queda fuera de
// ese recorte -- punto 8: "destaca siempre la fila del propio usuario...
// incluso fuera del podio", aplicado a las 5 tablas por igual, no solo a Z2
// (que es donde lo pedía explícito la especificación).
function sliceWithOwnRow(rows, myAlias) {

    const top = rows.slice(0, MAX_ROWS);
    const ownIndex = rows.findIndex(r => r.alias === myAlias);

    if (ownIndex === -1 || ownIndex < MAX_ROWS) {
        return { top, ownRow: null, ownIndex: -1 };
    }

    return { top, ownRow: rows[ownIndex], ownIndex };

}

function ComunidadRankingTable(title, subtitle, rows, formatValue, myAlias, { showValue = true, contextFn = null } = {}) {

    const { top, ownRow, ownIndex } = sliceWithOwnRow(rows, myAlias);

    return `

        <section class="comunidad-ranking-table">

            <h3 class="comunidad-ranking-title">${title}</h3>

            ${subtitle ? `<p class="comunidad-ranking-subtitle">${subtitle}</p>` : ""}

            ${top.length === 0 ? `

                <p class="comunidad-ranking-empty">Sin datos esta ventana.</p>

            ` : `

                <ol class="comunidad-ranking-rows">

                    ${top.map((row, index) => ComunidadRankingRow(row, index, myAlias, formatValue, showValue, contextFn)).join("")}

                    ${ownRow ? `

                        <li class="comunidad-ranking-own-divider">···</li>

                        ${ComunidadRankingRow(ownRow, ownIndex, myAlias, formatValue, showValue, contextFn)}

                    ` : ""}

                </ol>

            `}

        </section>

    `;

}

// entrenosState: {status, entrenos} de comunidadStore.js -- LA MISMA lista
// ya cargada para Actividad (sin ninguna llamada nueva al backend); myAlias:
// string|null (getMyProfile().aliasPublico); period: "week"/"month"/"all"
// (getComunidadRankingPeriod(), comunidadStore.js).
export function ComunidadRankingView(entrenosState, myAlias, period = "week") {

    const { status, entrenos } = entrenosState;

    if (status === "idle" || status === "loading") {
        return ComunidadRankingState("solar:ranking-bold-duotone", "Cargando el ranking de la comunidad...");
    }

    if (status === "unavailable") {
        return ComunidadRankingState(
            "solar:wifi-router-minimalistic-bold-duotone",
            "No se pudo cargar el ranking.",
            `<button class="comunidad-retry-button" data-action="retry-comunidad-entrenos">Reintentar</button>`
        );
    }

    const opts = { period };
    const summary = buildPersonalSummary(entrenos, myAlias, period);

    const paceContext = row => row.entreno ? `${formatKm(row.entreno.distanceKm)} km · ${formatDayMonth(row.entreno.date)}` : null;
    const longRunContext = row => row.entreno?.date ? formatDayMonth(row.entreno.date) : null;

    return `

        ${ComunidadRankingPeriodSelector(period)}

        ${ComunidadRankingPersonalSummary(summary, period)}

        <div class="comunidad-ranking-list">

            ${ComunidadRankingTable(
                "Mejor ritmo medio", "Entrenamientos ≥ 5 km",
                buildFastestPaceRanking(entrenos, opts), v => `${formatSecondsAsClock(v)}/km`, myAlias,
                { contextFn: paceContext }
            )}

            ${ComunidadRankingTable(
                "Z2 mejor ejecutada", "Tiempo dentro de tu Z2 objetivo",
                buildZ2Ranking(entrenos, opts), formatPercent, myAlias
            )}

            ${ComunidadRankingTable(
                "Más constante", null,
                buildConsistencyRanking(entrenos, opts), v => `${v} ${v === 1 ? "sesión" : "sesiones"}`, myAlias
            )}

            ${ComunidadRankingTable(
                "Mejor tirada larga", null,
                buildLongRunRanking(entrenos, opts), v => `${formatKm(v)} km`, myAlias,
                { contextFn: longRunContext }
            )}

            ${ComunidadRankingTable(
                "Ranking Sólido", "Constancia + Z2 + tirada larga, combinados",
                buildSolidRanking(entrenos, opts), null, myAlias,
                { showValue: false }
            )}

        </div>

    `;

}
