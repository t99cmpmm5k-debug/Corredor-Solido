import { describe, it, expect } from "vitest";
import { hasRouteTrace } from "./RouteMap.js";

describe("hasRouteTrace", () => {

    it("false sin routeTrace ni con menos de 2 puntos", () => {

        expect(hasRouteTrace({})).toBe(false);
        expect(hasRouteTrace({ routeTrace: null })).toBe(false);
        expect(hasRouteTrace({ routeTrace: [{ lat: 1, lon: 1 }] })).toBe(false);

    });

    it("true con 2 o más puntos", () => {

        expect(hasRouteTrace({ routeTrace: [{ lat: 1, lon: 1 }, { lat: 2, lon: 2 }] })).toBe(true);

    });

});
