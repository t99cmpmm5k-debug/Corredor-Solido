import "./RunningShoesScreen.css";

import { getShoeTotalKm } from "../../../data/workoutStore.js";
import { formatShoeName } from "../../../utils/format.js";

export function formatKm(km) {

    return `${km.toFixed(2).replace(".", ",")} km`;

}

// Barra solo si hay límite de vida útil (opcional, lo pone el usuario al
// crear la zapatilla) — sin límite no hay denominador con el que calcular
// un %, así que se muestra solo el número de km, nunca un % inventado.
// Exportada porque el resumen compacto de Running (RunningShoeMileageSummary
// en Running.js) necesita el mismo umbral de aviso (80%/100%) sin duplicar
// el cálculo — un solo sitio decide "esto ya está gastada", no dos.
export function shoeBarPercent(shoe, km) {

    if (shoe.lifetimeKm == null) return null;

    const percent = (km / shoe.lifetimeKm) * 100;

    return {
        percent,
        fillPercent: Math.min(100, percent),
        tier: percent >= 100 ? "danger" : percent >= 80 ? "warning" : "normal"
    };

}

// Zapatilla "principal" (pulido 2026-09-29): la marcada a mano con
// "Marcar como principal" (isPrimary, ver setPrimaryShoe() en
// workoutStore.js) y, si ninguna activa lo está todavía, la activa con más
// km -- el mismo criterio que ya usaba el resumen compacto de Running
// antes de existir la marca, para que nada cambie hasta que el usuario
// elija. null sin ninguna activa.
export function getPrimaryShoe(shoes) {

    const active = shoes.filter(s => s.status !== "retired");
    if (!active.length) return null;

    return active.find(s => s.isPrimary)
        ?? active.reduce((best, s) => getShoeTotalKm(s.id) > getShoeTotalKm(best.id) ? s : best);

}

// Badge de estado de cada tarjeta: Principal / Rotación / Retirada. "Activa"
// a secas no se usa como badge porque la principal y las de rotación lo son
// las dos -- no distinguiría nada.
const SHOE_ROLE_BADGES = {
    primary: { label: "Principal", className: "shoe-badge--primary" },
    rotation: { label: "Rotación", className: "shoe-badge--rotation" },
    retired: { label: "Retirada", className: "shoe-badge--retired" }
};

function ShoeBadge(role) {

    const badge = SHOE_ROLE_BADGES[role];
    return `<span class="shoe-badge ${badge.className}">${badge.label}</span>`;

}

// Menú "•••" de cada tarjeta (sustituye a los botones grandes Editar/
// Retirar) -- mismo patrón que el "···" de las tarjetas del historial
// (history-menu en Running.js): popover que se cierra al tocar fuera, ver
// initRunningEvents.js. Las acciones reutilizan los data-action que ya
// existían (edit-shoe, retire-shoe, reactivate-shoe).
function ShoeMenu(shoe, role, isOpen, isEditing) {

    const item = (action, icon, label, extraClass = "") => `

        <button class="${extraClass}" data-action="${action}" data-shoe-id="${shoe.id}">

            <iconify-icon icon="${icon}"></iconify-icon>

            ${label}

        </button>

    `;

    const items = role === "retired"
        ? [item("reactivate-shoe", "solar:restart-bold-duotone", "Reactivar")]
        : [
            item("edit-shoe", "solar:pen-bold-duotone", isEditing ? "Cancelar edición" : "Editar"),
            ...(role === "primary" ? [] : [item("set-primary-shoe", "solar:star-bold-duotone", "Marcar como principal")]),
            item("retire-shoe", "solar:archive-down-minimlistic-bold-duotone", "Retirar", "shoe-menu-danger")
        ];

    return `

        <div class="shoe-menu">

            <button class="shoe-menu-toggle" data-action="toggle-shoe-menu" data-shoe-id="${shoe.id}" aria-label="Más opciones">

                <iconify-icon icon="solar:menu-dots-bold-duotone"></iconify-icon>

            </button>

            ${isOpen ? `<div class="shoe-menu-popover">${items.join("")}</div>` : ""}

        </div>

    `;

}

// Contexto bajo el total (pulido 2026-09-29): "3 zapatillas activas · 1
// principal · 2 en rotación" -- solo conteos reales, las partes a cero se
// omiten (sin rotación no se dice "0 en rotación").
export function shoesContextLine(activeCount, hasPrimary) {

    if (!activeCount) return "";

    const rotation = activeCount - (hasPrimary ? 1 : 0);
    const parts = [`${activeCount} ${activeCount === 1 ? "zapatilla activa" : "zapatillas activas"}`];

    if (hasPrimary) parts.push("1 principal");
    if (rotation > 0) parts.push(`${rotation} en rotación`);

    return parts.join(" · ");

}

