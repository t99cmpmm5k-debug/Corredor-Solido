import { rerender } from "../../core/router.js";
import { parseDietCsv, buildDietCsvTemplate } from "../../utils/dietCsv.js";
import { getActiveDietPlan, importDietPlan, toggleMealEaten, setWeekendLongRunDay, deleteDietPlan } from "../../data/dietStore.js";
import { getViewedNutritionDate } from "./components/GymNutrition.js";
import { setDietImport, setDietWeekendPickerOpen, isDietDeletePending, setDietDeletePending, setDietSectionOpen } from "./gymStore.js";

// Eventos de "Mi dieta" (ver GymDiet.js).

async function importCsvFile(file) {

    let text;

    try {
        text = await file.text();
    } catch {
        setDietImport({ errors: [{ line: null, message: "No se ha podido leer el archivo." }], fileName: file.name });
        rerender();
        return;
    }

    const { plan, errors } = parseDietCsv(text);

    // Rechazado entero: se explican todos los errores y no se toca nada
    // (la dieta anterior, si la hay, sigue activa).
    if (errors) {
        setDietImport({ errors, fileName: file.name });
    } else {
        importDietPlan(plan, { fileName: file.name || null });
        setDietImport({});
        setDietDeletePending(false);
    }

    rerender();

}

function downloadTemplate() {

    const blob = new Blob([buildDietCsvTemplate()], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "plantilla_dieta_corredor_solido.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

}

export function initGymDietEvents() {

    document.querySelectorAll('[data-action="diet-csv-input"]').forEach(input => {

        input.addEventListener("change", () => {
            const file = input.files?.[0];
            if (file) importCsvFile(file);
        });

    });

    document.querySelectorAll('[data-action="diet-download-template"]').forEach(button => {
        button.addEventListener("click", downloadTemplate);
    });

    document.querySelectorAll('[data-action="diet-weekend"]').forEach(button => {

        button.addEventListener("click", () => {
            setWeekendLongRunDay(button.dataset.date, button.dataset.longRun);
            setDietWeekendPickerOpen(false);
            rerender();
        });

    });

    document.querySelector('[data-action="diet-weekend-change"]')?.addEventListener("click", () => {
        setDietWeekendPickerOpen(true);
        rerender({ resetScroll: true });
    });

    // Marcar qué opción se comió: el día visto, contra la dieta activa.
    document.querySelectorAll('[data-action="diet-toggle-meal"]').forEach(button => {

        button.addEventListener("click", () => {
            const plan = getActiveDietPlan();
            if (!plan) return;
            toggleMealEaten(getViewedNutritionDate(), plan.id, button.dataset.mealKey, button.dataset.optionKey);
            rerender();
        });

    });

    // Casilla de la tarjeta. Con una sola opción, la marca/desmarca. Con
    // varias: marcada, la desmarca; sin marcar, NO elige una por su cuenta
    // -- pide tocar la opción comida (aviso en sitio, sin rerender).
    document.querySelectorAll('[data-action="diet-meal-check"]').forEach(button => {

        button.addEventListener("click", () => {

            const plan = getActiveDietPlan();
            if (!plan) return;

            if (button.dataset.multiple === "true" && button.dataset.eaten !== "true") {
                const hint = button.closest(".gym-meal-card")?.querySelector("[data-meal-hint]");
                if (hint) hint.hidden = false;
                return;
            }

            toggleMealEaten(getViewedNutritionDate(), plan.id, button.dataset.mealKey, button.dataset.optionKey);
            rerender();

        });

    });

    // Notas generales / Gestionar: recordar si están abiertas, para que
    // marcar una comida (rerender) no las cierre.
    document.querySelectorAll("[data-diet-section]").forEach(details => {
        details.addEventListener("toggle", () => setDietSectionOpen(details.dataset.dietSection, details.open));
    });

    // Borrar la dieta en dos toques, sin confirm() nativo.
    document.querySelector('[data-action="diet-delete"]')?.addEventListener("click", () => {

        if (isDietDeletePending()) {
            const plan = getActiveDietPlan();
            if (plan) deleteDietPlan(plan.id);
            setDietDeletePending(false);
        } else {
            setDietDeletePending(true);
        }

        rerender();

    });

}
