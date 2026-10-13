import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { describe, it, expect, beforeEach, vi } from "vitest";

// Aviso "Tienes N series sin marcar" al finalizar (2026-10-13): solo
// cuentan las series sin ✓ cuyo kg o reps se tocó a mano en esta sesión,
// no las que conservan el relleno automático.

function exercise(id, name, sets = 3) {

    return { id, name, muscleGroup: null, sets, targetReps: "10", targetWeight: null, weightUnit: "kg" };

}

async function setup() {

    const routines = await import("../../data/gymRoutineStore.js");
    const sessions = await import("../../data/gymSessionStore.js");
    const unmarked = await import("./unmarkedSets.js");

    await routines.hydrate();
    await sessions.hydrate();
    unmarked.resetSetTouchesForTests();

    return { routines, sessions, unmarked };

}

// Lo que hacen los +/− de kg y reps de la sesión (adjustWeight/adjustReps
// en initGymEvents.js): registrar el toque con la serie tal cual y cambiarla.
function touch({ sessions, unmarked }, sessionId, exerciseId, setIndex, patch) {

    const set = sessions.getSessionById(sessionId).exercises.find(e => e.exerciseId === exerciseId).sets[setIndex];
    unmarked.recordSetTouch(sessionId, exerciseId, setIndex, set);
    sessions.updateSet(sessionId, exerciseId, setIndex, patch);

}

describe("series sin marcar al finalizar", () => {

    beforeEach(() => {
        globalThis.indexedDB = new IDBFactory();
        try { localStorage.clear(); } catch { /* sin localStorage */ }
        vi.resetModules();
    });

    it("relleno automático sin tocar: no cuenta (aunque tenga kg)", async () => {

        const stores = await setup();
        const { routines, sessions, unmarked } = stores;

        // Sesión anterior con 60 kg hechos: la nueva arranca con 60 kg de relleno.
        routines.restoreRoutine({ id: "r", name: "Pierna", days: [{ id: "d", title: "Pierna", weekday: null, exercises: [exercise("e1", "Sentadilla")] }], progressionNote: "" });
        await sessions.restoreGymSession({
            id: "old", date: "2026-10-01", dayId: "d", startedAt: "2026-10-01T10:00:00Z", finishedAt: "2026-10-01T11:00:00Z",
            exercises: [{ exerciseId: "e1", name: "Sentadilla", sets: [{ weight: 60, reps: 10, done: true }], notes: "" }]
        });

        const session = sessions.startSession("d");
        expect(session.exercises[0].sets[0].weight).toBe(60);

        expect(unmarked.getUnmarkedTouchedSets(sessions.getSessionById(session.id))).toEqual([]);

    });

    it("serie tocada a mano sin ✓: cuenta; volver al valor de partida o marcarla: no", async () => {

        const stores = await setup();
        const { routines, sessions, unmarked } = stores;

        routines.restoreRoutine({ id: "r", name: "Torso", days: [{ id: "d", title: "Torso", weekday: null, exercises: [exercise("e1", "Press banca")] }], progressionNote: "" });
        const session = sessions.startSession("d");

        touch(stores, session.id, "e1", 0, { weight: 40 });
        touch(stores, session.id, "e1", 1, { reps: 12 });
        expect(unmarked.getUnmarkedTouchedSets(sessions.getSessionById(session.id))).toEqual([
            { exerciseId: "e1", setIndex: 0 },
            { exerciseId: "e1", setIndex: 1 }
        ]);

        // Serie 1: vuelve a sus 10 reps de partida -> ya no cuenta.
        touch(stores, session.id, "e1", 1, { reps: 10 });
        // Serie 0: se marca ✓ -> no cuenta.
        sessions.updateSet(session.id, "e1", 0, { done: true });

        expect(unmarked.getUnmarkedTouchedSets(sessions.getSessionById(session.id))).toEqual([]);

    });

    it("singular y plural del título", async () => {

        const { unmarked } = await setup();

        expect(unmarked.unmarkedSetsTitle(1)).toBe("Tienes 1 serie sin marcar");
        expect(unmarked.unmarkedSetsTitle(3)).toBe("Tienes 3 series sin marcar");

    });

    it("'Marcarlas y finalizar': la serie queda en el historial y en 'Anterior'", async () => {

        const stores = await setup();
        const { routines, sessions, unmarked } = stores;

        routines.restoreRoutine({ id: "r", name: "Torso", days: [{ id: "d", title: "Torso", weekday: null, exercises: [exercise("e1", "Press banca")] }], progressionNote: "" });
        const session = sessions.startSession("d");
        touch(stores, session.id, "e1", 0, { weight: 42.5 });

        // Lo que hace la acción: ✓ en las series del aviso y finalizar.
        const pending = unmarked.getUnmarkedTouchedSets(sessions.getSessionById(session.id));
        pending.forEach(({ exerciseId, setIndex }) => sessions.updateSet(session.id, exerciseId, setIndex, { done: true }));
        sessions.finishSession(session.id);
        unmarked.clearSetTouches(session.id);

        expect(sessions.getLastLoggedSet("e1", 0, { excludeSessionId: "otra" })).toEqual({ weight: 42.5, reps: 10 });
        expect(sessions.getCompletedGymSessions().map(s => s.id)).toContain(session.id);
        expect(unmarked.getUnmarkedTouchedSets(sessions.getSessionById(session.id))).toEqual([]);

    });

    it("'Finalizar sin ellas': la serie no se guarda en el historial", async () => {

        const stores = await setup();
        const { routines, sessions, unmarked } = stores;

        routines.restoreRoutine({ id: "r", name: "Torso", days: [{ id: "d", title: "Torso", weekday: null, exercises: [exercise("e1", "Press banca")] }], progressionNote: "" });
        const session = sessions.startSession("d");
        touch(stores, session.id, "e1", 0, { weight: 42.5 });

        sessions.finishSession(session.id);
        unmarked.clearSetTouches(session.id);

        expect(sessions.getLastLoggedSet("e1", 0, { excludeSessionId: "otra" })).toBe(null);
        // Sin ninguna serie hecha no cuenta como entreno hecho (como antes).
        expect(sessions.getCompletedGymSessions().map(s => s.id)).not.toContain(session.id);

    });

    it("los toques sobreviven a una recarga (localStorage) y son por sesión", async () => {

        const data = new Map();
        vi.stubGlobal("localStorage", {
            getItem: key => data.get(key) ?? null,
            setItem: (key, value) => data.set(key, String(value)),
            clear: () => data.clear()
        });

        const stores = await setup();
        const { routines, sessions, unmarked } = stores;

        routines.restoreRoutine({ id: "r", name: "Torso", days: [{ id: "d", title: "Torso", weekday: null, exercises: [exercise("e1", "Press banca")] }], progressionNote: "" });
        const session = sessions.startSession("d");
        touch(stores, session.id, "e1", 2, { weight: 20 });

        unmarked.resetSetTouchesForTests();
        expect(unmarked.getUnmarkedTouchedSets(sessions.getSessionById(session.id))).toEqual([{ exerciseId: "e1", setIndex: 2 }]);
        expect(unmarked.getUnmarkedTouchedSets({ id: "otra", exercises: sessions.getSessionById(session.id).exercises })).toEqual([]);

        vi.unstubAllGlobals();

    });

});
