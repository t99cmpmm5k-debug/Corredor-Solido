import "./GymBodyComposition.css";
import "./GymNutrition.css";

import { getNutritionEntriesForDate, sumNutrition, MEALS, defaultMealForHour } from "../../../data/nutritionStore.js";
import { formatISODate, formatDayMonth, formatWeekday, addDays } from "../../../utils/date.js";
import { formatKm } from "../../../utils/format.js";
import { getNutritionDate, getNutritionQuery, getNutritionSearch, getNutritionSelectedProduct, getNutritionPendingDeleteId, getNutritionView } from "../gymStore.js";
import { GymDiet } from "./GymDiet.js";

// Pestaña "Nutrición" de Gimnasio: resumen del día, buscador de alimentos
// (Open Food Facts, ver services/openFoodFacts.js) y registro del día
// agrupado por comida. Mismo lenguaje visual que Composición corporal:
// tarjetas .gym-bodycomp-form, métricas .gym-bodycomp-metric, borrado en
// dos toques. Un valor que el producto no trae se muestra "—", nunca 0.

// Nombres y marcas vienen de Open Food Facts (texto libre de terceros) --
// siempre escapados antes de ir a innerHTML, también dentro de atributos.
function escapeHtml(text) {

    return String(text ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

}

// Gramos de macro: un decimal, coma decimal. null -> "—".
function formatGrams(value) {

    return value == null ? "—" : formatKm(value);

}

function formatKcal(value) {

    return value == null ? "—" : String(Math.round(value));

}

export function getViewedNutritionDate() {

    return getNutritionDate() ?? formatISODate(new Date());

}

// allowFuture: en Mi dieta se puede mirar el menú de los próximos días; en
// el registro libre no tiene sentido apuntar lo que aún no se ha comido.
function DayNavigator(date, { allowFuture = false } = {}) {

    const today = formatISODate(new Date());
    const label = date === today ? "Hoy" : date === addDays(today, -1) ? "Ayer" : date === addDays(today, 1) ? "Mañana" : formatWeekday(date);

    return `

        <div class="gym-nutrition-day">

            <button class="gym-bodycomp-icon-button" data-action="nutrition-day" data-date="${addDays(date, -1)}" aria-label="Día anterior">
                <iconify-icon icon="solar:alt-arrow-left-linear"></iconify-icon>
            </button>

            <div class="gym-nutrition-day-label">
                <strong>${label}</strong>
                <span>${formatDayMonth(date)}</span>
            </div>

            <button class="gym-bodycomp-icon-button" data-action="nutrition-day" data-date="${addDays(date, 1)}" aria-label="Día siguiente" ${!allowFuture && date >= today ? "disabled" : ""}>
                <iconify-icon icon="solar:alt-arrow-right-linear"></iconify-icon>
            </button>

        </div>

    `;

}

const MACRO_LABELS = { kcal: "calorías", protein: "proteína", carbs: "carbohidratos", fat: "grasa" };

function DailySummary(entries) {

    const { totals, missing } = sumNutrition(entries);

    // Alimentos a los que les falta algún valor: el total de ese valor no
    // los incluye, y se dice en vez de darlo por completo.
    const gaps = Object.entries(missing)
        .filter(([, count]) => count > 0)
        .map(([key, count]) => `${count} sin dato de ${MACRO_LABELS[key]}`);

    return `

        <section class="gym-bodycomp-form gym-nutrition-summary">

            <h3 class="gym-bodycomp-title">Total del día</h3>

            <div class="gym-nutrition-kcal">
                <strong>${entries.length ? totals.kcal : 0}</strong>
                <span>kcal</span>
            </div>

            <div class="gym-bodycomp-metrics">
                ${Metric("Proteína", totals.protein)}
                ${Metric("Carbohidratos", totals.carbs)}
                ${Metric("Grasa", totals.fat)}
            </div>

            ${gaps.length ? `<p class="gym-nutrition-note">Incompleto: ${gaps.join(", ")} — ese total no los incluye.</p>` : ""}

        </section>

    `;

}

function Metric(label, grams) {

    return `

        <span class="gym-bodycomp-metric">
            <small>${label}</small>
            <strong>${formatGrams(grams)} g</strong>
        </span>

    `;

}

// Contenido de .gym-nutrition-results -- initGymEvents.js lo repinta en
// sitio (sin rerender()) cuando llega una búsqueda, para no tocar el input
// mientras se escribe.
export function NutritionSearchResults(search) {

    if (search.status === "idle") {
        return `<p class="gym-picker-empty">Escribe al menos 3 letras para buscar en Open Food Facts.</p>`;
    }

    if (search.status === "loading") {
        return `<p class="gym-picker-empty gym-nutrition-loading">Buscando «${escapeHtml(search.query)}»…</p>`;
    }

    if (search.status === "error") {

        const message = {
            offline: "Sin conexión: no se puede buscar en Open Food Facts ahora mismo.",
            unexpected: "Open Food Facts ha respondido algo que no se puede leer."
        }[search.reason] ?? "Open Food Facts no responde ahora mismo (suele ser momentáneo).";

        return `

            <div class="gym-builder-error gym-nutrition-error">
                <p>${message} No se ha añadido nada.</p>
                <button class="gym-bodycomp-cancel" data-action="retry-food-search">
                    <iconify-icon icon="solar:refresh-bold"></iconify-icon> Reintentar
                </button>
            </div>

        `;

    }

    if (!search.products.length) {

        return `

            <div class="gym-nutrition-empty">
                <p class="gym-picker-empty">Ningún producto con datos nutricionales coincide con «${escapeHtml(search.query)}». Prueba con otro nombre o con la marca.</p>
                <button class="gym-bodycomp-cancel" data-action="retry-food-search">Buscar de nuevo</button>
            </div>

        `;

    }

    return search.products.map((product, index) => `

        <button class="gym-picker-result gym-nutrition-result" data-action="pick-food" data-index="${index}">

            <span class="gym-nutrition-result-name">
                ${escapeHtml(product.name)}
                ${product.brand ? `<small>${escapeHtml(product.brand)}</small>` : ""}
            </span>

            <span class="gym-picker-result-muscle">${formatKcal(product.per100.kcal)} kcal/100 ${product.unit}</span>

        </button>

    `).join("");

}

function MealSelect(selectedMeal) {

    return `

        <label class="gym-builder-field">
            <span>Comida</span>
            <select class="gym-nutrition-select" data-field="meal">
                ${MEALS.map(meal => `<option value="${meal.id}" ${meal.id === selectedMeal ? "selected" : ""}>${meal.label}</option>`).join("")}
            </select>
        </label>

    `;

}

// Cantidad del producto elegido. Inputs sin controlar: la vista previa de
// macros la actualiza initGymEvents.js en sitio al teclear (sin rerender),
// y todo se lee del DOM al pulsar Añadir.
function QuantityPanel(product) {

    const mode = product.serving ? "serving" : "grams";
    const p = product.per100;

    return `

        <div class="gym-nutrition-quantity" data-mode="${mode}">

            <div class="gym-nutrition-product">
                <strong>${escapeHtml(product.name)}</strong>
                ${product.brand ? `<span>${escapeHtml(product.brand)}</span>` : ""}
                <small>Por 100 ${product.unit}: ${formatKcal(p.kcal)} kcal · P ${formatGrams(p.protein)} g · C ${formatGrams(p.carbs)} g · G ${formatGrams(p.fat)} g</small>
            </div>

            <div class="gym-builder-error" data-nutrition-error hidden></div>

            ${product.serving ? `

                <div class="gym-detail-tabs gym-nutrition-mode">
                    <button class="gym-detail-tab is-active" data-action="nutrition-amount-mode" data-mode="serving">RACIONES</button>
                    <button class="gym-detail-tab" data-action="nutrition-amount-mode" data-mode="grams">${product.unit === "ml" ? "MILILITROS" : "GRAMOS"}</button>
                </div>

            ` : ""}

            <div class="gym-builder-exercise-fields gym-bodycomp-fields">

                <label>
                    <span data-amount-label>${mode === "serving" ? `Raciones <small>(${escapeHtml(product.serving.label)})</small>` : `Cantidad (${product.unit})`}</span>
                    <input type="text" inputmode="decimal" data-field="amount" value="${mode === "serving" ? "1" : ""}" placeholder="${mode === "serving" ? "1" : "100"}">
                </label>

                ${MealSelect(defaultMealForHour(new Date().getHours()))}

            </div>

            <p class="gym-nutrition-preview" data-nutrition-preview></p>

            <div class="gym-bodycomp-form-actions">
                <button class="gym-bodycomp-cancel" data-action="cancel-food-pick">Cancelar</button>
                <button class="gym-finish-button" data-action="add-food-entry">Añadir</button>
            </div>

        </div>

    `;

}

function AddFood() {

    const selected = getNutritionSelectedProduct();

    return `

        <section class="gym-bodycomp-form gym-nutrition-add">

            <h3 class="gym-bodycomp-title">Añadir alimento</h3>

            ${selected ? QuantityPanel(selected) : `

                <form class="gym-nutrition-search-form" data-action="food-search-form">
                    <input type="search" class="gym-picker-search" data-action="food-search" value="${escapeHtml(getNutritionQuery())}" placeholder="Buscar alimento o marca…" enterkeyhint="search" autocomplete="off" autocorrect="off">
                </form>

                <div class="gym-picker-results gym-nutrition-results">
                    ${NutritionSearchResults(getNutritionSearch())}
                </div>

                <p class="gym-nutrition-source">Datos de Open Food Facts.</p>

            `}

        </section>

    `;

}

function amountText(entry) {

    if (entry.servings) return `${formatKm(entry.servings.count)} × ${escapeHtml(entry.servings.label)}`;

    return `${formatKm(entry.grams)} ${entry.unit}`;

}

function EntryRow(entry, pendingDeleteId) {

    const confirming = pendingDeleteId === entry.id;

    return `

        <div class="gym-bodycomp-entry gym-nutrition-entry">

            <div class="gym-bodycomp-entry-head">

                <span class="gym-nutrition-entry-name">
                    <strong>${escapeHtml(entry.name)}</strong>
                    <small>${entry.brand ? `${escapeHtml(entry.brand)} · ` : ""}${amountText(entry)}</small>
                </span>

                <strong class="gym-nutrition-entry-kcal">${formatKcal(entry.kcal)} kcal</strong>

                <button class="gym-bodycomp-icon-button gym-bodycomp-delete ${confirming ? "is-confirming" : ""}" data-action="delete-food-entry" data-entry-id="${entry.id}" aria-label="${confirming ? "Pulsa otra vez para borrar" : "Borrar alimento"}">
                    ${confirming ? "¿Borrar?" : `<iconify-icon icon="solar:trash-bin-trash-bold-duotone"></iconify-icon>`}
                </button>

            </div>

            <p class="gym-nutrition-entry-macros">P ${formatGrams(entry.protein)} g · C ${formatGrams(entry.carbs)} g · G ${formatGrams(entry.fat)} g</p>

        </div>

    `;

}

function DayLog(entries) {

    if (!entries.length) {

        return `

            <div class="gym-detail-empty">
                <iconify-icon icon="solar:plate-bold-duotone"></iconify-icon>
                <p>Nada registrado este día. Busca un alimento arriba para añadirlo.</p>
            </div>

        `;

    }

    const pendingDeleteId = getNutritionPendingDeleteId();

    return `

        <section class="gym-bodycomp-history">

            <h3 class="gym-bodycomp-title">Registro del día</h3>

            ${MEALS.map(meal => {

                // Una comida desconocida (dato de otra versión) cae en Snack
                // antes que desaparecer de la lista.
                const items = entries.filter(e => e.meal === meal.id || (meal.id === "snack" && !MEALS.some(m => m.id === e.meal)));
                if (!items.length) return "";

                const { totals } = sumNutrition(items);

                return `

                    <div class="gym-nutrition-meal">
                        <h4 class="gym-nutrition-meal-title">${meal.label} <span>${totals.kcal} kcal</span></h4>
                        ${items.map(entry => EntryRow(entry, pendingDeleteId)).join("")}
                    </div>

                `;

            }).join("")}

        </section>

    `;

}

// Mi dieta (importada por PDF) | Registro libre (Open Food Facts) --
// mismo selector que las pestañas de Gimnasio, bajo el navegador de día
// que comparten las dos vistas.
function ViewTabs(view) {

    return `

        <div class="gym-detail-tabs">
            <button class="gym-detail-tab ${view === "dieta" ? "is-active" : ""}" data-action="set-nutrition-view" data-view="dieta">MI DIETA</button>
            <button class="gym-detail-tab ${view === "registro" ? "is-active" : ""}" data-action="set-nutrition-view" data-view="registro">REGISTRO LIBRE</button>
        </div>

    `;

}

export function GymNutrition() {

    const date = getViewedNutritionDate();
    const view = getNutritionView();

    if (view === "dieta") {

        return `

            <div class="gym-bodycomp gym-nutrition">
                ${DayNavigator(date, { allowFuture: true })}
                ${ViewTabs(view)}
                ${GymDiet(date)}
            </div>

        `;

    }

    // Venías de Mi dieta mirando un día futuro: el registro libre no admite
    // fechas futuras, se queda en hoy.
    const today = formatISODate(new Date());
    const logDate = date > today ? today : date;
    const entries = getNutritionEntriesForDate(logDate);

    return `

        <div class="gym-bodycomp gym-nutrition">

            ${DayNavigator(logDate)}

            ${ViewTabs(view)}

            ${DailySummary(entries)}

            ${AddFood()}

            ${DayLog(entries)}

        </div>

    `;

}
