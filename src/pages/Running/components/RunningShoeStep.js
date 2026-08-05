import "./RunningShoeStep.css";

export function RunningShoeStep({ shoes, selectedShoeId, addingNewShoe, saveError }) {

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

            ` : ""}

            ${shoes.length ? `

                <div class="shoe-list">

                    ${shoes.map(shoe => `

                        <button class="shoe-chip ${shoe.id === selectedShoeId ? "is-selected" : ""}" data-action="select-shoe" data-shoe-id="${shoe.id}">

                            <iconify-icon icon="solar:running-round-bold-duotone"></iconify-icon>

                            <span>${shoe.brand} ${shoe.model}</span>

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

        </section>

    `;

}
