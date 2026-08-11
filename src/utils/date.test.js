import { describe, it, expect } from "vitest";
import { getWeekStartDate, getDayAbbreviation } from "./date.js";

describe("getWeekStartDate", () => {

    it("devuelve la misma fecha si ya es lunes", () => {
        expect(getWeekStartDate("2026-08-17")).toBe("2026-08-17");
    });

    it("devuelve el lunes de esa semana para una fecha a mitad de semana", () => {
        expect(getWeekStartDate("2026-08-19")).toBe("2026-08-17"); // miércoles
    });

    it("devuelve el lunes anterior para un domingo (no el siguiente)", () => {
        expect(getWeekStartDate("2026-08-23")).toBe("2026-08-17"); // domingo
    });

    it("cruza correctamente un límite de mes", () => {
        expect(getWeekStartDate("2026-09-01")).toBe("2026-08-31"); // martes 1 sep -> lunes 31 ago
    });

    it("cruza correctamente un límite de año", () => {
        expect(getWeekStartDate("2027-01-01")).toBe("2026-12-28"); // viernes 1 ene 2027 -> lunes 28 dic 2026
    });

});

describe("getDayAbbreviation", () => {

    const cases = [
        ["2026-08-17", "LUN"],
        ["2026-08-18", "MAR"],
        ["2026-08-19", "MIÉ"],
        ["2026-08-20", "JUE"],
        ["2026-08-21", "VIE"],
        ["2026-08-22", "SÁB"],
        ["2026-08-23", "DOM"]
    ];

    cases.forEach(([iso, expected]) => {
        it(`devuelve ${expected} para ${iso}`, () => {
            expect(getDayAbbreviation(iso)).toBe(expected);
        });
    });

});
