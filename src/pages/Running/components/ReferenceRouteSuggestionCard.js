import { formatDayMonth } from "../../../utils/date.js";
import { RUNNING_WORKOUT_TYPES } from "../../../data/runningWorkoutTypes.js";

// Detección automática de recorridos parecidos (referenceRouteGeometry.js)
// -- nunca agrupa sola, siempre requiere confirmar el nombre del recorrido
// nuevo (mismo mini-formulario sin controlar que CreateRouteForm en
// ReferenceRoutesListView.js, ver el porqué en runningStore.js junto a
// creatingRoute) o descartar explícitamente. Un descarte se recuerda por
// par (routeSuggestionStore.js) y no vuelve a proponerse.
function workoutLabel(workout) {

    const typeLabel = RUNNING_WORKOUT_TYPES.find(t => t.id === workout.type)?.label || "";
    return [formatDayMonth(workout.date), typeLabel].filter(Boolean).join(" · ");

}

export function ReferenceRouteSuggestionCard(workoutA, workoutB, confirmingSuggestion) {

    const isConfirming = confirmingSuggestion?.workoutIdA === workoutA.id && confirmingSuggestion?.workoutIdB === workoutB.id
        || confirmingSuggestion?.workoutIdA === workoutB.id && confirmingSuggestion?.workoutIdB === workoutA.id;

    return `

        <div class="route-suggestion-card">

            <div class="route-suggestion-header">

                <iconify-icon icon="solar:point-on-map-perspective-bold-duotone"></iconify-icon>

                <p>Recorrido parecido detectado</p>

            </div>

            <p class="route-suggestion-workouts">

                <strong>${workoutLabel(workoutA)}</strong> y <strong>${workoutLabel(workoutB)}</strong> parecen el mismo recorrido, por su trazado GPS.

            </p>

            ${isConfirming ? `

                <div class="reference-route-form">

                    <input
                        type="text"
                        data-field="suggestion-route-name"
                        placeholder="Nombre del recorrido (p. ej. 8K referencia)"
                        autofocus
                    >

                    <div class="reference-route-form-actions">

                        <button class="wizard-secondary-button" data-action="cancel-confirm-suggestion">Cancelar</button>

                        <button
                            class="wizard-secondary-button"
                            data-action="save-suggestion-route"
                            data-workout-a="${workoutA.id}"
                            data-workout-b="${workoutB.id}"
                        >Crear y agrupar</button>

                    </div>

                </div>

            ` : `

                <div class="route-suggestion-actions">

                    <button
                        class="wizard-secondary-button"
                        data-action="dismiss-route-suggestion"
                        data-workout-a="${workoutA.id}"
                        data-workout-b="${workoutB.id}"
                    >Descartar</button>

                    <button
                        class="wizard-secondary-button route-suggestion-confirm"
                        data-action="confirm-route-suggestion"
                        data-workout-a="${workoutA.id}"
                        data-workout-b="${workoutB.id}"
                    >Agrupar</button>

                </div>

            `}

        </div>

    `;

}
