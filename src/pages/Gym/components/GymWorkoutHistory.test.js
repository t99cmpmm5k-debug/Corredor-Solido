import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { describe, it, expect, beforeEach, vi } from "vitest";

async function load() {

    const routines = await import("../../../data/gymRoutineStore.js");
    const sessions = await import("../../../data/gymSessionStore.js");
    const view = await import("./GymWorkoutHistory.js");

    await routines.hydrate();
    await sessions.hydrate();

    return { routines, sessions, view };

}

function savedSession(id, date, dayId, sets) {

    return {
        id, date, dayId,
        startedAt: `${date}T10:00:00.000Z`,
        finishedAt: `${date}T11:00:00.000Z`,
        exercises: [{ exerciseId: "e1", name: "Hip Thrust", sets, notes: "" }]
    };

}

describe("Entrenos hechos (pestaña Rutinas)", () => {

    beforeEach(() => {
        globalThis.indexedDB = new IDBFactory();
        vi.resetModules();
    });

    it("sin entrenos: estado vacío limpio, sin 0/0 ni enlace al historial", async () => {

        const { view } = await load();

        const html = view.GymWorkoutsDoneSection();

        expect(html).toContain("Aún no has guardado entrenos");
        expect(html).not.toMatch(/\b0\b/);
        expect(html).not.toContain("Ver historial completo");

    });

    it("muestra solo los 3 últimos, con rutina, ejercicios y series, y el enlace al historial", async () => {

        const { routines, sessions, view } = await load();

        await routines.restoreRoutine({
            id: "r1", name: "Día 1 – Glúteo y Pierna (Fuerte)", progressionNote: "",
            days: [{ id: "d1", title: "Día 1 – Glúteo y Pierna (Fuerte)", weekday: null, exercises: [] }]
        });

        for (const [index, date] of ["2026-10-01", "2026-10-03", "2026-10-06", "2026-10-08"].entries()) {
            await sessions.restoreGymSession(savedSession(`s${index}`, date, "d1", [
                { weight: 40, reps: 10, done: true },
                { weight: 45, reps: 10, done: true }
            ]));
        }

        const html = view.GymWorkoutsDoneSection();

        expect(html.match(/data-action="open-gym-session-detail"/g)).toHaveLength(3);
        expect(html).toContain('data-session-id="s3"');
        expect(html).not.toContain('data-session-id="s0"');
        expect(html).toContain("Día 1 – Glúteo y Pierna (Fuerte)");
        expect(html).toContain("1 ejercicio · 2 series");
        expect(html).toContain("Ver historial completo");

    });

    it("detalle de un entreno: cada serie kg × reps; rutina ya borrada → 'Entrenamiento'", async () => {

        const { sessions, view } = await load();

        await sessions.restoreGymSession(savedSession("s1", "2026-10-01", "dia-borrado", [
            { weight: 61.25, reps: 10, done: true },
            { weight: 65, reps: 8, done: false }
        ]));

        const html = view.GymWorkoutSessionDetailView("s1");

        expect(html).toContain("Entrenamiento");
        expect(html).toContain("Hip Thrust");
        expect(html).toContain("61,25 kg × 10");
        expect(html).not.toContain("65 kg × 8");

    });

});
