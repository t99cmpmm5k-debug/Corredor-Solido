import { describe, it, expect } from "vitest";
import { ReferenceRouteEvolutionChart } from "./ReferenceRouteEvolutionChart.js";

function workout(overrides = {}) {
    return { id: "w1", date: "2026-08-01", avgPaceSecPerKm: 349, avgHr: 151, temperatureC: 29, ...overrides };
}

describe("ReferenceRouteEvolutionChart -- ritmo/FC por fecha, temperatura como contexto", () => {

    it("con menos de 2 entrenos con ritmo real, no pinta nada -- un solo punto no es una 'evolución'", () => {

        expect(ReferenceRouteEvolutionChart([])).toBe("");
        expect(ReferenceRouteEvolutionChart([workout()])).toBe("");

    });

    it("una columna por entreno con ritmo real, en orden cronológico (más antiguo primero)", () => {

        const w1 = workout({ id: "w1", date: "2026-08-20", avgPaceSecPerKm: 349 });
        const w2 = workout({ id: "w2", date: "2026-08-01", avgPaceSecPerKm: 333 });

        const html = ReferenceRouteEvolutionChart([w1, w2]);

        const firstIndex = html.indexOf("5:33"); // w2, más antiguo
        const secondIndex = html.indexOf("5:49"); // w1, más reciente

        expect(firstIndex).toBeGreaterThan(-1);
        expect(firstIndex).toBeLessThan(secondIndex);

    });

    it("un entreno sin ritmo real (solo FC, p. ej.) queda fuera del gráfico -- nunca inventa una barra sin dato", () => {

        const w1 = workout({ id: "w1", avgPaceSecPerKm: 349 });
        const w2 = workout({ id: "w2", avgPaceSecPerKm: null });
        const w3 = workout({ id: "w3", date: "2026-08-10", avgPaceSecPerKm: 333 });

        const html = ReferenceRouteEvolutionChart([w1, w2, w3]);

        expect((html.match(/route-chart-column/g) || []).length).toBe(2);

    });

    it("la temperatura se muestra como etiqueta de contexto, no como una barra/serie más", () => {

        const w1 = workout({ id: "w1", temperatureC: 29 });
        const w2 = workout({ id: "w2", date: "2026-08-10", avgPaceSecPerKm: 333, temperatureC: 22 });

        const html = ReferenceRouteEvolutionChart([w1, w2]);

        expect(html).toContain('class="route-chart-temp"');
        expect(html).toContain("29°C");
        expect(html).toContain("22°C");

    });

    it("sin temperatura en un entreno concreto, esa etiqueta se omite -- nunca un placeholder inventado", () => {

        const w1 = workout({ id: "w1", temperatureC: null });
        const w2 = workout({ id: "w2", date: "2026-08-10", avgPaceSecPerKm: 333 });

        const html = ReferenceRouteEvolutionChart([w1, w2]);

        expect(html).not.toContain("nullC");
        expect(html).not.toContain("undefined");

    });

    it("sin FC real en ningún entreno, no pinta el overlay ni la insignia de FC media", () => {

        const w1 = workout({ id: "w1", avgHr: null });
        const w2 = workout({ id: "w2", date: "2026-08-10", avgPaceSecPerKm: 333, avgHr: null });

        const html = ReferenceRouteEvolutionChart([w1, w2]);

        expect(html).not.toContain("route-chart-hr-overlay");
        expect(html).not.toContain("ppm medio");

    });

    it("con FC real, muestra la insignia de FC media y el overlay", () => {

        const w1 = workout({ id: "w1", avgHr: 150 });
        const w2 = workout({ id: "w2", date: "2026-08-10", avgPaceSecPerKm: 333, avgHr: 152 });

        const html = ReferenceRouteEvolutionChart([w1, w2]);

        expect(html).toContain("ppm medio");
        expect(html).toContain("route-chart-hr-overlay");
        expect((html.match(/route-chart-hr-dot/g) || []).length).toBe(2);

    });

});
