import "./ComunidadMapasView.css";

import { RouteMapContainer } from "../../../components/RouteMap/RouteMap.js";
import { buildCommunityLegendEntries } from "../communityMapData.js";

// alias es texto libre puesto por CUALQUIER usuario (alias_publico, ver
// server/migrations/004_alias_publico.sql) y se renderiza aquí para que lo
// vean TODOS los demás -- a diferencia del propio en Profile.js
// (autoataque como mucho), esto es una entrada real para un XSS
// almacenado si no se escapa. Mismo escapeHtml local que ya usa
// updateNotifier.js para el mismo motivo (texto externo no confiable
// insertado por innerHTML).
function escapeHtml(text) {

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

}

// Leyenda "quién es cada color" (punto 5) -- mismo patrón visual que
// RouteMapLegend() (overlay flotante en glass dentro del área del mapa,
// ver ComunidadMapasView.css/RouteMap.css), adaptado a una lista de
// personas en vez de un degradado de ritmo: aquí no hay un eje continuo
// que resumir en 2 etiquetas, cada usuario necesita su propia fila.
function ComunidadMapLegend(entries) {

    if (entries.length === 0) return "";

    return `

        <div class="comunidad-map-legend">

            ${entries.map(entry => `

                <div class="comunidad-map-legend-row">

                    <span class="comunidad-map-legend-dot" style="background:${entry.color}"></span>

                    <span class="comunidad-map-legend-alias">${escapeHtml(entry.alias)}</span>

                </div>

            `).join("")}

        </div>

    `;

}

// Mismo lenguaje visual que .carreras-empty (icono + texto centrado, en
// tarjeta glass) para los 3 estados no-mapa de esta vista (cargando, error,
// sin datos con GPS) -- nunca un hueco en blanco.
function ComunidadMapasState(icon, text, actionHtml = "") {

    return `

        <div class="comunidad-empty">

            <iconify-icon icon="${icon}"></iconify-icon>

            <p>${text}</p>

            ${actionHtml}

        </div>

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

    // Punto 7: error simple, sin romper el resto de la app -- botón de
    // reintentar en vez de una recarga automática (sin red real, reintentar
    // solo produciría el mismo error en bucle).
    if (status === "unavailable") {
        return ComunidadMapasState(
            "solar:wifi-router-minimalistic-bold-duotone",
            "No se pudieron cargar los recorridos de la comunidad.",
            `<button class="comunidad-retry-button" data-action="retry-comunidad-entrenos">Reintentar</button>`
        );
    }

    const legendEntries = buildCommunityLegendEntries(entrenos);

    // Bug real corregido: antes, sin ningún entreno con GPS en la
    // comunidad, se mostraba un estado de texto en vez de mapa -- ahora el
    // mapa se monta igual (initComunidadEvents.js le pasa defaultView,
    // centrado en Murcia, ver COMMUNITY_MAP_DEFAULT_CENTER), listo para
    // cuando aparezcan rutas reales. ComunidadMapLegend() ya devuelve ""
    // sola cuando legendEntries está vacío (punto 6 de la especificación
    // original), así que no hace falta ningún caso especial aquí.
    return `

        <div class="comunidad-map-wrap">

            ${RouteMapContainer("comunidad-map")}

            ${ComunidadMapLegend(legendEntries)}

        </div>

    `;

}
