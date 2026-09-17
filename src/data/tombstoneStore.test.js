import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { describe, it, expect, beforeEach, vi } from "vitest";

// Una IDBFactory nueva por test -- mismo patrón que workoutStore.test.js,
// para que la conexión del test anterior no bloquee el borrado (db.js
// nunca cierra sus conexiones).
function resetFakeIndexedDB() {

    globalThis.indexedDB = new IDBFactory();

}

describe("tombstoneStore.js -- registro de borrados reales para propagar por el sync", () => {

    beforeEach(() => {

        resetFakeIndexedDB();
        vi.resetModules();

    });

    it("recordTombstone() guarda una tombstone con id compuesto storeKey:recordId", async () => {

        const { hydrate, recordTombstone, getTombstones } = await import("./tombstoneStore.js");
        await hydrate();

        recordTombstone("workouts", "w1");

        const tombstone = getTombstones().find(t => t.id === "workouts:w1");
        expect(tombstone).toBeTruthy();
        expect(tombstone.storeKey).toBe("workouts");
        expect(tombstone.recordId).toBe("w1");
        expect(typeof tombstone.deletedAt).toBe("string");

    });

    it("recordTombstone() sobrevive a un rehidratado (persiste de verdad en IndexedDB)", async () => {

        const { hydrate, recordTombstone } = await import("./tombstoneStore.js");
        await hydrate();

        recordTombstone("plannedSessions", "ps1");

        vi.resetModules();

        const { hydrate: hydrateAgain, getTombstones: getTombstonesAgain } = await import("./tombstoneStore.js");
        await hydrateAgain();

        expect(getTombstonesAgain().map(t => t.id)).toContain("plannedSessions:ps1");

    });

    it("restoreTombstone() hace upsert ciego por id -- reimportar la misma no duplica", async () => {

        const { hydrate, restoreTombstone, getTombstones } = await import("./tombstoneStore.js");
        await hydrate();

        const tombstone = { id: "gymSessions:g1", storeKey: "gymSessions", recordId: "g1", deletedAt: "2026-09-01T00:00:00.000Z" };

        restoreTombstone(tombstone);
        restoreTombstone(tombstone);

        expect(getTombstones().filter(t => t.id === "gymSessions:g1")).toHaveLength(1);

    });

});
