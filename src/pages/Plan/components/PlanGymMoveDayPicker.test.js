import { describe, it, expect, vi, afterEach } from "vitest";

let routines = [];

vi.mock("../../../data/gymRoutineStore.js", () => ({
    getRoutines: () => routines
}));

const { PlanGymMoveDayPicker } = await import("./PlanGymMoveDayPicker.js");

describe("PlanGymMoveDayPicker -- selector de día de la SEMANA (recurrente), no de fecha", () => {

    afterEach(() => {
        routines = [];
    });

    it("7 columnas, una por día de la semana (WEEKDAY_OPTIONS), no 7 fechas", () => {

        const gymDay = { id: "d1", weekday: "lunes" };
        const html = PlanGymMoveDayPicker(gymDay);

        const matches = html.match(/<div\s+class="move-day /g) || [];
        expect(matches).toHaveLength(7);

    });

    it("el weekday actual del día no es tocable (AQUÍ, sin data-action)", () => {

        const gymDay = { id: "d1", weekday: "lunes" };
        const html = PlanGymMoveDayPicker(gymDay);

        expect(html).toContain("AQUÍ");
        expect(html).toContain('data-action="move-gym-day-to" data-weekday="martes"');
        expect(html).not.toContain('data-action="move-gym-day-to" data-weekday="lunes"');

    });

    it("otro día (de otra rutina) que ya usa ese weekday se marca con el punto, pero sigue siendo tocable", () => {

        routines = [
            { id: "r1", days: [{ id: "d1", weekday: "lunes" }] },
            { id: "r2", days: [{ id: "d2", weekday: "martes" }] }
        ];

        const html = PlanGymMoveDayPicker({ id: "d1", weekday: "lunes" });

        // Ocupado (martes) sigue llevando data-action -- no bloquea el toque, solo avisa.
        expect(html).toContain('data-action="move-gym-day-to" data-weekday="martes"');
        // Solo martes está ocupado por otra rutina -- exactamente un punto.
        const dots = html.match(/move-day-dot/g) || [];
        expect(dots).toHaveLength(1);

    });

    it("un día que ya ocupa SU PROPIO weekday actual no cuenta como ocupado (soy yo mismo)", () => {

        routines = [{ id: "r1", days: [{ id: "d1", weekday: "lunes" }] }];

        const html = PlanGymMoveDayPicker({ id: "d1", weekday: "lunes" });

        // El día actual (lunes) muestra AQUÍ, no el punto de "ocupado" -- es el propio día que se mueve.
        expect(html).toContain("AQUÍ");

    });

});
