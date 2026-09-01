import { describe, it, expect, vi, afterEach } from "vitest";

let routeForWorkout = null;

vi.mock("../../../data/referenceRouteStore.js", () => ({
    getReferenceRouteForWorkout: () => routeForWorkout
}));

const { routeSelector } = await import("./ReferenceRouteSelector.js");

describe("routeSelector -- asignar un entreno a un recorrido de referencia", () => {

    afterEach(() => {
        routeForWorkout = null;
    });

    it("sin ningún recorrido creado todavía, no pinta nada (nada que elegir)", () => {

        expect(routeSelector({ id: "w1" }, [])).toBe("");

    });

    it("con recorridos, incluye 'Sin recorrido' + cada recorrido como opción", () => {

        const routes = [{ id: "r1", name: "8K referencia" }, { id: "r2", name: "10K parque" }];
        const html = routeSelector({ id: "w1" }, routes);

        expect(html).toContain("Sin recorrido");
        expect(html).toContain("8K referencia");
        expect(html).toContain("10K parque");
        expect(html).toContain('data-action="set-workout-route"');
        expect(html).toContain('data-workout-id="w1"');

    });

    it("sin recorrido asignado, 'Sin recorrido' viene seleccionado", () => {

        const html = routeSelector({ id: "w1" }, [{ id: "r1", name: "8K referencia" }]);

        expect(html).toContain('<option value="" selected>Sin recorrido</option>');

    });

    it("con un recorrido ya asignado, ESE viene seleccionado, no 'Sin recorrido'", () => {

        routeForWorkout = { id: "r1", name: "8K referencia" };

        const html = routeSelector({ id: "w1" }, [{ id: "r1", name: "8K referencia" }, { id: "r2", name: "10K parque" }]);

        expect(html).toMatch(/<option value="r1"[^>]*selected/);
        expect(html).not.toMatch(/<option value="r2"[^>]*selected/);

    });

});
