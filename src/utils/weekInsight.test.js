import { describe, it, expect, vi } from "vitest";

vi.mock("./date.js", async () => {
    const actual = await vi.importActual("./date.js");
    return {
        ...actual,
        isToday: (date) => date === "2026-08-26",
        formatWeekday: (date) => {
            const map = { "2026-08-24": "lunes", "2026-08-29": "sábado" };
            return map[date] ?? date;
        }
    };
});

const { buildWeekInsight } = await import("./weekInsight.js");

function session(date, type, volume, status = "pending") {
    return { date, type, volume, status };
}

describe("buildWeekInsight -- formato corto tipo entrenador (fase 3, 2026-08-26)", () => {

    it("sin sesiones o sin objetivo semanal, no hay texto", () => {
        expect(buildWeekInsight([], { goal: 20 })).toBe("");
        expect(buildWeekInsight([session("2026-08-26", "z2", 8)], { goal: 0 })).toBe("");
    });

    it("hoy con km reales: 'Hoy: X km TIPO.'", () => {

        const week = [session("2026-08-26", "z2", 8)];
        expect(buildWeekInsight(week, { goal: 21 })).toBe("Hoy: 8 km Z2.");

    });

    it("hoy sin km pero de tipo fuerza/descanso/libre: solo el tipo, sin '0 km'", () => {

        const week = [session("2026-08-26", "strength", 0)];
        expect(buildWeekInsight(week, { goal: 21 })).toBe("Hoy: fuerza.");

    });

    it("hoy sin km y de un tipo sin dato concreto que decir: no inventa una línea", () => {

        const week = [session("2026-08-26", "z2", 0)];
        expect(buildWeekInsight(week, { goal: 21 })).toBe("");

    });

    it("añade la sesión clave de más adelante en la semana (más km, aún pendiente)", () => {

        const week = [
            session("2026-08-26", "z2", 8),
            session("2026-08-29", "longRun", 13)
        ];

        expect(buildWeekInsight(week, { goal: 21 })).toBe("Hoy: 8 km Z2. El sábado, 13 km de tirada larga.");

    });

    it("si la sesión clave es la de hoy, no la repite en una segunda frase", () => {

        const week = [
            session("2026-08-24", "z2", 5, "completed"),
            session("2026-08-26", "longRun", 13)
        ];

        expect(buildWeekInsight(week, { goal: 21 })).toBe("Hoy: 13 km tirada larga.");

    });

    it("una sesión clave ya completada no cuenta como clave (no hay nada pendiente que destacar)", () => {

        const week = [
            session("2026-08-26", "z2", 8),
            session("2026-08-29", "longRun", 13, "completed")
        ];

        expect(buildWeekInsight(week, { goal: 21 })).toBe("Hoy: 8 km Z2.");

    });

});
