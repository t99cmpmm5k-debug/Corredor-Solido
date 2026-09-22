import "./ComunidadMapasView.css";

import { RouteMapContainer } from "../../../components/RouteMap/RouteMap.js";
import { formatDayMonth } from "../../../utils/date.js";
import { formatKm, formatSecondsAsClock } from "../../../utils/format.js";
import { buildCommunityRouteCards } from "../communityMapData.js";

// alias es texto libre puesto por CUALQUIER usuario (alias_publico, ver
// server/migrations/004_alias_publico.sql) y se renderiza aquí para que lo
// vean TODOS los demás -- a diferencia del propio en Profile.js
// (autoataque como mucho), esto es una entrada real para un XSS
// almacenado si no se escapa. Mismo escapeHtml local que ya usa
// updateNotifier.js por el mismo motivo (texto externo no confiable
// insertado por innerHTML).
function escapeHtml(text) {

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

}

// Mismo lenguaje visual que .carreras-empty (icono + texto centrado, en
// tarjeta glass) para los 3 estados no-lista de esta vista (cargando, error,
// sin ningún entreno con GPS en toda la comunidad) -- nunca un hueco en
// blanco.
function ComunidadMapasState(icon, text, actionHtml = "") {

    return `

        <div class="comunidad-empty">

            <iconify-icon icon="${icon}"></iconify-icon>

            <p>${text}</p>

            ${actionHtml}

        </div>

    `;

}

// El contenedor id="comunidad-route-map-N" lo monta initComunidadEvents.js
// (mountRouteMap en modo pequeño -- interactive:false, sin minZoom/
// defaultView, exactamente igual que el mapa pequeño de la ficha de un
// entreno propio en RunningDetailView.js) -- este componente solo pinta el
// hueco vacío, nunca sabe nada de Leaflet. Índice de la lista ya ordenada
// (buildCommunityRouteCards), no workout.id -- ids de workouts vienen de
// IndexedDBs independientes por usuario y no hay garantía real de que no
// puedan coincidir entre dos personas.
function ComunidadRouteCard(entreno, index) {

    const pace = entreno.avgPaceSecPerKm != null ? `${formatSecondsAsClock(entreno.avgPaceSecPerKm)}/km` : "—";
    const duration = entreno.durationSec != null ? formatSecondsAsClock(entreno.durationSec) : "—";
    const distance = entreno.distanceKm != null ? `${formatKm(entreno.distanceKm)} km` : "—";

    return `

        <article
            class="comunidad-route-card"
            data-action="open-comunidad-route-detail"
            data-entreno-id="${escapeHtml(entreno.id)}"
            data-entreno-alias="${escapeHtml(entreno.alias)}"
        >

            ${RouteMapContainer(`comunidad-route-map-${index}`)}

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

// entrenosState: {status, entrenos} de comunidadStore.js -- este
// componente no sabe nada de cómo se cargó ni de dónde viene, solo pinta
// según el status. "idle" y "loading" comparten el mismo aviso (la
// petición ya está en marcha o a punto de estarlo, ver
// initComunidadEvents.js: loadComunidadEntrenos() se llama en cada render
// de esta pantalla).
export function ComunidadMapasView(entrenosState) {

    const { status, entrenos } = entrenosState;

    if (status === "idle" || status === "loading") {
        return ComunidadMapasState("solar:map-point-wave-bold-duotone", "Cargando rutas de la comunidad...");
    }

    // Error simple, sin romper el resto de la app -- botón de reintentar en
    // vez de una recarga automática (sin red real, reintentar solo
    // produciría el mismo error en bucle).
    if (status === "unavailable") {
        return ComunidadMapasState(
            "solar:wifi-router-minimalistic-bold-duotone",
            "No se pudieron cargar los recorridos de la comunidad.",
            `<button class="comunidad-retry-button" data-action="retry-comunidad-entrenos">Reintentar</button>`
        );
    }

    const cards = buildCommunityRouteCards(entrenos);

    if (cards.length === 0) {
        return ComunidadMapasState("solar:map-point-wave-bold-duotone", "Todavía no hay recorridos con GPS en la comunidad.");
    }

    return `

        <div class="comunidad-route-list">

            ${cards.map((entreno, index) => ComunidadRouteCard(entreno, index)).join("")}

        </div>

    `;

}