function ShoeBar(shoe, km) {

    const bar = shoeBarPercent(shoe, km);

    if (!bar) {
        return `<p class="shoe-km-plain">${formatKm(km)}</p>`;
    }

    return `

        <div class="shoe-bar">

            <div class="shoe-bar-track">

                <div class="shoe-bar-fill shoe-bar-fill--${bar.tier}" style="--progress:${bar.fillPercent}%"></div>

            </div>

            <p class="shoe-bar-label">${formatKm(km)} / ${formatKm(shoe.lifetimeKm)} · ${Math.round(bar.percent)}% usado</p>

        </div>

        ${bar.percent >= 100 ? `

            <p class="shoe-limit-warning">

                <iconify-icon icon="solar:danger-triangle-bold-duotone"></iconify-icon>

                Ha superado el límite recomendado — plantéate retirarla.

            </p>

        ` : ""}

    `;

}

export function ShoePhoto(photoSrc) {

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

            <!-- El "900" del placeholder es solo un número de referencia
                 genérico (razonable para amortiguación máxima) -- nunca se
                 calcula ni se sugiere distinto según marca/modelo, y nunca
                 se guarda como valor real sin que el usuario lo escriba y
                 confirme con "Guardar". -->
            <input
                type="number"
                data-shoe-field="lifetimeKm"
                placeholder="Vida útil estimada en km (ej. 900, opcional)"
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

function ShoeCard(shoe, km, isEditing, pendingPhoto, role, isMenuOpen) {

    const photoSrc = (isEditing && pendingPhoto) || shoe.photo;

    return `

        <div class="shoe-card">

            <div class="shoe-card-main">

                ${ShoePhoto(photoSrc)}

                <div class="shoe-card-body">

                    <div class="shoe-card-title-row">

                        <p class="shoe-card-name">${formatShoeName(shoe)}</p>

                        ${ShoeBadge(role)}

                    </div>

                    ${ShoeBar(shoe, km)}

                </div>

                ${ShoeMenu(shoe, role, isMenuOpen, isEditing)}

            </div>

            ${isEditing ? ShoeEditForm(shoe, pendingPhoto) : ""}

        </div>

    `;

}

function RetiredShoeCard(shoe, km, isMenuOpen) {

    return `

        <div class="shoe-card shoe-card--retired">

            <div class="shoe-card-main">

                ${ShoePhoto(shoe.photo)}

                <div class="shoe-card-body">

                    <div class="shoe-card-title-row">

                        <p class="shoe-card-name">${formatShoeName(shoe)}</p>

                        ${ShoeBadge("retired")}

                    </div>

                    <p class="shoe-km-plain">${formatKm(km)}</p>

                </div>

                ${ShoeMenu(shoe, "retired", isMenuOpen, false)}

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
                placeholder="Vida útil estimada en km (ej. 900, opcional)"
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

export function RunningShoesScreen({ shoes, addingNewShoe, editingShoeId, newShoePhoto, shoeMenuOpenId = null }) {

    const active = shoes.filter(s => s.status !== "retired");
    const retired = shoes.filter(s => s.status === "retired");

    // La principal siempre arriba del listado de activas.
    const primary = getPrimaryShoe(shoes);
    const activeSorted = [...active].sort((a, b) => (b.id === primary?.id) - (a.id === primary?.id));

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

                ${active.length ? `<span class="shoes-total-context">${shoesContextLine(active.length, !!primary)}</span>` : ""}

            </div>

            ${active.length === 0 ? `

                <p class="shoes-empty">Todavía no has añadido ninguna zapatilla.</p>

            ` : `

                <div class="shoes-list">

                    ${activeSorted.map(shoe => ShoeCard(
                        shoe,
                        getShoeTotalKm(shoe.id),
                        shoe.id === editingShoeId,
                        newShoePhoto,
                        shoe.id === primary?.id ? "primary" : "rotation",
                        shoe.id === shoeMenuOpenId
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

                    ${retired.map(shoe => RetiredShoeCard(shoe, getShoeTotalKm(shoe.id), shoe.id === shoeMenuOpenId)).join("")}

                </div>

            ` : ""}

        </section>

    `;

}
