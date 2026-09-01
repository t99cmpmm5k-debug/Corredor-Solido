import { describe, it, expect, vi, afterEach } from "vitest";

let sessionMenuOpenId = null;
let averageDurationSec = null;

vi.mock("../planStore.js", () => ({
    getSessionMenuOpenId: () => sessionMenuOpenId
}));

vi.mock("../../../data/gymSessionStore.js", () => ({
    getAverageDurationForDay: () => averageDurationSec
}));

const { PlanGymDayCard } = await import("./PlanGymDayCard.js");

function gymDay(overrides = {}) {
    return {
        id: "gym-2026-08-25",
        date: "2026-08-25",
        day: "MAR",
        title: "Pierna Funcional",
        gymDayId: "day-1",
        gymRoutineId: "routine-1",
        gymCompleted: false,
        exercises: [
            { id: "e1", name: "Sentadilla goblet" },
            { id: "e2", name: "Zancada búlgara" }
        ],
        ...overrides
    };
}

describe("PlanGymDayCard -- tarjeta de detalle inline de gimnasio en Plan", () => {

    afterEach(() => {
        sessionMenuOpenId = null;
        averageDurationSec = null;
    });

    it("sin gymDay, no pinta nada", () => {
        expect(PlanGymDayCard(null)).toBe("");
    });

    it("muestra el nombre real del día como título, sin repetirlo en el resumen", () => {

        const html = PlanGymDayCard(gymDay());

        expect(html).toContain("Pierna Funcional");
        expect(html).toContain("2 ejercicios");

    });

    it("sin historial real de duración, el resumen no inventa un tiempo", () => {

        const html = PlanGymDayCard(gymDay());

        expect(html).toContain("2 ejercicios");
        expect(html).not.toContain("min");

    });

    it("con duración media real, la añade al resumen", () => {

        averageDurationSec = 2700;
        const html = PlanGymDayCard(gymDay());

        expect(html).toContain("2 ejercicios · ~45 min");

    });

    it("lista solo los primeros 4 ejercicios reales, con '+X más' si hay más", () => {

        const html = PlanGymDayCard(gymDay({
            exercises: [
                { id: "e1", name: "Uno" },
                { id: "e2", name: "Dos" },
                { id: "e3", name: "Tres" },
                { id: "e4", name: "Cuatro" },
                { id: "e5", name: "Cinco" }
            ]
        }));

        expect(html).toContain("Uno");
        expect(html).toContain("Cuatro");
        expect(html).not.toContain("Cinco");
        expect(html).toContain("+1 más");

    });

    it("sin sesión de hoy, el botón dice EMPEZAR RUTINA", () => {

        const html = PlanGymDayCard(gymDay({ gymCompleted: false }));

        expect(html).toContain("EMPEZAR RUTINA");
        expect(html).toContain('data-action="plan-start-gym-day"');
        expect(html).toContain('data-day-id="day-1"');

    });

    it("con la sesión de hoy ya finalizada, el botón dice VER RESUMEN", () => {

        const html = PlanGymDayCard(gymDay({ gymCompleted: true }));

        expect(html).toContain("VER RESUMEN");
        expect(html).toContain('data-action="plan-view-completed-gym-session"');

    });

    it("sin completar, muestra MOVER SESIÓN (mismo patrón que running -- ver PlanWorkoutCard.js)", () => {

        const html = PlanGymDayCard(gymDay({ gymCompleted: false }));

        expect(html).toContain("MOVER SESIÓN");
        expect(html).toContain('data-action="start-move-gym-day"');
        expect(html).toContain('data-day-id="day-1"');

    });

    it("ya completada, no ofrece MOVER SESIÓN", () => {

        const html = PlanGymDayCard(gymDay({ gymCompleted: true }));

        expect(html).not.toContain("MOVER SESIÓN");
        expect(html).not.toContain('data-action="start-move-gym-day"');

    });

    it("el menú \"···\" solo se abre cuando este día tiene el menú activo, con Editar/Eliminar rutina (sin Duplicar)", () => {

        const closed = PlanGymDayCard(gymDay());
        expect(closed).not.toContain("workout-menu-popover");

        sessionMenuOpenId = "gym-2026-08-25";
        const open = PlanGymDayCard(gymDay());

        expect(open).toContain("workout-menu-popover");
        expect(open).toContain("Editar rutina");
        expect(open).toContain("Eliminar rutina");
        expect(open).not.toContain("Duplicar");
        expect(open).toContain('data-action="plan-edit-gym-routine"');
        expect(open).toContain('data-action="plan-delete-gym-routine"');
        expect(open).toContain('data-routine-id="routine-1"');

    });

});
