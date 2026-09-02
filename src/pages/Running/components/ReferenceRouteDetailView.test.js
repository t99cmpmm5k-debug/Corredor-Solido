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

});
