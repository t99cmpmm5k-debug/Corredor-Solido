import { describe, it, expect } from "vitest";
import { shoeBarPercent, formatKm } from "./RunningShoesScreen.js";

describe("shoeBarPercent -- vida útil configurable de zapatillas (fase 5 del pulido de Running)", () => {

    it("sin lifetimeKm configurado (el usuario nunca lo puso), devuelve null -- nunca un % inventado", () => {

        expect(shoeBarPercent({ lifetimeKm: null }, 82.98)).toBeNull();

    });

    it("con lifetimeKm real, calcula el % de uso real", () => {

        const bar = shoeBarPercent({ lifetimeKm: 900 }, 82.98);

        expect(bar).not.toBeNull();
        expect(bar.percent).toBeCloseTo(9.22, 1);
        expect(bar.fillPercent).toBeCloseTo(9.22, 1);
        expect(bar.tier).toBe("normal");

    });

    it("a partir del 80% real, sube a nivel de aviso", () => {

        const bar = shoeBarPercent({ lifetimeKm: 900 }, 730);
        expect(bar.tier).toBe("warning");

    });

    it("al superar el 100% real, nivel de peligro -- fillPercent se recorta a 100 para no desbordar la barra, pero percent real se mantiene sin recortar", () => {

        const bar = shoeBarPercent({ lifetimeKm: 900 }, 950);

        expect(bar.tier).toBe("danger");
        expect(bar.fillPercent).toBe(100);
        expect(bar.percent).toBeGreaterThan(100);

    });

});

describe("formatKm", () => {

    it("formatea con coma decimal, 2 decimales", () => {

        expect(formatKm(82.98)).toBe("82,98 km");
        expect(formatKm(900)).toBe("900,00 km");

    });

});
