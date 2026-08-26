import { describe, it, expect } from "vitest";
import { isDaytimeWindow, getHomeSectionOrder, NIGHT_HOUR } from "./homeLayout.js";

describe("isDaytimeWindow", () => {

    it("antes de las 20:00, es de día", () => {
        expect(isDaytimeWindow(new Date(2026, 7, 26, 8, 0))).toBe(true);
        expect(isDaytimeWindow(new Date(2026, 7, 26, 19, 59))).toBe(true);
    });

    it("a partir de las 20:00, es de noche", () => {
        expect(isDaytimeWindow(new Date(2026, 7, 26, 20, 0))).toBe(false);
        expect(isDaytimeWindow(new Date(2026, 7, 26, 23, 30))).toBe(false);
    });

    it("usa NIGHT_HOUR como umbral, no un número mágico repetido", () => {
        expect(NIGHT_HOUR).toBe(20);
    });

});

describe("getHomeSectionOrder", () => {

    it("de día, el tiempo va justo después del entreno de hoy (primero de los movibles)", () => {

        const order = getHomeSectionOrder(new Date(2026, 7, 26, 9, 0));
        expect(order).toEqual(["weather", "week", "goal", "km"]);

    });

    it("de noche, el tiempo baja al final", () => {

        const order = getHomeSectionOrder(new Date(2026, 7, 26, 21, 0));
        expect(order).toEqual(["week", "goal", "km", "weather"]);

    });

    it("los dos órdenes son la misma permutación (nunca se pierde ni se duplica un bloque)", () => {

        const day = getHomeSectionOrder(new Date(2026, 7, 26, 9, 0));
        const night = getHomeSectionOrder(new Date(2026, 7, 26, 21, 0));

        expect([...day].sort()).toEqual([...night].sort());

    });

});
