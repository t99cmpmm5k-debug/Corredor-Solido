import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { describe, it, expect, beforeEach, vi } from "vitest";

// Una IDBFactory nueva por test (no borrar y reabrir la misma) -- mismo
// patrón que workoutStore.test.js, para que la conexión del test anterior
// no bloquee el borrado (db.js nunca cierra sus conexiones).
function resetFakeIndexedDB() {

    globalThis.indexedDB = new IDBFactory();

}

describe("backup.js -- gymSessions en export/import (bug real corregido, Perfil Capa 3)", () => {

    beforeEach(() => {

        resetFakeIndexedDB();
        vi.resetModules();

    });

    it("importData() restaura gymSessions -- antes ni se exportaban ni se restauraban", async () => {

        const { hydrate } = await import("../data/workoutStore.js");
        const { hydrate: hydrateGym, getGymSessions } = await import("../data/gymSessionStore.js");
        const { importData } = await import("./backup.js");

        await hydrate();
        await hydrateGym();

        importData({
            schemaVersion: 1,
            exportedAt: "2026-09-01T00:00:00.000Z",
            workouts: [],
            shoes: [],
            plannedSessions: [],
            gymSessions: [{ id: "g1", dayId: "day1", date: "2026-09-01", exercises: [] }]
        });

        expect(getGymSessions().map(s => s.id)).toContain("g1");

    });

    it("un backup ANTERIOR al fix (sin campo gymSessions) se importa igual, sin romper", async () => {

        const { hydrate } = await import("../data/workoutStore.js");
        const { hydrate: hydrateGym, getGymSessions } = await import("../data/gymSessionStore.js");
        const { importData } = await import("./backup.js");

        await hydrate();
        await hydrateGym();

        expect(() => importData({
            schemaVersion: 1,
            exportedAt: "2026-08-01T00:00:00.000Z",
            workouts: [],
            shoes: [],
            plannedSessions: []
        })).not.toThrow();

        expect(getGymSessions()).toEqual([]);

    });

    it("reimportar el mismo backup dos veces no duplica la sesión de gimnasio (upsert por id)", async () => {

        const { hydrate } = await import("../data/workoutStore.js");
        const { hydrate: hydrateGym, getGymSessions } = await import("../data/gymSessionStore.js");
        const { importData } = await import("./backup.js");

        await hydrate();
        await hydrateGym();

        const payload = {
            schemaVersion: 1,
            exportedAt: "2026-09-01T00:00:00.000Z",
            workouts: [],
            shoes: [],
            plannedSessions: [],
            gymSessions: [{ id: "g1", dayId: "day1", date: "2026-09-01", exercises: [] }]
        };

        importData(payload);
        importData(payload);

        expect(getGymSessions().filter(s => s.id === "g1")).toHaveLength(1);

    });

});

describe("applyRestoreBatch() -- tombstones (bug real corregido: borrado que resucitaba tras un pull)", () => {

    beforeEach(() => {

        resetFakeIndexedDB();
        vi.resetModules();

    });

    it("un pull que trae de vuelta un workout ya borrado localmente no lo resucita si su tombstone también llega", async () => {

        const { hydrate, restoreWorkout, deleteWorkout, getWorkouts } = await import("../data/workoutStore.js");
        const { hydrate: hydrateTombstones, getTombstones } = await import("../data/tombstoneStore.js");
        const { applyRestoreBatch } = await import("./backup.js");

        await hydrate();
        await hydrateTombstones();

        // Simula un workout que ya se había subido al servidor antes de
        // borrarlo (por eso el servidor todavía lo devuelve en el pull).
        restoreWorkout({ id: "w1", date: "2026-09-01", type: "easy" });
        deleteWorkout("w1");

        const [tombstone] = getTombstones();
        expect(tombstone.storeKey).toBe("workouts");

        applyRestoreBatch({
            workouts: [{ id: "w1", date: "2026-09-01", type: "easy" }],
            tombstones: [tombstone]
        });

        expect(getWorkouts().map(w => w.id)).not.toContain("w1");

    });

    it("una tombstone que llega de OTRO dispositivo borra un workout que este dispositivo todavía tenía", async () => {

        const { hydrate, restoreWorkout, getWorkouts } = await import("../data/workoutStore.js");
        const { hydrate: hydrateTombstones } = await import("../data/tombstoneStore.js");
        const { applyRestoreBatch } = await import("./backup.js");

        await hydrate();
        await hydrateTombstones();

        restoreWorkout({ id: "w2", date: "2026-09-02", type: "long" });
        expect(getWorkouts().map(w => w.id)).toContain("w2");

        applyRestoreBatch({
            workouts: [],
            tombstones: [{ id: "workouts:w2", storeKey: "workouts", recordId: "w2", deletedAt: "2026-09-03T00:00:00.000Z" }]
        });

        expect(getWorkouts().map(w => w.id)).not.toContain("w2");

    });

    it("aplicar la misma tombstone dos veces (dos pulls) es un no-op limpio, no un error", async () => {

        const { hydrate, restoreWorkout, getWorkouts } = await import("../data/workoutStore.js");
        const { hydrate: hydrateTombstones } = await import("../data/tombstoneStore.js");
        const { applyRestoreBatch } = await import("./backup.js");

        await hydrate();
        await hydrateTombstones();

        restoreWorkout({ id: "w3", date: "2026-09-04", type: "easy" });

        const tombstone = { id: "workouts:w3", storeKey: "workouts", recordId: "w3", deletedAt: "2026-09-05T00:00:00.000Z" };

        expect(() => {
            applyRestoreBatch({ workouts: [], tombstones: [tombstone] });
            applyRestoreBatch({ workouts: [], tombstones: [tombstone] });
        }).not.toThrow();

        expect(getWorkouts().map(w => w.id)).not.toContain("w3");

    });

    it("hasDataWorthBackingUp() no cuenta las tombstones como datos -- borrar todo no debe disparar el aviso de backup", async () => {

        const { hydrate, restoreWorkout, deleteWorkout } = await import("../data/workoutStore.js");
        const { hydrate: hydrateGym } = await import("../data/gymSessionStore.js");
        const { hydrate: hydrateTombstones } = await import("../data/tombstoneStore.js");
        const { hasDataWorthBackingUp } = await import("./backup.js");

        await hydrate();
        await hydrateGym();
        await hydrateTombstones();

        restoreWorkout({ id: "w4", date: "2026-09-06", type: "easy" });
        deleteWorkout("w4");

        expect(hasDataWorthBackingUp()).toBe(false);

    });

});

