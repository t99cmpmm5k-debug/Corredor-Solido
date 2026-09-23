import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { parseAmount, sumNutrition, defaultMealForHour } from "./nutritionStore.js";

function resetFakeIndexedDB() {
    globalThis.indexedDB = new IDBFactory();
}

// Griego Ligero Natural de Hacendado tal como lo da Open Food Facts
// (8480000213587, consultado el 2026-09-24), ya normalizado.
const PRODUCT = {
    code: "8480000213587",
    name: "Griego Ligero Natural",
    brand: "Hacendado",
    unit: "g",
    per100: { kcal: 60, protein: 5.8, carbs: 4.7, fat: 2 },
    serving: { grams: 100, label: "100 g" }
};

describe("parseAmount", () => {

    it("gramos con coma decimal; raciones multiplicadas por la ración del producto", () => {

        expect(parseAmount("150,5", { mode: "grams", product: PRODUCT })).toEqual({ grams: 150.5, servings: null });
        expect(parseAmount("2", { mode: "serving", product: PRODUCT })).toEqual({ grams: 200, servings: 2 });

    });

    it("rechaza vacío, 0, texto y cantidades absurdas", () => {

        expect(parseAmount("", { mode: "grams", product: PRODUCT }).error).toMatch(/cantidad/);
        expect(parseAmount("0", { mode: "grams", product: PRODUCT }).error).toMatch(/mayor que 0/);
        expect(parseAmount("abc", { mode: "grams", product: PRODUCT }).error).toBeTruthy();
        expect(parseAmount("9000", { mode: "grams", product: PRODUCT }).error).toMatch(/5000/);
        expect(parseAmount("1", { mode: "serving", product: { ...PRODUCT, serving: null } }).error).toMatch(/gramos/);

    });

});

describe("sumNutrition", () => {

    it("suma y cuenta los registros a los que les falta un valor (no los cuenta como 0 en silencio)", () => {

        const { totals, missing } = sumNutrition([
            { kcal: 90, protein: 8.7, carbs: 7.1, fat: 3 },
            { kcal: 36, protein: 1.4, carbs: null, fat: 3 }
        ]);

        expect(totals).toEqual({ kcal: 126, protein: 10.1, carbs: 7.1, fat: 6 });
        expect(missing).toEqual({ kcal: 0, protein: 0, carbs: 1, fat: 0 });

    });

});

describe("defaultMealForHour", () => {

    it("preselecciona la comida por la hora", () => {

        expect([8, 14, 18, 22].map(defaultMealForHour)).toEqual(["desayuno", "comida", "snack", "cena"]);

    });

});

describe("nutritionStore", () => {

    beforeEach(() => {
        resetFakeIndexedDB();
        vi.resetModules();
    });

    it("añade con macros calculadas y copia de los valores por 100 g, filtra por día y persiste en IndexedDB", async () => {

        const store = await import("./nutritionStore.js");
        await store.hydrate();

        const a = store.addNutritionEntry({ date: "2026-09-24", meal: "desayuno", product: PRODUCT, grams: 150, servings: 1.5 });
        store.addNutritionEntry({ date: "2026-09-23", meal: "cena", product: PRODUCT, grams: 200, servings: null });

        expect(a).toEqual(expect.objectContaining({
            name: "Griego Ligero Natural", grams: 150, kcal: 90, protein: 8.7, carbs: 7.1, fat: 3,
            per100: PRODUCT.per100, servings: { count: 1.5, grams: 100, label: "100 g" }
        }));
        expect(store.getNutritionEntriesForDate("2026-09-24").map(e => e.id)).toEqual([a.id]);

        await new Promise(r => setTimeout(r, 20));
        vi.resetModules();
        const again = await import("./nutritionStore.js");
        await again.hydrate();

        expect(again.getNutritionEntries()).toHaveLength(2);

    });

    it("cada cambio dispara el sync y el borrado deja tombstone", async () => {

        const store = await import("./nutritionStore.js");
        const tombstones = await import("./tombstoneStore.js");
        const { onDataChanged } = await import("./changeEvents.js");
        await store.hydrate();
        await tombstones.hydrate();

        const listener = vi.fn();
        onDataChanged(listener);

        const entry = store.addNutritionEntry({ date: "2026-09-24", meal: "comida", product: PRODUCT, grams: 100 });
        store.deleteNutritionEntry(entry.id);

        expect(listener).toHaveBeenCalledTimes(2);
        expect(store.getNutritionEntries()).toEqual([]);
        expect(tombstones.getTombstones().map(t => t.id)).toContain(`nutritionEntries:${entry.id}`);

    });

});
