import "./ReferenceRoutesListView.css";

import { ReferenceRouteCard } from "./ReferenceRouteCard.js";
import { ReferenceRouteEvolutionChart } from "./ReferenceRouteEvolutionChart.js";
import { ReferenceRouteWorkoutTable } from "./ReferenceRouteWorkoutTable.js";

// Vista de detalle de un recorrido de referencia -- tarjeta resumen
// (ReferenceRouteCard.js) + gráfico de evolución (ritmo/FC por fecha,
// temperatura como contexto, ver ReferenceRouteEvolutionChart.js) + tabla
// ordenable con todos sus entrenos (ReferenceRouteWorkoutTable.js). Cada
// fila de la tabla abre la ficha completa real (openDetail(), ya
// conectado en initRunningEvents.js vía data-action="open-detail" -- el
// listener escanea toda la pantalla en cada render, así que reutilizarlo
// aquí no necesita wiring nuevo) y permite quitar ese entreno del
// recorrido sin borrarlo.
export function ReferenceRouteDetailView(route, workouts, sortColumn, sortDirection) {

    if (!route) return "";

    const sorted = [...workouts].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    return `

        <section class="running-wizard running-step-reference-route-detail">

            <header class="wizard-header">

                <button class="wizard-close" data-action="close-reference-route-detail">

                    <iconify-icon icon="solar:close-circle-bold-duotone"></iconify-icon>

                </button>

                <h2>${route.name}</h2>

            </header>

            ${ReferenceRouteCard(route, sorted)}

            ${ReferenceRouteEvolutionChart(sorted)}

            ${ReferenceRouteWorkoutTable(sorted, sortColumn, sortDirection)}

        </section>

    `;

}
