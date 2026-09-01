import "./ReferenceRoutesListView.css";

import { getReferenceRoutes } from "../../../data/referenceRouteStore.js";
import { getWorkouts } from "../../../data/workoutStore.js";
import { resolveRouteWorkouts } from "../referenceRouteEfficiency.js";
import { ReferenceRouteCard } from "./ReferenceRouteCard.js";

function CreateRouteForm(name) {

    return `

        <div class="reference-route-form">

            <input
                type="text"
                data-action="set-new-route-name"
                placeholder="Nombre del recorrido (p. ej. 8K referencia)"
                value="${name}"
                autofocus
            >

            <div class="reference-route-form-actions">

                <button class="wizard-secondary-button" data-action="cancel-creating-route">Cancelar</button>

                <button class="wizard-secondary-button" data-action="save-new-route" ${name.trim() ? "" : "disabled"}>Crear</button>

            </div>

        </div>

    `;

}

// Menú "···" (borrar) de una tarjeta -- mismo patrón que .workout-menu/
// .history-menu (Plan/Running), aparte de ReferenceRouteCard.js (que es
// puramente presentación de datos, no de acciones) vía su slot
// `actionsHtml`.
function RouteCardMenu(route, isMenuOpen) {

    return `

        <div class="reference-route-menu">

            <button
                class="reference-route-menu-toggle"
                data-action="toggle-route-menu"
                data-route-id="${route.id}"
                aria-label="Más opciones"
            >

                <iconify-icon icon="solar:menu-dots-bold-duotone"></iconify-icon>

            </button>

            ${isMenuOpen ? `

                <div class="reference-route-menu-popover">

                    <button class="reference-route-menu-danger" data-action="delete-route" data-route-id="${route.id}">
                        <iconify-icon icon="solar:trash-bin-trash-bold-duotone"></iconify-icon>
                        Eliminar recorrido
                    </button>

                </div>

            ` : ""}

        </div>

    `;

}

export function ReferenceRoutesListView(creatingRoute, newRouteName, routeMenuOpenId) {

    const routes = getReferenceRoutes();
    const allWorkouts = getWorkouts();

    return `

        <section class="running-wizard running-step-reference-routes">

            <header class="wizard-header">

                <button class="wizard-close" data-action="close-reference-routes">

                    <iconify-icon icon="solar:close-circle-bold-duotone"></iconify-icon>

                </button>

                <h2>Recorridos de referencia</h2>

            </header>

            <p class="reference-routes-intro">

                Agrupa entrenos hechos en el mismo recorrido para comparar su eficiencia aeróbica -- ritmo a FC similar, no solo quién fue más rápido.

            </p>

            ${creatingRoute ? CreateRouteForm(newRouteName) : `

                <button class="wizard-secondary-button reference-routes-add" data-action="start-creating-route">

                    <iconify-icon icon="solar:add-circle-bold-duotone"></iconify-icon>

                    Crear recorrido

                </button>

            `}

            ${routes.length === 0 ? `

                <div class="running-empty-filtered">

                    <iconify-icon icon="solar:map-point-search-bold-duotone"></iconify-icon>

                    <p>Todavía no has creado ningún recorrido de referencia.</p>

                </div>

            ` : `

                <div class="reference-routes-list">

                    ${routes.map(route => ReferenceRouteCard(
                        route,
                        resolveRouteWorkouts(route, allWorkouts),
                        { linkToDetail: true, actionsHtml: RouteCardMenu(route, routeMenuOpenId === route.id) }
                    )).join("")}

                </div>

            `}

        </section>

    `;

}