describe("getDataSummary() -- resumen de solo lectura para Perfil", () => {

    beforeEach(() => {

        resetFakeIndexedDB();
        vi.resetModules();

    });

    it("cuenta los registros reales ya hidratados de cada store, sin cálculos", async () => {

        const { hydrate, restoreWorkout, restoreShoe } = await import("../data/workoutStore.js");
        const { hydrate: hydrateGym, restoreGymSession } = await import("../data/gymSessionStore.js");
        const { hydrate: hydrateRoutes, createReferenceRoute } = await import("../data/referenceRouteStore.js");
        const { getDataSummary } = await import("./backup.js");

        await hydrate();
        await hydrateGym();
        await hydrateRoutes();

        restoreWorkout({ id: "w1", date: "2026-09-01", type: "easy" });
        restoreShoe({ id: "sh1", brand: "Asics", model: "Nimbus", status: "active" });
        restoreGymSession({ id: "g1", dayId: "day1", date: "2026-09-01" });
        await createReferenceRoute("Ruta test");

        const summary = getDataSummary();

        expect(summary.workouts).toBe(1);
        expect(summary.shoes).toBe(1);
        expect(summary.gymSessions).toBe(1);
        expect(summary.referenceRoutes).toBe(1);
        expect(summary.plannedSessions).toBe(0);

    });

});

describe("getBackupStatus() -- recordatorio de 14 días con fecha real de última exportación", () => {

    beforeEach(() => {

        resetFakeIndexedDB();
        vi.resetModules();

    });

    it("con más de 14 días desde la última exportación real, avisa; recién exportado, deja de avisar", async () => {

        const { hydrate, restoreWorkout } = await import("../data/workoutStore.js");
        const { hydrate: hydrateGym } = await import("../data/gymSessionStore.js");
        const { STORES, put } = await import("../data/db.js");
        const { hydrateBackupMeta, getBackupStatus } = await import("./backup.js");

        await hydrate();
        await hydrateGym();
        restoreWorkout({ id: "w1", date: "2026-08-01", type: "easy" });

        const oldDate = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
        await put(STORES.meta, { key: "lastExportAt", value: oldDate });
        await hydrateBackupMeta();

        const stale = getBackupStatus();
        expect(stale.shouldRemind).toBe(true);
        expect(stale.daysSinceExport).toBeGreaterThanOrEqual(20);

        // "Exportar ahora" real -- pisa la fecha guardada con una de hoy, el
        // aviso debe desaparecer sin reiniciar la app.
        const freshDate = new Date().toISOString();
        await put(STORES.meta, { key: "lastExportAt", value: freshDate });
        await hydrateBackupMeta();

        const fresh = getBackupStatus();
        expect(fresh.shouldRemind).toBe(false);
        expect(fresh.daysSinceExport).toBe(0);

    });

    it("nunca se ha exportado, pero SÍ hay datos de gimnasio (aunque cero running): avisa igual", async () => {

        const { hydrate } = await import("../data/workoutStore.js");
        const { hydrate: hydrateGym, restoreGymSession } = await import("../data/gymSessionStore.js");
        const { getBackupStatus } = await import("./backup.js");

        await hydrate();
        await hydrateGym();
        restoreGymSession({ id: "g1", dayId: "day1", date: "2026-09-01" });

        const status = getBackupStatus();
        expect(status.shouldRemind).toBe(true);
        expect(status.daysSinceExport).toBeNull();

    });

    it("sin ningún dato real (ni running ni gimnasio), no avisa aunque nunca se haya exportado", async () => {

        const { hydrate } = await import("../data/workoutStore.js");
        const { hydrate: hydrateGym } = await import("../data/gymSessionStore.js");
        const { getBackupStatus } = await import("./backup.js");

        await hydrate();
        await hydrateGym();

        expect(getBackupStatus()).toEqual({ daysSinceExport: null, shouldRemind: false });

    });

});
