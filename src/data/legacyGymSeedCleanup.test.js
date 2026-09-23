import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { LEGACY_SEED_DAYS, isUntouchedSeedRoutine } from "./legacyGymSeed.js";

function resetFakeIndexedDB() {
    globalThis.indexedDB = new IDBFactory();
}

// Tal cual la sembraba db.js antes de 52e0cc7.
function seededRoutine(seedDay, overrides = {}) {
    return {
        id: `default-${seedDay.id}`,
        name: seedDay.title,
        days: [structuredClone(seedDay)],
        progressionNote: "",
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-01T00:00:00.000Z",
        ...overrides
    };
}

describe("isUntouchedSeedRoutine", () => {

    it("reconoce las 3 rutinas semilla tal cual se sembraron", () => {

        LEGACY_SEED_DAYS.forEach(day => expect(isUntouchedSeedRoutine(seededRoutine(day))).toBe(true));

    });

    it("sigue reconociéndola con día de la semana asignado o nota de progresión (no cambian la plantilla)", () => {

        const [day] = LEGACY_SEED_DAYS;
        const routine = seededRoutine(day, { progressionNote: "Sube 2,5 kg" });
        routine.days[0].weekday = "lunes";

        expect(isUntouchedSeedRoutine(routine)).toBe(true);

    });

    it("nunca marca una rutina creada a mano aunque tenga el mismo nombre y los mismos ejercicios", () => {

        const [day] = LEGACY_SEED_DAYS;
        const manual = seededRoutine(day, { id: "3f2c9a1e-5b7d-4e8a-9c0f-1a2b3c4d5e6f" });

        expect(isUntouchedSeedRoutine(manual)).toBe(false);

    });

    it("no la marca si el usuario cambió peso, series, repeticiones, nombre o ejercicios", () => {

        const [day] = LEGACY_SEED_DAYS;

        const edits = [
            r => { r.days[0].exercises[0].targetWeight = 52.5; },
            r => { r.days[0].exercises[0].sets = 5; },
            r => { r.days[0].exercises[1].targetReps = "8"; },
            r => { r.name = "Mi torso"; },
            r => { r.days[0].exercises.pop(); },
            r => { r.days.push({ id: "extra", title: "Extra", exercises: [] }); }
        ];

        edits.forEach(edit => {
            const routine = seededRoutine(day);
            edit(routine);
            expect(isUntouchedSeedRoutine(routine)).toBe(false);
        });

    });

});

describe("limpieza única de rutinas semilla", () => {

    beforeEach(() => {
        resetFakeIndexedDB();
        vi.resetModules();
    });

    async function setup(routines) {

        const db = await import("./db.js");
        await Promise.all(routines.map(r => db.put(db.STORES.gymRoutines, r)));

        const store = await import("./gymRoutineStore.js");
        await store.hydrate();

        const cleanup = await import("./legacyGymSeedCleanup.js");
        return { db, store, cleanup };

    }

    it("propone solo las semilla intactas, nunca la rutina real con el mismo nombre", async () => {

        const [torso, pierna] = LEGACY_SEED_DAYS;
        const realTorso = seededRoutine(torso, { id: "manual-1" });

        const { store, cleanup } = await setup([seededRoutine(torso), seededRoutine(pierna), realTorso]);
        const state = await cleanup.loadSeedCleanupState();

        const pending = cleanup.getPendingSeedRoutines(store.getRoutines(), state);
        expect(pending.map(r => r.id).sort()).toEqual(["default-day1", "default-day2"]);

    });

    it("borra solo las marcadas, conserva el resto y no vuelve a preguntar", async () => {

        const [torso, pierna, full] = LEGACY_SEED_DAYS;
        const realTorso = seededRoutine(torso, { id: "manual-1" });

        const { store, cleanup } = await setup([seededRoutine(torso), seededRoutine(pierna), seededRoutine(full), realTorso]);
        const state = await cleanup.loadSeedCleanupState();
        const pending = cleanup.getPendingSeedRoutines(store.getRoutines(), state);

        await cleanup.resolveSeedCleanup(pending, ["default-day2"], state);

        expect(store.getRoutines().map(r => r.id).sort()).toEqual(["default-day1", "default-day3", "manual-1"]);

        // Tras reabrir la app: nada pendiente, ni siquiera las conservadas.
        vi.resetModules();
        const storeAgain = await import("./gymRoutineStore.js");
        await storeAgain.hydrate();
        const cleanupAgain = await import("./legacyGymSeedCleanup.js");
        const stateAgain = await cleanupAgain.loadSeedCleanupState();

        expect(storeAgain.getRoutines().some(r => r.id === "default-day2")).toBe(false);
        expect(stateAgain.done).toBe(true);
        expect(stateAgain.decisions).toEqual({ "default-day1": "kept", "default-day2": "deleted", "default-day3": "kept" });
        expect(cleanupAgain.getPendingSeedRoutines(storeAgain.getRoutines(), stateAgain)).toHaveLength(0);

    });

    it("una rutina conservada no se vuelve a proponer aunque se perdiera la marca de 'hecho'", async () => {

        const [torso] = LEGACY_SEED_DAYS;
        const { store, cleanup } = await setup([seededRoutine(torso)]);

        const pending = cleanup.getPendingSeedRoutines(store.getRoutines(), { done: false, decisions: { "default-day1": "kept" } });
        expect(pending).toHaveLength(0);

    });

});
