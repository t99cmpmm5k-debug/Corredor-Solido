import { describe, it, expect } from "vitest";
import { buildCalendarWeeks, MonthCalendar } from "./MonthCalendar.js";

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

describe("MonthCalendar — disableEmptyDays (Carreras solo-lectura vs Plan tocable)", () => {

    const AUGUST_2026 = new Date(2026, 7, 1);
    const MARKED_DAY = "2026-08-10";
    const EMPTY_DAY = "2026-08-11";

    function dayButtonHtml(html, iso) {

        const start = html.indexOf(`data-date="${iso}"`);
        const buttonStart = html.lastIndexOf("<button", start);
        const buttonEnd = html.indexOf("</button>", start);

        return html.slice(buttonStart, buttonEnd);

    }

    it("por defecto (disableEmptyDays true, uso de solo lectura), un día sin marcador queda disabled y sin data-action", () => {

        const html = MonthCalendar(AUGUST_2026, {
            markersByDate: { [MARKED_DAY]: [{ icon: "x", color: "red" }] }
        });

        expect(dayButtonHtml(html, EMPTY_DAY)).toContain("disabled");
        expect(dayButtonHtml(html, EMPTY_DAY)).toContain('data-action=""');

    });

    it("con disableEmptyDays:false (Plan), un día sin marcador también es tocable", () => {

        const html = MonthCalendar(AUGUST_2026, {
            markersByDate: { [MARKED_DAY]: [{ icon: "x", color: "red" }] },
            dataAction: "select-plan-calendar-day",
            disableEmptyDays: false
        });

        expect(dayButtonHtml(html, EMPTY_DAY)).not.toContain("disabled");
        expect(dayButtonHtml(html, EMPTY_DAY)).toContain('data-action="select-plan-calendar-day"');

    });

    it("un día con marcador sigue tocable pase lo que pase disableEmptyDays", () => {

        const withDefault = MonthCalendar(AUGUST_2026, { markersByDate: { [MARKED_DAY]: [{ icon: "x", color: "red" }] } });
        const withEmptyEnabled = MonthCalendar(AUGUST_2026, { markersByDate: { [MARKED_DAY]: [{ icon: "x", color: "red" }] }, disableEmptyDays: false });

        expect(dayButtonHtml(withDefault, MARKED_DAY)).not.toContain("disabled");
        expect(dayButtonHtml(withEmptyEnabled, MARKED_DAY)).not.toContain("disabled");

    });

});
