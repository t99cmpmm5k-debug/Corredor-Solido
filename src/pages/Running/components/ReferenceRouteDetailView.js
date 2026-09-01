import "./ReferenceRoutesListView.css";
import "./ReferenceRouteDetailView.css";

import { formatDayMonth } from "../../../utils/date.js";
import { formatSecondsAsClock } from "../../../utils/format.js";
import { ReferenceRouteCard } from "./ReferenceRouteCard.js";

// Fila compacta de un entreno del recorrido -- toca la fila para abrir su
// ficha completa (openDetail(), ya conectado en initRunningEvents.js vía
// data-action="open-detail" -- el listener escanea toda la pantalla en
// cada render, así que reutilizarlo aquí no necesita wiring nuevo). El
// botón "quitar" para de propagar el click (mismo motivo que
// delete-workout en RunningHistoryItem, Running.js).
function RouteWorkoutRow(workout) {

    const pace = workout.avgPaceSecPerKm != null ? `${formatSecondsAsClock(workout.avgPaceSecPerKm)}/km` : "—";
    const hr = workout.avgHr != null ? `${Math.round(workout.avgHr)} ppm` : "—";
    const temp = workout.temperatureC != null ? `${workout.temperatureC}°C` : "—";

    return `

        <div class="route-workout-row" data-action="open-detail" data-workout-id="${workout.id}">

            <span class="route-workout-date">${formatDayMonth(workout.date)}</span>

            <span class="route-workout-pace">${pace}</span>

            <span class="route-workout-hr">${hr}</span>

            <span class="route-workout-temp">${temp}</span>

            <button
                class="route-workout-remove"
                data-action="unassign-workout-from-route"
                data-workout-id="${workout.id}"
                aria-label="Quitar del recorrido"
            >

                <iconify-icon icon="solar:close-circle-bold-duotone"></iconify-icon>

            </button>

        </div>

    `;

}

export function ReferenceRouteDetailView(route, workouts) {

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

            ${sorted.length ? `

                <div class="route-workout-list">

                    ${sorted.map(RouteWorkoutRow).join("")}

                </div>

            ` : ""}

        </section>

    `;

}
