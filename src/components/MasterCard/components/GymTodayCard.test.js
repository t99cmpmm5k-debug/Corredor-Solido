import { describe, it, expect } from "vitest";
import { GymTodayCard } from "./GymTodayCard.js";

function match({ completed = false } = {}) {
    return {
        routine: { id: "r1", name: "Pierna Funcional" },
        day: { id: "d1", title: "Pierna Funcional" },
        finishedSession: completed ? { id: "s1" } : null
    };
}

describe("GymTodayCard", () => {

    it("pendiente: botón 'Empezar rutina', sin badge de finalizada", () => {

        const html = GymTodayCard(match());

        expect(html).not.toContain("session-completed-badge");
        expect(html).toContain("Empezar rutina");
        expect(html).toContain('data-action="start-gym-day"');
        expect(html).toContain('data-day-id="d1"');

    });

    it("completada: badge 'Finalizada' y botón 'Ver resumen'", () => {

        const html = GymTodayCard(match({ completed: true }));

        expect(html).toContain("session-completed-badge");
        expect(html).toContain("Finalizada");
        expect(html).toContain("Ver resumen");
        expect(html).toContain('data-action="view-completed-gym-session"');
        expect(html).toContain('data-day-id="d1"');
        expect(html).not.toContain("Empezar rutina");

    });

    it("muestra el título del día de gimnasio", () => {

        const html = GymTodayCard(match());
        expect(html).toContain("Pierna Funcional");

    });

});
