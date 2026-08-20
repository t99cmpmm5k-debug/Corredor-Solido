import { describe, it, expect } from "vitest";
import { buildCalendarWeeks } from "./MonthCalendar.js";

describe("buildCalendarWeeks", () => {

    it("cada semana empieza en lunes y termina en domingo", () => {

        const weeks = buildCalendarWeeks(new Date(2026, 7, 1)); // agosto 2026

        weeks.forEach(week => {
            expect(week).toHaveLength(7);
            expect(new Date(week[0]).getDay()).not.toBe(0); // no domingo
        });

    });

    it("cubre desde el 1 hasta el último día del mes", () => {

        const weeks = buildCalendarWeeks(new Date(2026, 7, 1)); // agosto 2026, 31 días
        const allDays = weeks.flat();

        expect(allDays).toContain("2026-08-01");
        expect(allDays).toContain("2026-08-31");

    });

    it("no añade una fila entera de más cuando el mes cabe en menos semanas", () => {

        // Febrero 2026 empieza en domingo y tiene 28 días — cabe en 5 semanas.
        const weeks = buildCalendarWeeks(new Date(2026, 1, 1));
        expect(weeks.length).toBeLessThanOrEqual(5);

    });

    it("usa 6 semanas cuando el mes las necesita", () => {

        // Agosto 2026 empieza en sábado y tiene 31 días — necesita 6 semanas.
        const weeks = buildCalendarWeeks(new Date(2026, 7, 1));
        expect(weeks.length).toBe(6);

    });

});
