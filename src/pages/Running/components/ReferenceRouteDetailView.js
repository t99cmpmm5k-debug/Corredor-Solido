import "./ReferenceRoutesListView.css";

import { ReferenceRouteCard } from "./ReferenceRouteCard.js";
import { ReferenceRouteEvolutionChart } from "./ReferenceRouteEvolutionChart.js";
import { ReferenceRouteWorkoutTable } from "./ReferenceRouteWorkoutTable.js";
import { hasRouteTrace, RouteMapTapTarget, RouteMapFullscreenOverlay } from "../../../components/RouteMap/RouteMap.js";

// Vista de detalle de un recorrido de referencia -- tarjeta resumen
// (ReferenceRouteCard.js) + gráfico de evolución (ritmo/FC por fecha,
// temperatura como contexto, ver ReferenceRouteEvolutionChart.js) + tabla
// ordenable con todos sus entrenos (ReferenceRouteWorkoutTable.js). Cada
// fila de la tabla abre la ficha completa real (openDetail(), ya
// conectado en initRunningEvents.js vía data-action="open-detail" -- el
// listener escanea toda la pantalla en cada render, así que reutilizarlo
// aquí no necesita wiring nuevo) y permite quitar ese entreno del
// recorrido sin borrarlo.
export function ReferenceRouteDetailView(route, workouts, sortColumn, sortDirection, fullscreenMapOpen = false) {

    if (!route) return "";

    const sorted = [...workouts].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    const hasTrace = sorted.some(hasRouteTrace);

    // Bug real corregido (ver el mismo comentario en RunningDetailView.js):
    // mapa pequeño y overlay de pantalla completa son MUTUAMENTE
    // EXCLUYENTES -- pintar los dos a la vez dejaba el pequeño montando su
    // propia instancia de Leaflet debajo del overlay, colándose por encima
    // de él (leyenda/atribución duplicadas, botón de cerrar tapado).
    return `

        <section class="running-wizard running-step-reference-route-detail">

            <header class="wizard-header">

                <button class="wizard-close" data-action="close-reference-route-detail">

                    <iconify-icon icon="solar:close-circle-bold-duotone"></iconify-icon>

                </button>

                <h2>${route.name}</h2>

            </header>

            ${hasTrace && !fullscreenMapOpen ? RouteMapTapTarget("route-map") : ""}

            ${hasTrace && fullscreenMapOpen ? RouteMapFullscreenOverlay("route-map-fullscreen") : ""}

            ${ReferenceRouteCard(route, sorted)}

            ${ReferenceRouteEvolutionChart(sorted)}

            ${ReferenceRouteWorkoutTable(sorted, sortColumn, sortDirection)}

        </section>

    `;

}
