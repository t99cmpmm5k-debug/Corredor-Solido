import "./RunningShoesScreen.css";

import { getShoeTotalKm } from "../../../data/workoutStore.js";

function formatKm(km) {

    return `${km.toFixed(2).replace(".", ",")} km`;

}

// Barra solo si hay límite de vida útil (opcional, lo pone el usuario al
// crear la zapatilla) — sin límite no hay denominador con el que calcular
// un %, así que se muestra solo el número de km, nunca un % inventado.
function ShoeBar(shoe, km) {

    if (shoe.lifetimeKm == null) {
        return `<p class="shoe-km-plain">${formatKm(km)}</p>`;
    }

    const percent = (km / shoe.lifetimeKm) * 100;
    const fillPercent = Math.min(100, percent);
    const tier = percent >= 100 ? "danger" : percent >= 80 ? "warning" : "normal";

    return `

        <div class="shoe-bar">

            <div class="shoe-bar-track">

                <div class="shoe-bar-fill shoe-bar-fill--${tier}" style="--progress:${fillPercent}%"></div>

            </div>

            <p class="shoe-bar-label">${formatKm(km)} / ${formatKm(shoe.lifetimeKm)}</p>

        </div>

        ${percent >= 100 ? `

            <p class="shoe-limit-warning">

                <iconify-icon icon="solar:danger-triangle-bold-duotone"></iconify-icon>

                Ha superado el límite recomendado — plantéate retirarla.

            </p>

        ` : ""}

    `;

}

function ShoePhoto(photoSrc) {

    return `

        <div class="shoe-photo">

            ${photoSrc
                ? `<img src="${photoSrc}" alt="">`
                : `<iconify-icon icon="solar:running-round-bold-duotone"></iconify-icon>`}

        </div>

    `;

}

function ShoeEditForm(shoe, pendingPhoto) {

    return `

        <div class="shoe-edit-form">

            <label class="shoe-photo-picker">

                <input type="file" class="shoe-photo-input" data-shoe-photo-target="edit" accept="image/*" hidden>

                <iconify-icon icon="solar:camera-add-bold-duotone"></iconify-icon>

                <span>${pendingPhoto || shoe.photo ? "Cambiar foto" : "Añadir foto"}</span>

            </label>

            <input
                type="number"
                data-shoe-field="lifetimeKm"
                placeholder="Límite de vida útil en km (opcional)"
                value="${shoe.lifetimeKm ?? ""}"
                min="0"
                step="1"
            >

            <button class="wizard-secondary-button" data-action="save-shoe-edit" data-shoe-id="${shoe.id}">

                Guardar

            </button>

        </div>

    `;

}

function ShoeCard(shoe, km, isEditing, pendingPhoto) {

    const photoSrc = (isEditing && pendingPhoto) || shoe.photo;

    return `

        <div class="shoe-card">

            <div class="shoe-card-main">

                ${ShoePhoto(photoSrc)}

                <div class="shoe-card-body">

                    <p class="shoe-card-name">${shoe.brand} ${shoe.model}</p>

                    ${ShoeBar(shoe, km)}

                </div>

            </div>

            <div class="shoe-card-actions">

                <button class="shoe-card-action" data-action="edit-shoe" data-shoe-id="${shoe.id}">

                    ${isEditing ? "Cancelar" : "Editar"}

                </button>

                <button class="shoe-card-action" data-action="retire-shoe" data-shoe-id="${shoe.id}">

                    Retirar

                </button>

            </div>

            ${isEditing ? ShoeEditForm(shoe, pendingPhoto) : ""}

        </div>

    `;

}

function RetiredShoeCard(shoe, km) {

    return `

        <div class="shoe-card shoe-card--retired">

            <div class="shoe-card-main">

                ${ShoePhoto(shoe.photo)}

                <div class="shoe-card-body">

                    <p class="shoe-card-name">${shoe.brand} ${shoe.model}</p>

                    <p class="shoe-km-plain">${formatKm(km)} · retirada</p>

                </div>

            </div>

            <div class="shoe-card-actions">

                <button class="shoe-card-action" data-action="reactivate-shoe" data-shoe-id="${shoe.id}">

                    Reactivar

                </button>

            </div>

        </div>

    `;

}

function AddShoeForm(pendingPhoto) {

    return `

        <div class="shoes-add-form">

            <input type="text" data-shoe-field="brand" placeholder="Marca (p. ej. Saucony)">

            <input type="text" data-shoe-field="model" placeholder="Modelo (p. ej. Endorphin Speed 3)">

            <label class="shoe-photo-picker">

                <input type="file" class="shoe-photo-input" data-shoe-photo-target="add" accept="image/*" hidden>

                <iconify-icon icon="solar:camera-add-bold-duotone"></iconify-icon>

                <span>${pendingPhoto ? "Foto añadida" : "Añadir foto (opcional)"}</span>

            </label>

            ${pendingPhoto ? `<img class="shoe-photo-preview" src="${pendingPhoto}" alt="">` : ""}

            <input
                type="number"
                data-shoe-field="lifetimeKm"
                placeholder="Límite de vida útil en km (opcional)"
                min="0"
                step="1"
            >

            <div class="shoes-add-form-actions">

                <button class="wizard-secondary-button" data-action="add-shoe">

                    Añadir zapatilla

                </button>

                <button class="shoe-card-action" data-action="cancel-add-shoe">

                    Cancelar

                </button>

            </div>

        </div>

    `;

}

export function RunningShoesScreen({ shoes, addingNewShoe, editingShoeId, newShoePhoto }) {

    const active = shoes.filter(s => s.status !== "retired");
    const retired = shoes.filter(s => s.status === "retired");

    // "Todas las zapatillas juntas" incluye las retiradas — ese kilometraje
    // se corrió igual, no desaparece porque la zapatilla se jubile.
    const totalKm = shoes.reduce((sum, s) => sum + getShoeTotalKm(s.id), 0);

    return `

        <section class="running-wizard running-step-shoes">

            <header class="wizard-header">

                <button class="wizard-close" data-action="close-shoes">

                    <iconify-icon icon="solar:close-circle-bold-duotone"></iconify-icon>

                </button>

                <h2>Zapatillas</h2>

            </header>

            <div class="shoes-total">

                <span class="shoes-total-value">${formatKm(totalKm)}</span>

                <span class="shoes-total-label">kilometraje total</span>

            </div>

            ${active.length === 0 ? `

                <p class="shoes-empty">Todavía no has añadido ninguna zapatilla.</p>

            ` : `

                <div class="shoes-list">

                    ${active.map(shoe => ShoeCard(
                        shoe,
                        getShoeTotalKm(shoe.id),
                        shoe.id === editingShoeId,
                        newShoePhoto
                    )).join("")}

                </div>

            `}

            ${addingNewShoe ? AddShoeForm(newShoePhoto) : `

                <button class="shoes-add-toggle" data-action="open-add-shoe-form">

                    <iconify-icon icon="solar:add-circle-bold-duotone"></iconify-icon>

                    Añadir zapatilla

                </button>

            `}

            ${retired.length ? `

                <h3 class="shoes-section-title">Retiradas</h3>

                <div class="shoes-list">

                    ${retired.map(shoe => RetiredShoeCard(shoe, getShoeTotalKm(shoe.id))).join("")}

                </div>

            ` : ""}

        </section>

    `;

}
