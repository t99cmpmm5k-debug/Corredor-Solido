import { describe, it, expect, vi } from "vitest";

vi.mock("../../../data/referenceRouteStore.js", () => ({
    getReferenceRouteForWorkout: () => null
}));

const { ReferenceRouteDetailView } = await import("./ReferenceRouteDetailView.js");

function workout(overrides = {}) {
    return {
        id: "w1",
        date: "2026-08-20",
        avgPaceSecPerKm: 349,
        avgHr: 151,
        temperatureC: 29,
        type: "easy",
        splits: [],
        ...overrides
    };
}

describe("ReferenceRouteDetailView -- pantalla de detalle de un recorrido", () => {

    it("sin recorrido (route null), no pinta nada -- defensivo, mismo criterio que PlanGymDayCard(null)", () => {

        expect(ReferenceRouteDetailView(null, [])).toBe("");

    });

    it("pinta el nombre del recorrido y la tarjeta resumen (ReferenceRouteCard)", () => {

        const html = ReferenceRouteDetailView({ id: "r1", name: "8K referencia" }, [workout()]);

        expect(html).toContain("8K referencia");
        expect(html).toContain("Último: <strong>5:49/km · 151 ppm · 29°C</strong>");

    });

    it("sin entrenos asignados, no pinta la tabla (nada que listar)", () => {

        const html = ReferenceRouteDetailView({ id: "r1", name: "8K referencia" }, [], "date", "desc");
        expect(html).not.toContain("route-table-row");

    });

    it("una fila por entreno, ordenada según se pida, cada una abre el detalle real y permite quitarla del recorrido", () => {

        const older = workout({ id: "w1", date: "2026-08-01" });
        const newer = workout({ id: "w2", date: "2026-08-20" });

        const html = ReferenceRouteDetailView({ id: "r1", name: "8K referencia" }, [older, newer], "date", "desc");

        const firstRowIndex = html.indexOf('data-workout-id="w2"');
        const secondRowIndex = html.indexOf('data-workout-id="w1"');
        expect(firstRowIndex).toBeGreaterThan(-1);
        expect(firstRowIndex).toBeLessThan(secondRowIndex);

        expect(html).toContain('data-action="open-detail"');
        expect(html).toContain('data-action="unassign-workout-from-route"');

    });

    it("con 2+ entrenos con ritmo real, también incluye el gráfico de evolución", () => {

        const a = workout({ id: "w1", date: "2026-08-01" });
        const b = workout({ id: "w2", date: "2026-08-10" });

        const html = ReferenceRouteDetailView({ id: "r1", name: "8K referencia" }, [a, b], "date", "desc");
        expect(html).toContain("route-evolution-chart");

    });

    it("sin ningún entreno con GPS real, no pinta el mapa ni el objetivo táctil de pantalla completa", () => {

        const html = ReferenceRouteDetailView({ id: "r1", name: "8K referencia" }, [workout()], "date", "desc");

        expect(html).not.toContain('data-action="open-route-map-fullscreen"');

    });

    it("con un entreno con GPS real, el mapa pequeño va envuelto en el objetivo táctil que abre pantalla completa", () => {

        const withTrace = workout({ routeTrace: [{ lat: 37.5, lon: -1.7 }, { lat: 37.51, lon: -1.71 }] });
        const html = ReferenceRouteDetailView({ id: "r1", name: "8K referencia" }, [withTrace], "date", "desc");

        expect(html).toContain('data-action="open-route-map-fullscreen"');
        expect(html).not.toContain("route-map-fullscreen-overlay");

    });

    it("fullscreenMapOpen=true, pinta el overlay de pantalla completa con su propio contenedor", () => {

        const withTrace = workout({ routeTrace: [{ lat: 37.5, lon: -1.7 }, { lat: 37.51, lon: -1.71 }] });
        const html = ReferenceRouteDetailView({ id: "r1", name: "8K referencia" }, [withTrace], "date", "desc", true);

        expect(html).toContain("route-map-fullscreen-overlay");
        expect(html).toContain('id="route-map-fullscreen"');
        expect(html).toContain('data-action="close-route-map-fullscreen"');

    });

    it("bug real corregido: fullscreenMapOpen=true NUNCA pinta el mapa pequeño a la vez", () => {

        const withTrace = workout({ routeTrace: [{ lat: 37.5, lon: -1.7 }, { lat: 37.51, lon: -1.71 }] });
        const html = ReferenceRouteDetailView({ id: "r1", name: "8K referencia" }, [withTrace], "date", "desc", true);

        expect(html).not.toContain('data-action="open-route-map-fullscreen"');
        expect(html).not.toContain('id="route-map"');

    });

});
