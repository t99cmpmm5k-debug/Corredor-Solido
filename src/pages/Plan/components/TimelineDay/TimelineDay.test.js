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

describe("TimelineDay -- nodo del día (retoques finales de cierre del pulido de Plan)", () => {

    // La cápsula bajo el día seleccionado se quitó del todo (retoque
    // final de cierre): el texto real ("4 x 1000m" y similares) seguía
    // cortándose en columnas estrechas, y era puramente redundante --
    // el día/fecha ya está en .timeline-top justo arriba, y el detalle
    // real de la sesión ya está inmediatamente debajo en PlanWorkoutCard.
    it("nunca pinta ninguna cápsula bajo el nodo, esté seleccionado o no", () => {

        const notSelected = TimelineDay(session(), { isToday: false, isSelected: false, isCompleted: false });
        const selected = TimelineDay(session({ volume: 8 }), { isToday: false, isSelected: true, isCompleted: false });

        expect(notSelected).not.toContain("timeline-capsule");
        expect(selected).not.toContain("timeline-capsule");
        expect(selected).not.toContain("timeline-bottom");

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
