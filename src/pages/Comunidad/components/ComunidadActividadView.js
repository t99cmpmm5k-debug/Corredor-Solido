import "./ComunidadActividadView.css";
import "./ComunidadMapasView.css";

import { hasRouteTrace, RouteMapContainer } from "../../../components/RouteMap/RouteMap.js";
import { formatDayMonth } from "../../../utils/date.js";
import { formatKm, formatSecondsAsClock } from "../../../utils/format.js";
import { RUNNING_WORKOUT_TYPES } from "../../../data/runningWorkoutTypes.js";
import { buildCommunityFeedCards } from "../communityFeedData.js";

// Mismo escapeHtml local que ya usa ComunidadMapasView.js/Comunidad.js por
// el mismo motivo -- el alias es texto libre de OTRO usuario.
function escapeHtml(text) {

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

}

// Mismo lenguaje visual que ComunidadMapasState() (ComunidadMapasView.js) --
// duplicado a propósito, no exportado desde allí: es una pieza pequeña, y
// las dos vistas pueden divergir en su texto sin acoplarse una a la otra.
function ComunidadActividadState(icon, text, actionHtml = "") {

    return `

        <div class="comunidad-empty">

            <iconify-icon icon="${icon}"></iconify-icon>

            <p>${text}</p>

            ${actionHtml}

        </div>

    `;

}

// Solo los 4 tipos que pide esta fase (easy/long/series/race) -- Tempo se
// queda fuera a propósito, igual que en la especificación. Mismas
// etiquetas EXACTAS que ya usa Running.js (RunningTypeFilters) -- "Fácil"/
// "Larga" no son los nombres reales de la app, confirmado antes de inventar
// nada nuevo.
const ACTIVIDAD_TYPES = RUNNING_WORKOUT_TYPES.filter(t => ["easy", "long", "series", "race"].includes(t.id));

// Mismo icono por tipo que ya usa TYPE_ICON en Running.js (no exportado
// desde allí -- duplicado aquí, 4 líneas, no vale la pena importar todo
// Running.js por esto) -- para el placeholder de un entreno SIN GPS
// (Series típicamente) y para el propio chip de filtro.
const TYPE_ICON = {
    "": "solar:widget-5-bold-duotone",
    easy: "solar:running-bold-duotone",
    series: "solar:bolt-bold-duotone",
    long: "solar:route-bold-duotone",
    race: "solar:flag-2-bold-duotone"
};

function ComunidadActividadFilters(activeType) {

    const chips = [{ id: "", label: "Todos" }, ...ACTIVIDAD_TYPES];

    return `

        <div class="comunidad-activity-filters">

            ${chips.map(chip => `

                <button
                    class="comunidad-activity-filter-chip ${activeType === chip.id ? "is-selected" : ""}"
                    data-action="filter-comunidad-activity-type"
                    data-type="${chip.id}"
                >

                    <iconify-icon icon="${TYPE_ICON[chip.id]}"></iconify-icon>

                    ${chip.label}

                </button>

            `).join("")}

        </div>

    `;

}

// Placeholder sin mapa -- un entreno sin GPS real (Series típicamente, ver
// hasRouteTrace() en RouteMap.js) no tiene ninguna ruta que dibujar. Mismo
// hueco visual (misma altura que .comunidad-route-card .route-map, ver CSS)
// para que las tarjetas con y sin mapa midan igual en la misma lista --
// solo cambia el contenido interior.
function ComunidadActivityPlaceholder(type) {

    return `

        <div class="comunidad-activity-placeholder">

            <iconify-icon icon="${TYPE_ICON[type] ?? TYPE_ICON[""]}"></iconify-icon>

        </div>

    `;

}

// El contenedor id="comunidad-feed-map-N" (solo si hasRouteTrace) lo monta
// initComunidadEvents.js -- mismo mountRouteMap() en modo pequeño que ya
// usa Mapas, namespace de id propio (comunidad-feed-map, no comunidad-route-map)
// para no chocar con el de ComunidadMapasView.js aunque las dos vistas nunca
// coexistan en el DOM a la vez (mismo motivo por el que Ranking/Mapas/
// Actividad son pestañas mutuamente excluyentes).
//
// data-action="open-comunidad-route-detail" SOLO si tiene GPS -- reutiliza
// tal cual el mismo mapa fullscreen ya construido para Mapas (mismo
// data-entreno-id/-alias, mismo listener en initComunidadEvents.js, cero
// cableado nuevo). Un entreno sin ruta no tiene detalle con mapa que abrir,
// así que no es pulsable.
function ComunidadActivityCard(entreno, index) {

    const pace = entreno.avgPaceSecPerKm != null ? `${formatSecondsAsClock(entreno.avgPaceSecPerKm)}/km` : "—";
    const duration = entreno.durationSec != null ? formatSecondsAsClock(entreno.durationSec) : "—";
    const distance = entreno.distanceKm != null ? `${formatKm(entreno.distanceKm)} km` : "—";
    const withRoute = hasRouteTrace(entreno);

    return `

        <article
            class="comunidad-route-card ${withRoute ? "" : "is-routeless"}"
            ${withRoute ? `
                data-action="open-comunidad-route-detail"
                data-entreno-id="${escapeHtml(entreno.id)}"
                data-entreno-alias="${escapeHtml(entreno.alias)}"
            ` : ""}
        >

            ${withRoute ? RouteMapContainer(`comunidad-feed-map-${index}`) : ComunidadActivityPlaceholder(entreno.type)}

            <div class="comunidad-route-card-info">

                <div class="comunidad-route-card-header">

                    <span class="comunidad-route-card-alias">${escapeHtml(entreno.alias)}</span>

                    ${entreno.date ? `<span class="comunidad-route-card-date">${formatDayMonth(entreno.date)}</span>` : ""}

                </div>

                <div class="comunidad-route-card-stats">

                    <span>${distance}</span>

                    <span>${pace}</span>

                    <span>${duration}</span>

                </div>

            </div>

        </article>

    `;

}

// entrenosState: {status, entrenos} de comunidadStore.js -- LA MISMA carga
// que ya usa Mapas (ninguna petición nueva). typeFilter: "" (Todos) o un id
// real de RUNNING_WORKOUT_TYPES.
export function ComunidadActividadView(entrenosState, typeFilter) {

    const { status, entrenos } = entrenosState;

    if (status === "idle" || status === "loading") {
        return ComunidadActividadState("solar:users-group-rounded-bold-duotone", "Cargando la actividad de la comunidad...");
    }

    if (status === "unavailable") {
        return ComunidadActividadState(
            "solar:wifi-router-minimalistic-bold-duotone",
            "No se pudo cargar la actividad de la comunidad.",
            `<button class="comunidad-retry-button" data-action="retry-comunidad-entrenos">Reintentar</button>`
        );
    }

    const cards = buildCommunityFeedCards(entrenos, typeFilter);

    return `

        ${ComunidadActividadFilters(typeFilter)}

        ${cards.length === 0 ? ComunidadActividadState("solar:users-group-rounded-bold-duotone", "No hay entrenos de este tipo todavía.") : `

            <div class="comunidad-route-list">

                ${cards.map((entreno, index) => ComunidadActivityCard(entreno, index)).join("")}

            </div>

        `}

    `;

}
