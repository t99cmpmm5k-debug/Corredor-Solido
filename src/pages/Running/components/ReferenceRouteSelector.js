import { getReferenceRouteForWorkout } from "../../../data/referenceRouteStore.js";

// <select> para asignar un entreno a un recorrido de referencia -- mismo
// patrón que typeSelector()/shoeSelector() (RunningDetailView.js): un
// <select> nativo real, reutilizado tal cual tanto en el menú "···" de
// cada tarjeta del historial (Running.js) como en el propio detalle de un
// entreno. Un entreno pertenece como mucho a UN recorrido a la vez (v1,
// ver referenceRouteStore.js) -- "Sin recorrido" (value="") lo desasigna.
export function routeSelector(workout, routes) {

    if (!routes.length) return "";

    const current = getReferenceRouteForWorkout(workout.id);

    return `

        <select class="detail-route-select" data-action="set-workout-route" data-workout-id="${workout.id}">

            <option value="" ${!current ? "selected" : ""}>Sin recorrido</option>

            ${routes.map(route => `

                <option value="${route.id}" ${current?.id === route.id ? "selected" : ""}>

                    ${route.name}

                </option>

            `).join("")}

        </select>

    `;

}
