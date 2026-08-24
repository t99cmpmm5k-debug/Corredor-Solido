import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { describe, it, expect, beforeEach, vi } from "vitest";

function resetFakeIndexedDB() {
    globalThis.indexedDB = new IDBFactory();
}

describe("gymSessionStore — RIR retirado de la interfaz, sin tocar datos históricos", () => {

    beforeEach(async () => {

        resetFakeIndexedDB();

        // hydrate() memoiza su promesa a nivel de módulo -- sin esto, el
        // segundo test reutilizaría la hidratación (y el array en memoria)
        // del primero en vez de leer la IndexedDB fresca de este test.
        vi.resetModules();

    });

    it("una sesión nueva ya no guarda rir en sus series", async () => {

        const { hydrate: hydrateRoutines, createRoutine } = await import("./gymRoutineStore.js");
        await hydrateRoutines();

        const routine = await createRoutine({
            name: "Torso",
            days: [{
                id: "d1",
                title: "Día 1",
                exercises: [{ id: "e1", name: "Press", sets: 2, targetReps: "8", targetWeight: 40, weightUnit: "kg" }]
            }],
            progressionNote: ""
        });

        const { hydrate: hydrateSessions, startSession } = await import("./gymSessionStore.js");
        await hydrateSessions();

        const session = startSession(routine.days[0].id);

        expect(session.exercises[0].sets[0]).not.toHaveProperty("rir");
        expect(Object.keys(session.exercises[0].sets[0]).sort()).toEqual(["done", "reps", "weight"]);

    });

    it("una sesión antigua con rir ya guardado en IndexedDB no lo expone en getExerciseSessionHistory (dato histórico intacto, solo deja de mostrarse)", async () => {

        // Registro tal cual lo dejaría una versión anterior de la app,
        // escrito directamente en IndexedDB (sin pasar por buildInitialSets,
        // que ya no produce rir) -- simula el histórico real de un usuario.
        const request = indexedDB.open("corredor-solido", 9);

        await new Promise((resolve, reject) => {

            request.onupgradeneeded = () => {

                const db = request.result;
                db.createObjectStore("meta", { keyPath: "key" });
                db.createObjectStore("gymRoutines", { keyPath: "id" });
                const gymSessions = db.createObjectStore("gymSessions", { keyPath: "id" });
                gymSessions.createIndex("date", "date", { unique: false });
                gymSessions.createIndex("dayId", "dayId", { unique: false });

            };

            request.onsuccess = () => {

                const db = request.result;
                const tx = db.transaction("gymSessions", "readwrite");

                tx.objectStore("gymSessions").put({
                    id: "s-antigua",
                    date: "2026-01-10",
                    dayId: "d1",
                    finishedAt: "2026-01-10T12:00:00.000Z",
                    exercises: [{
                        exerciseId: "e1",
                        name: "Press",
                        sets: [{ weight: 40, reps: 8, rir: 2, done: true }],
                        notes: ""
                    }]
                });

                tx.oncomplete = () => { db.close(); resolve(); };
                tx.onerror = () => reject(tx.error);

            };

            request.onerror = () => reject(request.error);

        });

        const { hydrate, getExerciseSessionHistory, getGymSessions } = await import("./gymSessionStore.js");
        await hydrate();

        // El dato sigue existiendo tal cual en el store en memoria (nunca
        // se borra el histórico) ...
        expect(getGymSessions()[0].exercises[0].sets[0].rir).toBe(2);

        // ... pero la función que alimenta la UI de historial ya no lo
        // expone en absoluto.
        const history = getExerciseSessionHistory("e1");
        expect(history[0].sets[0]).not.toHaveProperty("rir");
        expect(history[0].sets[0]).toEqual({ weight: 40, reps: 8 });

    });

});
