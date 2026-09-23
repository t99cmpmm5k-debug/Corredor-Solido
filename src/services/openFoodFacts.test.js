import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

function jsonResponse(body, ok = true, status = 200) {
    return { ok, status, json: () => Promise.resolve(body) };
}

// Producto real de es.openfoodfacts.org (búsqueda "yogur griego hacendado",
// 2026-09-24), recortado a los campos que se piden.
const GRIEGO_LIGERO = {
    code: "8480000213587",
    product_name: "Griego Ligero Natural",
    brands: "Hacendado",
    serving_quantity: 100,
    serving_quantity_unit: "g",
    serving_size: "100 g",
    quantity: "1 kg",
    nutriments: { "energy-kcal_100g": 60, proteins_100g: 5.8, carbohydrates_100g: 4.7, fat_100g: 2 }
};

describe("normalizeProduct", () => {

    it("se queda con nombre, marca, valores por 100 g y la ración declarada", async () => {

        const { normalizeProduct } = await import("./openFoodFacts.js");

        expect(normalizeProduct(GRIEGO_LIGERO)).toEqual({
            code: "8480000213587",
            name: "Griego Ligero Natural",
            brand: "Hacendado",
            unit: "g",
            per100: { kcal: 60, protein: 5.8, carbs: 4.7, fat: 2 },
            serving: { grams: 100, label: "100 g" }
        });

    });

    it("un valor que no viene (o imposible) queda null, nunca 0; sin ninguno, el producto se descarta", async () => {

        const { normalizeProduct } = await import("./openFoodFacts.js");

        const partial = normalizeProduct({ product_name: "Sin grasa declarada", nutriments: { "energy-kcal_100g": 40, proteins_100g: 3, carbohydrates_100g: 250 } });
        expect(partial.per100).toEqual({ kcal: 40, protein: 3, carbs: null, fat: null });
        expect(partial.serving).toBeNull();

        expect(normalizeProduct({ product_name: "Vacío", nutriments: {} })).toBeNull();
        expect(normalizeProduct({ nutriments: { "energy-kcal_100g": 40 } })).toBeNull();

    });

    it("bebidas: ml como unidad", async () => {

        const { normalizeProduct } = await import("./openFoodFacts.js");

        const milk = normalizeProduct({ product_name: "Leche semidesnatada", quantity: "1 l", nutriments: { "energy-kcal_100g": 46 } });
        expect(milk.unit).toBe("ml");

    });

});

describe("macrosForAmount", () => {

    it("escala desde los valores por 100 g, un decimal en macros y kcal enteras", async () => {

        const { macrosForAmount } = await import("./openFoodFacts.js");

        expect(macrosForAmount({ kcal: 60, protein: 5.8, carbs: 4.7, fat: 2 }, 150)).toEqual({ kcal: 90, protein: 8.7, carbs: 7.1, fat: 3 });
        expect(macrosForAmount({ kcal: 121, protein: 4.6, carbs: null, fat: 10 }, 30)).toEqual({ kcal: 36, protein: 1.4, carbs: null, fat: 3 });

    });

});

describe("searchFoods", () => {

    beforeEach(() => {
        vi.resetModules();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it("pide a es.openfoodfacts.org y devuelve los productos normalizados (descarta los inservibles)", async () => {

        const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ products: [GRIEGO_LIGERO, { product_name: "Sin datos", nutriments: {} }] }));
        vi.stubGlobal("fetch", fetchMock);

        const { searchFoods } = await import("./openFoodFacts.js");
        const result = await searchFoods("  Yogur  Griego ");

        expect(result.ok).toBe(true);
        expect(result.products.map(p => p.name)).toEqual(["Griego Ligero Natural"]);
        expect(fetchMock.mock.calls[0][0]).toMatch(/^https:\/\/es\.openfoodfacts\.org\/cgi\/search\.pl\?search_terms=yogur\+griego&/);

        // Misma búsqueda otra vez: de la caché, sin otra petición.
        await searchFoods("yogur griego");
        expect(fetchMock).toHaveBeenCalledTimes(1);

    });

    it("los 503 sueltos se reintentan (hasta 3 intentos en total)", async () => {

        const fetchMock = vi.fn()
            .mockResolvedValueOnce(jsonResponse(null, false, 503))
            .mockResolvedValueOnce(jsonResponse(null, false, 503))
            .mockResolvedValueOnce(jsonResponse({ products: [GRIEGO_LIGERO] }));
        vi.stubGlobal("fetch", fetchMock);

        const { searchFoods } = await import("./openFoodFacts.js");
        const pending = searchFoods("griego");
        await vi.runAllTimersAsync();

        expect((await pending).ok).toBe(true);
        expect(fetchMock).toHaveBeenCalledTimes(3);

    });

    it("si fallan los 3 intentos: { ok: false } con el motivo, sin lanzar ni inventar productos", async () => {

        const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
        vi.stubGlobal("fetch", fetchMock);

        const { searchFoods } = await import("./openFoodFacts.js");
        const pending = searchFoods("griego");
        await vi.runAllTimersAsync();

        expect(await pending).toEqual({ ok: false, reason: "unavailable" });
        expect(fetchMock).toHaveBeenCalledTimes(3);

    });

    it("sin red (navigator.onLine false) el motivo es offline", async () => {

        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
        vi.stubGlobal("navigator", { onLine: false });

        const { searchFoods } = await import("./openFoodFacts.js");
        const pending = searchFoods("griego");
        await vi.runAllTimersAsync();

        expect(await pending).toEqual({ ok: false, reason: "offline" });

    });

    it("una respuesta sin products es unexpected y no se reintenta", async () => {

        const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: "algo" }));
        vi.stubGlobal("fetch", fetchMock);

        const { searchFoods } = await import("./openFoodFacts.js");

        expect(await searchFoods("griego")).toEqual({ ok: false, reason: "unexpected" });
        expect(fetchMock).toHaveBeenCalledTimes(1);

    });

});
