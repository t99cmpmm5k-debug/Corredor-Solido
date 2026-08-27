import { describe, it, expect } from "vitest";
import { TimelineDay } from "./TimelineDay.js";

function session(overrides = {}) {
    return {
        id: "s1",
        date: "2026-08-25",
        day: "MAR",
        type: "z2",
        status: "pending",
        volume: 0,
        title: null,
        subtitle: null,
        ...overrides
    };
}

describe("TimelineDay -- cápsula del día seleccionado (fase 3 del pulido de Plan)", () => {

    it("sin selección, no pinta ninguna cápsula", () => {

        const html = TimelineDay(session(), { isToday: false, isSelected: false, isCompleted: false });

        expect(html).not.toContain("timeline-capsule");

    });

    it("seleccionado con km reales, muestra día+fecha / km · tipo", () => {

        const html = TimelineDay(session({ volume: 8 }), { isToday: false, isSelected: true, isCompleted: false });

        expect(html).toContain("timeline-capsule");
        expect(html).toContain("MAR 25 / 8 km · Rodaje (Z2)");

    });

    it("sin km real (0/null), omite esa parte -- nunca '0 km'", () => {

        const html = TimelineDay(session({ type: "strength", volume: 0 }), { isToday: false, isSelected: true, isCompleted: false });

        expect(html).toContain("MAR 25 / Fuerza");
        expect(html).not.toContain("0 km");

    });

    it("con un título real (p. ej. de una importación), lo usa en vez de la etiqueta genérica del tipo", () => {

        const html = TimelineDay(session({ title: "Fartlek 6x3min", volume: 10 }), { isToday: false, isSelected: true, isCompleted: false });

        expect(html).toContain("MAR 25 / 10 km · Fartlek 6x3min");

    });

    it("un día de descanso seleccionado muestra su título real ('Descanso')", () => {

        const html = TimelineDay(session({ type: "free", title: "Descanso", volume: 0 }), { isToday: false, isSelected: true, isCompleted: false, isRest: true });

        expect(html).toContain("MAR 25 / Descanso");

    });

    it("un día de gimnasio sigue mostrando el nombre real de su rutina, no la fórmula día/km/tipo", () => {

        const html = TimelineDay(session({ type: "strength", subtitle: "Pierna Funcional" }), { isToday: false, isSelected: true, isCompleted: false });

        expect(html).toContain("timeline-capsule");
        expect(html).toContain("Pierna Funcional");
        expect(html).not.toContain("MAR 25 /");

    });

    it("ya no dibuja ningún tallo decorativo (.day-stem) bajo el nodo", () => {

        const html = TimelineDay(session(), { isToday: false, isSelected: false, isCompleted: false });

        expect(html).not.toContain("day-stem");

    });

    it("el punto de HOY solo aparece cuando isToday es true, independiente de la selección", () => {

        const notToday = TimelineDay(session(), { isToday: false, isSelected: true, isCompleted: false });
        const today = TimelineDay(session(), { isToday: true, isSelected: false, isCompleted: false });

        expect(notToday).not.toContain("day-today-dot");
        expect(today).toContain("day-today-dot");

    });

});
