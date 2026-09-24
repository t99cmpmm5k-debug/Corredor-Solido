import { rerender } from "../../core/router.js";
import { searchFoods, macrosForAmount } from "../../services/openFoodFacts.js";
import { addNutritionEntry, deleteNutritionEntry, parseAmount, MEALS } from "../../data/nutritionStore.js";
import { formatKm } from "../../utils/format.js";
import { formatISODate } from "../../utils/date.js";
import { initGymDietEvents } from "./initGymDietEvents.js";
import { NutritionSearchResults, getViewedNutritionDate } from "./components/GymNutrition.js";
import {
    getNutritionQuery,
    setNutritionQuery,
    getNutritionSearch,
    setNutritionSearch,
    getNutritionSelectedProduct,
    setNutritionSelectedProduct,
    setNutritionDate,
    getNutritionPendingDeleteId,
    setNutritionPendingDeleteId,
    setNutritionView
} from "./gymStore.js";

// Eventos de la pestaña Nutrición de Gimnasio (ver GymNutrition.js).
//
// El buscador sigue el mismo arreglo que el de ejercicios (963ca08): input
// SIN controlar -- nunca un rerender() por tecla, que en el móvil cierra el
// teclado y sustituye el campo --, y solo se repinta .gym-nutrition-results
// en sitio. La pausa es más larga que los 150 ms de aquel porque aquí cada
// búsqueda es una petición a Open Food Facts (máximo 10 por minuto), y el
// pointerdown sobre la lista cancela cualquier refresco pendiente para que
// lo que hay bajo el dedo no cambie entre el toque y el click.
const SEARCH_DEBOUNCE_MS = 600;
const MIN_QUERY_LENGTH = 3;

let searchTimer = null;
let searchController = null;

function paintResults() {

    const container = document.querySelector(".gym-nutrition-results");
    if (container) container.innerHTML = NutritionSearchResults(getNutritionSearch());

}

async function runSearch(query) {

    clearTimeout(searchTimer);
    searchController?.abort();

    const trimmed = query.trim();

    if (trimmed.length < MIN_QUERY_LENGTH) {
        setNutritionSearch({ status: "idle", query: trimmed, products: [], reason: null });
        paintResults();
        return;
    }

    const controller = new AbortController();
    searchController = controller;

    setNutritionSearch({ status: "loading", query: trimmed, products: [], reason: null });
    paintResults();

    try {

        const result = await searchFoods(trimmed, { signal: controller.signal });
        if (controller !== searchController) return;

        setNutritionSearch(result.ok
            ? { status: "ok", query: trimmed, products: result.products, reason: null }
            : { status: "error", query: trimmed, products: [], reason: result.reason });

    } catch (err) {

        // Sustituida por una búsqueda más nueva: esa pinta su propio resultado.
        if (err.name === "AbortError" || controller !== searchController) return;
        setNutritionSearch({ status: "error", query: trimmed, products: [], reason: "unexpected" });

    }

    // Si mientras tanto hubo un rerender() completo, el contenedor es otro
    // -- paintResults() lo busca de nuevo, y si ya no está (otra pestaña),
    // el resultado queda en el store para cuando se vuelva.
    paintResults();

}

function readAmountMode() {

    return document.querySelector(".gym-nutrition-quantity")?.dataset.mode ?? "grams";

}

function showQuantityError(message) {

    const box = document.querySelector("[data-nutrition-error]");
    if (!box) return;

    box.textContent = message;
    box.hidden = !message;

}

// Vista previa de lo que se va a añadir, repintada en sitio al teclear la
// cantidad -- exactamente el mismo cálculo que se guardará.
function updatePreview() {

    const product = getNutritionSelectedProduct();
    const preview = document.querySelector("[data-nutrition-preview]");
    const input = document.querySelector('.gym-nutrition-quantity [data-field="amount"]');
    if (!product || !preview || !input) return;

    const { grams, error } = parseAmount(input.value, { mode: readAmountMode(), product });

    if (error) {
        preview.textContent = "";
        return;
    }

    const m = macrosForAmount(product.per100, grams);
    const g = value => (value == null ? "—" : formatKm(value));

    preview.textContent = `${formatKm(grams)} ${product.unit} → ${m.kcal == null ? "—" : m.kcal} kcal · P ${g(m.protein)} g · C ${g(m.carbs)} g · G ${g(m.fat)} g`;

}

