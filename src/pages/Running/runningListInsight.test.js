import { describe, it, expect } from "vitest";
import { buildListInsight } from "./runningListInsight.js";

const NOW = new Date("2026-08-15T12:00:00");

function w(date, distanceKm, avgPaceSecPerKm = null, shoeId = null) {
    return { date, distanceKm, avgPaceSecPerKm, shoeId };
}

describe("buildListInsight -- tarjeta de insight rotatorio sobre la lista de Running", () => {

    it("sin ningún dato real en ninguna variante, devuelve null", () => {

        const result = buildListInsight({ filteredWorkouts: [], allWorkouts: [], shoes: [], now: NOW });
        expect(result).toBeNull();

    });

    it("con entrenos reales este mes, la variante de conteo+km es al menos una opción real (nunca inventa cifras)", () => {

        const filteredWorkouts = [w("2026-08-01", 8), w("2026-08-10", 10)];

        const result = buildListInsight({ filteredWorkouts, allWorkouts: filteredWorkouts, shoes: [], now: NOW });

        expect(result).not.toBeNull();
        expect(result.text).toMatch(/entreno/);

    });

    it("entrenos de otro mes no cuentan para 'este mes'", () => {

        const filteredWorkouts = [w("2026-06-01", 8, 300)];

        // Sin ritmo real en agosto y sin zapatillas -- la única variante
        // posible (mejor ritmo) sí tiene dato real (300 s/km), la de
        // conteo mensual no debería colarse con un entreno de junio.
        const result = buildListInsight({ filteredWorkouts, allWorkouts: filteredWorkouts, shoes: [], now: NOW });

        expect(result).not.toBeNull();
        expect(result.text).toContain("mejor ritmo");

    });

    it("mejor ritmo real: usa el mínimo (más rápido) de los disponibles", () => {

        const filteredWorkouts = [w("2026-05-01", 8, 320), w("2026-05-02", 8, 290), w("2026-05-03", 8, 305)];

        const result = buildListInsight({ filteredWorkouts, allWorkouts: filteredWorkouts, shoes: [], now: NOW });

        expect(result.text).toContain("4:50/km");

    });

    it("% de zapatilla: real, sobre el total de TODOS los entrenos (no solo el filtro activo)", () => {

        const allWorkouts = [
            w("2026-01-01", 80, null, "shoe-a"),
            w("2026-01-02", 20, null, "shoe-b")
        ];

        const shoes = [{ id: "shoe-a", brand: "Asics", model: "Nimbus 28" }, { id: "shoe-b", brand: "Asics", model: "Kayano" }];

        const result = buildListInsight({ filteredWorkouts: [], allWorkouts, shoes, now: NOW });

        expect(result.text).toContain("Nimbus 28");
        expect(result.text).toContain("80%");

    });

    it("sin ninguna zapatilla con km real, esa variante no entra en la rotación", () => {

        const shoes = [{ id: "shoe-a", brand: "Asics", model: "Nimbus 28" }];
        const allWorkouts = [w("2026-01-01", 10, null, null)]; // sin shoeId asignado

        const result = buildListInsight({ filteredWorkouts: [], allWorkouts, shoes, now: NOW });

        expect(result).toBeNull();

    });

    it("es determinista para el mismo día (misma variante en dos llamadas seguidas)", () => {

        const filteredWorkouts = [w("2026-08-01", 8, 300), w("2026-08-02", 8, 290)];
        const shoes = [{ id: "shoe-a", brand: "Asics", model: "Nimbus 28" }];
        const allWorkouts = [...filteredWorkouts.map(x => ({ ...x, shoeId: "shoe-a" }))];

        const first = buildListInsight({ filteredWorkouts, allWorkouts, shoes, now: NOW });
        const second = buildListInsight({ filteredWorkouts, allWorkouts, shoes, now: NOW });

        expect(first).toEqual(second);

    });

});
