import "./PlanDaySelector.css";

import { WORKOUT_TYPES } from "../../../data/workoutTypes.js";

// Etiqueta por tipo real (WORKOUT_TYPES), no "Running" fijo -- una sesión
// puede ser rodaje/series/tirada larga/etc., nunca literalmente "running".
// Con dos sesiones reales del mismo tipo el mismo día (p. ej. tras mover
// una sobre un hueco ya ocupado) añade un número para poder distinguirlas
// en la pestaña, en vez de dos botones idénticos.
function labelForItem(item, items) {

    if (item.gymOnly) return "Gimnasio";

    const typeLabel = WORKOUT_TYPES[item.type]?.label ?? "Sesión";
    const sameType = items.filter(other => !other.gymOnly && other.type === item.type);

    if (sameType.length <= 1) return typeLabel;

    const ordinal = sameType.findIndex(other => other.id === item.id) + 1;
    return `${typeLabel} ${ordinal}`;

}

// Pestañas para alternar qué sesión ocupa la tarjeta de detalle cuando un
// mismo día tiene 2+ elementos reales (running + gimnasio a la vez, o dos
// sesiones movidas/duplicadas sobre el mismo hueco) -- sin esto, la que no
// gana por defecto (ver "running manda" en PlanTimeline.js/
// initPlanEvents.js) quedaba sin ninguna forma de verse o tocarse. Solo se
// llama con 2+ items (ver Plan.js) -- un día de un solo elemento se sigue
// viendo exactamente igual que siempre, sin esta barra.
export function PlanDaySelector(items, activeId) {

    return `

        <div class="plan-day-selector" role="tablist">

            ${items.map(item => `

                <button
                    class="plan-day-selector-tab ${item.id === activeId ? "is-active" : ""} ${item.gymOnly ? "is-gym" : ""}"
                    role="tab"
                    aria-selected="${item.id === activeId}"
                    data-action="select-day-item"
                    data-item-id="${item.id}"
                >

                    ${labelForItem(item, items)}

                </button>

            `).join("")}

        </div>

    `;

}
