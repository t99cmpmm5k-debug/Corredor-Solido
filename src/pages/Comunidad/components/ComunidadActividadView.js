import "./ComunidadActividadView.css";

import { hasRouteTrace, RouteMapContainer } from "../../../components/RouteMap/RouteMap.js";
import { formatDayMonth } from "../../../utils/date.js";
import { formatKm, formatSecondsAsClock } from "../../../utils/format.js";
import { RUNNING_WORKOUT_TYPES } from "../../../data/runningWorkoutTypes.js";
import { buildCommunityFeedCards } from "../communityFeedData.js";

// Mismo escapeHtml local que ya usa Comunidad.js por el mismo motivo -- el
// alias es texto libre de OTRO usuario.
function escapeHtml(text) {

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

}

// .comunidad-empty vive en Comunidad.css (compartida con Ranking, la
// pestaña siempre está montada así que ya está cargada).
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

// Corazón + número (Fase 3b) -- relleno/resaltado si el usuario actual ya
// dio like (entreno.likedByMe, siempre presente en la respuesta real del
// backend -- ver server/src/routes/community.js), vacío si no. Propio
// data-action y stopPropagation() en initComunidadEvents.js -- vive DENTRO
// de una tarjeta que en el caso con GPS ya es pulsable entera (abre el
// detalle fullscreen), así que pulsar el corazón no debe abrir también el
// mapa.
function ComunidadLikeButton(entreno) {

    const liked = !!entreno.likedByMe;
    const count = entreno.likesCount ?? 0;

    return `

        <button
            class="comunidad-like-button ${liked ? "is-liked" : ""}"
            data-action="toggle-comunidad-like"
            data-entreno-id="${escapeHtml(entreno.id)}"
            aria-label="${liked ? "Quitar me gusta" : "Dar me gusta"}"
        >

            <iconify-icon icon="${liked ? "solar:heart-bold" : "solar:heart-linear"}"></iconify-icon>

            <span>${count}</span>

        </button>

    `;

}

// Solo texto, no un botón -- no tiene acción propia (punto 11: mostrar el
// número, no abrir nada aparte): la tarjeta entera ya es pulsable y abre el
// detalle real, donde de verdad se leen/escriben comentarios (ver
// ComunidadCommentsPanel.js).
function ComunidadCommentCountBadge(entreno) {

    return `

        <span class="comunidad-comment-count">

            <iconify-icon icon="solar:chat-round-dots-linear"></iconify-icon>

            <span>${entreno.commentsCount ?? 0}</span>

        </span>

    `;

}

// El contenedor id="comunidad-feed-map-N" (solo si hasRouteTrace) lo monta
// initComunidadEvents.js -- mismo mountRouteMap() en modo pequeño que ya
// usa el mapa de un entreno propio (RunningDetailView.js).
//
// TODA tarjeta es pulsable ahora (antes solo las que tenían GPS) -- los
// likes ya se podían dar a cualquier entreno (Fase 3b) y los comentarios
// también son de "cualquier entreno" (Fase 3c, pedido explícito en el
// backend); sin esto, una tarjeta sin GPS podría mostrar "3 comentarios"
// sin ninguna forma real de leerlos o añadir uno. Sin GPS, el propio
// detalle (Comunidad.js) muestra un hueco simple en vez de mapa -- nunca
// intenta montar Leaflet sobre nada.
function ComunidadActivityCard(entreno, index) {

    const pace = entreno.avgPaceSecPerKm != null ? `${formatSecondsAsClock(entreno.avgPaceSecPerKm)}/km` : "—";
    const duration = entreno.durationSec != null ? formatSecondsAsClock(entreno.durationSec) : "—";
    const distance = entreno.distanceKm != null ? `${formatKm(entreno.distanceKm)} km` : "—";
    const withRoute = hasRouteTrace(entreno);

    return `

        <article
            class="comunidad-route-card"
            data-action="open-comunidad-route-detail"
            data-entreno-id="${escapeHtml(entreno.id)}"
            data-entreno-alias="${escapeHtml(entreno.alias)}"
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

                <div class="comunidad-route-card-footer">

                    ${ComunidadLikeButton(entreno)}

                    ${ComunidadCommentCountBadge(entreno)}

                </div>

            </div>

        </article>

    `;

}

// entrenosState: {status, entrenos} de comunidadStore.js -- LA MISMA carga
// que también usa Ranking (ninguna petición nueva por pestaña). typeFilter:
// "" (Todos) o un id real de RUNNING_WORKOUT_TYPES.
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