function addSelectedFood() {

    const product = getNutritionSelectedProduct();
    if (!product) return;

    const amountRaw = document.querySelector('.gym-nutrition-quantity [data-field="amount"]')?.value ?? "";
    const meal = document.querySelector('.gym-nutrition-quantity [data-field="meal"]')?.value;

    const { grams, servings, error } = parseAmount(amountRaw, { mode: readAmountMode(), product });

    // Error en sitio, sin rerender(): lo tecleado se queda.
    if (error) {
        showQuantityError(error);
        return;
    }

    addNutritionEntry({
        // Mismo tope que la vista: nunca en un día futuro.
        date: [getViewedNutritionDate(), formatISODate(new Date())].sort()[0],
        meal: MEALS.some(m => m.id === meal) ? meal : "snack",
        product,
        grams,
        servings
    });

    setNutritionSelectedProduct(null);
    rerender();

}

export function initGymNutritionEvents() {

    initGymDietEvents();

    document.querySelectorAll('[data-action="set-nutrition-view"]').forEach(button => {

        button.addEventListener("click", () => {
            setNutritionView(button.dataset.view);
            rerender();
        });

    });

    document.querySelectorAll('[data-action="nutrition-day"]').forEach(button => {

        button.addEventListener("click", () => {
            setNutritionDate(button.dataset.date);
            rerender();
        });

    });

    const searchInput = document.querySelector('[data-action="food-search"]');
    const results = document.querySelector(".gym-nutrition-results");

    if (searchInput && results) {

        searchInput.addEventListener("input", () => {

            // Se guarda para que otro rerender() (sync, cambio de día) la
            // conserve, pero sin repintar nada ahora.
            setNutritionQuery(searchInput.value);

            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => runSearch(searchInput.value), SEARCH_DEBOUNCE_MS);

        });

        // Intro / "Buscar" del teclado de iOS: busca ya, sin esperar la
        // pausa, y cierra el teclado para ver los resultados.
        document.querySelector('[data-action="food-search-form"]')?.addEventListener("submit", event => {
            event.preventDefault();
            searchInput.blur();
            runSearch(searchInput.value);
        });

        results.addEventListener("pointerdown", () => clearTimeout(searchTimer));

        // Delegado en el contenedor: su contenido se sustituye en sitio y
        // los botones perderían un listener propio.
        results.addEventListener("click", event => {

            if (event.target.closest('[data-action="retry-food-search"]')) {
                runSearch(getNutritionSearch().query || getNutritionQuery());
                return;
            }

            const pick = event.target.closest('[data-action="pick-food"]');
            if (!pick) return;

            const product = getNutritionSearch().products[Number(pick.dataset.index)];
            if (!product) return;

            clearTimeout(searchTimer);
            setNutritionSelectedProduct(product);
            rerender();

        });

        // Volver a la pestaña con una búsqueda escrita pero nunca lanzada
        // (se cambió de pestaña a mitad de la pausa).
        const search = getNutritionSearch();
        if (search.status === "idle" && getNutritionQuery().trim().length >= MIN_QUERY_LENGTH) runSearch(getNutritionQuery());

    }

    const amountInput = document.querySelector('.gym-nutrition-quantity [data-field="amount"]');

    if (amountInput) {

        amountInput.addEventListener("input", () => {
            showQuantityError("");
            updatePreview();
        });

        updatePreview();

    }

    // Raciones / gramos: se cambia en sitio (sin rerender, que vaciaría la
    // cantidad y la comida elegidas).
    document.querySelectorAll('[data-action="nutrition-amount-mode"]').forEach(button => {

        button.addEventListener("click", () => {

            const panel = document.querySelector(".gym-nutrition-quantity");
            const product = getNutritionSelectedProduct();
            if (!panel || !product || panel.dataset.mode === button.dataset.mode) return;

            panel.dataset.mode = button.dataset.mode;
            panel.querySelectorAll('[data-action="nutrition-amount-mode"]').forEach(b => b.classList.toggle("is-active", b === button));

            const serving = button.dataset.mode === "serving";
            const label = panel.querySelector("[data-amount-label]");
            if (label) label.textContent = serving ? `Raciones (${product.serving.label})` : `Cantidad (${product.unit})`;

            if (amountInput) {
                amountInput.value = serving ? "1" : "";
                amountInput.placeholder = serving ? "1" : "100";
                amountInput.focus();
            }

            showQuantityError("");
            updatePreview();

        });

    });

    document.querySelector('[data-action="add-food-entry"]')?.addEventListener("click", addSelectedFood);

    document.querySelector('[data-action="cancel-food-pick"]')?.addEventListener("click", () => {
        setNutritionSelectedProduct(null);
        rerender();
    });

    // Borrado en dos toques en la propia fila, igual que Composición
    // corporal (sin confirm() nativo).
    document.querySelectorAll('[data-action="delete-food-entry"]').forEach(button => {

        button.addEventListener("click", () => {

            const id = button.dataset.entryId;

            if (getNutritionPendingDeleteId() === id) {
                deleteNutritionEntry(id);
                setNutritionPendingDeleteId(null);
            } else {
                setNutritionPendingDeleteId(id);
            }

            rerender();

        });

    });

}
