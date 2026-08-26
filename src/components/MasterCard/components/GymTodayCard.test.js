import { describe, it, expect, afterEach } from "vitest";
import { GymTodayCard } from "./GymTodayCard.js";
import { getGymSessions } from "../../../data/gymSessionStore.js";

function match({ completed = false, exercises = [{ id: "e1" }, { id: "e2" }] } = {}) {
    return {
        routine: { id: "r1", name: "Pierna Funcional" },
        day: { id: "d1", title: "Pierna Funcional", exercises },
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

    it("resumen compacto: título · nº de ejercicios reales (fase 2, coherencia 2026-08-26)", () => {

        const html = GymTodayCard(match({ exercises: [{ id: "e1" }, { id: "e2" }, { id: "e3" }] }));
        expect(html).toContain("Pierna Funcional · 3 ejercicios");

    });

    it("un solo ejercicio usa el singular", () => {

        const html = GymTodayCard(match({ exercises: [{ id: "e1" }] }));
        expect(html).toContain("Pierna Funcional · 1 ejercicio");
        expect(html).not.toContain("1 ejercicios");

    });

    it("sin historial real de este día, no muestra ninguna duración inventada", () => {

        const html = GymTodayCard(match());
        expect(html).not.toMatch(/~\d+ min/);

    });

    it("con historial real de este día, muestra la duración media redondeada a minutos", () => {

        getGymSessions().push({
            id: "s-hist", dayId: "d1", date: "2026-08-05",
            startedAt: "2026-08-05T10:00:00.000Z", finishedAt: "2026-08-05T10:45:00.000Z",
            durationSec: 2700, durationUnreliable: false, exercises: []
        });

        const html = GymTodayCard(match());
        expect(html).toContain("Pierna Funcional · 2 ejercicios · ~45 min");

        getGymSessions().length = 0; // no contaminar otros tests de este archivo

    });

});
