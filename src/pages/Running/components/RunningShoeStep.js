import "./RunningShoeStep.css";

import { formatDayMonth } from "../../../utils/date.js";
import { formatSecondsAsClock, formatShoeName } from "../../../utils/format.js";

function workoutSummary(workout) {

    const distance = workout.distanceKm != null ? `${workout.distanceKm} km` : "—";
    const duration = workout.durationSec != null ? formatSecondsAsClock(workout.durationSec) : "—";
    const date = workout.date ? formatDayMonth(workout.date) : "Sin fecha";

    return `${date} · ${distance} · ${duration}`;

}

function DuplicateWarning(existingWorkout, newWorkout) {

    return `

        <div class="wizard-banner wizard-banner-warning">

            <iconify-icon icon="solar:copy-bold-duotone"></iconify-icon>

            <div class="duplicate-summary">

                <strong>Ya existe un entrenamiento parecido</strong>

                <p>Guardado: ${workoutSummary(existingWorkout)}</p>

                <p>Este: ${workoutSummary(newWorkout)}</p>

            </div>

        </div>

        <div class="duplicate-actions">

            <button class="wizard-primary-button" data-action="replace-duplicate">

                Sustituir el existente

            </button>

            <button class="wizard-secondary-button" data-action="save-anyway">

                Guardar de todas formas

            </button>

            <button class="shoe-add-toggle" data-action="cancel-duplicate">

                Cancelar

            </button>

        </div>

    `;

}

export function RunningShoeStep({ shoes, selectedShoeId, addingNewShoe, saveError, duplicateWarning, workout }) {

    return `

        <section class="running-wizard running-step-shoe">

            <header class="wizard-header">

                <button class="wizard-close" data-action="cancel-wizard">

                    <iconify-icon icon="solar:close-circle-bold-duotone"></iconify-icon>

                </button>

                <h2>Zapatilla</h2>

            </header>

            ${saveError ? `

                <div class="wizard-banner wizard-banner-error">

                    <iconify-icon icon="solar:danger-triangle-bold-duotone"></iconify-icon>

                    <span>${saveError}</span>

                </div>

                <button class="shoe-add-toggle" data-action="back-to-review">

                    Volver a revisar

                </button>

            ` : ""}

            ${duplicateWarning ? DuplicateWarning(duplicateWarning, workout) : `

                ${shoes.length ? `

                    <div class="shoe-list">

                        ${shoes.map(shoe => `

                            <button class="shoe-chip ${shoe.id === selectedShoeId ? "is-selected" : ""}" data-action="select-shoe" data-shoe-id="${shoe.id}">

                                <iconify-icon icon="solar:running-round-bold-duotone"></iconify-icon>

                                <span>${formatShoeName(shoe)}</span>

                            </button>

                        `).join("")}

                    </div>

                ` : `

                    <p class="shoe-empty">Todavía no has añadido ninguna zapatilla.</p>

                `}

                ${addingNewShoe ? `

                    <div class="shoe-add-form">

                        <input type="text" data-shoe-field="brand" placeholder="Marca (p. ej. Saucony)">

                        <input type="text" data-shoe-field="model" placeholder="Modelo (p. ej. Endorphin Speed 3)">

                        <button class="wizard-secondary-button" data-action="save-new-shoe">

                            Añadir zapatilla

                        </button>

                    </div>

                ` : `

                    <button class="shoe-add-toggle" data-action="toggle-add-shoe">

                        <iconify-icon icon="solar:add-circle-bold-duotone"></iconify-icon>

                        Añadir zapatilla

                    </button>

                `}

                <p class="shoe-skip-hint">

                    Puedes guardarlo sin zapatilla y asignarla más tarde.

                </p>

                <button class="wizard-primary-button" data-action="save-workout">

                    Guardar entrenamiento

                </button>

            `}

        </section>

    `;

}
