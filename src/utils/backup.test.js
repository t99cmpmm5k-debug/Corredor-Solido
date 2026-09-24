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

describe("backup.js / sync -- rutinas de gimnasio (antes solo en el dispositivo)", () => {

    beforeEach(() => {
        resetFakeIndexedDB();
        vi.resetModules();
    });

    async function setup() {

        const routineStore = await import("../data/gymRoutineStore.js");
        const cleanup = await import("../data/legacyGymSeedCleanup.js");
        const tombstones = await import("../data/tombstoneStore.js");
        await routineStore.hydrate();
        await tombstones.hydrate();
        const backup = await import("./backup.js");
        return { routineStore, cleanup, tombstones, backup };

    }

    async function seedRoutine(overrides = {}) {
        const { LEGACY_SEED_DAYS } = await import("../data/legacyGymSeed.js");
        const [day] = LEGACY_SEED_DAYS;
        return { id: `default-${day.id}`, name: day.title, days: [structuredClone(day)], progressionNote: "", ...overrides };
    }

    it("una rutina creada a mano entra en getSyncableData() (push al servidor y export JSON)", async () => {

        const { routineStore, backup } = await setup();
        const routine = await routineStore.createRoutine({ name: "Torso", days: [{ id: "d1", title: "Día 1", exercises: [] }], progressionNote: "" });

        expect(backup.getSyncableData().gymRoutines.map(r => r.id)).toEqual([routine.id]);

    });

    it("importData() restaura las rutinas en un estado limpio, con su id original", async () => {

        const { routineStore, backup } = await setup();
        const routine = { id: "r-abc", name: "Pierna", days: [{ id: "d1", title: "Día 1", exercises: [] }], progressionNote: "" };

        backup.importData({ schemaVersion: 1, exportedAt: "2026-09-23T00:00:00.000Z", gymRoutines: [routine] });

        expect(routineStore.getRoutineById("r-abc")).toMatchObject({ name: "Pierna" });

    });

    it("borrar una rutina deja una tombstone de gymRoutines, y aplicarla desde un pull la borra", async () => {

        const { routineStore, tombstones, backup } = await setup();
        const routine = await routineStore.createRoutine({ name: "A borrar", days: [], progressionNote: "" });

        routineStore.deleteRoutine(routine.id);
        expect(tombstones.getTombstones().map(t => t.id)).toContain(`gymRoutines:${routine.id}`);

        backup.applyRestoreBatch({ gymRoutines: [{ id: "r-remote", name: "Remota", days: [], progressionNote: "" }] });
        backup.applyRestoreBatch({ tombstones: [{ id: "gymRoutines:r-remote", storeKey: "gymRoutines", recordId: "r-remote" }] });
        expect(routineStore.getRoutineById("r-remote")).toBeNull();

    });

    it("crear, editar y borrar una rutina disparan la sincronización como cualquier otro cambio", async () => {

        const { routineStore } = await setup();
        const { onDataChanged } = await import("../data/changeEvents.js");
        const listener = vi.fn();
        onDataChanged(listener);

        const routine = await routineStore.createRoutine({ name: "R", days: [], progressionNote: "" });
        routineStore.updateRoutine(routine.id, { name: "R2", days: [], progressionNote: "" });
        routineStore.deleteRoutine(routine.id);

        expect(listener).toHaveBeenCalledTimes(3);

    });

    it("una rutina semilla sin decidir en el aviso de limpieza NO sale del dispositivo", async () => {

        const { routineStore, cleanup, backup } = await setup();
        routineStore.restoreRoutine(await seedRoutine());
        await cleanup.hydrateSeedCleanupState();

        expect(backup.getSyncableData().gymRoutines).toHaveLength(0);

    });

    it("una semilla conservada sí se sube, con la decisión dentro de la propia rutina (un móvil nuevo no vuelve a preguntar)", async () => {

        const { routineStore, cleanup, backup } = await setup();
        const seed = await seedRoutine();
        routineStore.restoreRoutine(seed);

        const state = await cleanup.loadSeedCleanupState();
        const pending = cleanup.getPendingSeedRoutines(routineStore.getRoutines(), state);
        await cleanup.resolveSeedCleanup(pending, [], state);

        const synced = backup.getSyncableData().gymRoutines;
        expect(synced.map(r => r.id)).toEqual([seed.id]);
        expect(synced[0].seedCleanupDecision).toBe("kept");

        // Otro dispositivo, estado de limpieza vacío: no la vuelve a proponer.
        expect(cleanup.getPendingSeedRoutines(synced, { done: false, decisions: {} })).toHaveLength(0);

    });

    it("una semilla conservada antes de este cambio (decisión solo en el meta local) se sella en la rutina", async () => {

        const { routineStore, cleanup, backup } = await setup();
        routineStore.restoreRoutine(await seedRoutine());

        cleanup.stampKeptDecisions(routineStore.getRoutines(), { done: true, decisions: { "default-day1": "kept" } });

        expect(routineStore.getRoutineById("default-day1").seedCleanupDecision).toBe("kept");
        expect(backup.getSyncableData().gymRoutines).toHaveLength(1);

    });

});

describe("backup.js / sync -- composición corporal (en el sync desde el primer día)", () => {

    beforeEach(() => {
        resetFakeIndexedDB();
        vi.resetModules();
    });

    it("los registros entran en getSyncableData() y importData() los restaura con su id, sin inventar campos", async () => {

        const store = await import("../data/bodyCompositionStore.js");
        await store.hydrate();
        const backup = await import("./backup.js");

        const entry = store.addBodyCompositionEntry({ date: "2026-09-23", weightKg: 72.1, bodyFatPercent: null, waterPercent: null, musclePercent: null });
        expect(backup.getSyncableData().bodyComposition.map(e => e.id)).toEqual([entry.id]);
        expect(backup.getDataSummary().bodyComposition).toBe(1);

        vi.resetModules();
        resetFakeIndexedDB();
        const fresh = await import("../data/bodyCompositionStore.js");
        await fresh.hydrate();
        const freshBackup = await import("./backup.js");

        freshBackup.importData({ schemaVersion: 1, exportedAt: "2026-09-23T00:00:00.000Z", bodyComposition: [entry] });

        expect(fresh.getBodyCompositionEntries()).toEqual([entry]);

    });

});

describe("backup.js / sync -- nutrición (en el sync desde el primer día)", () => {

    beforeEach(() => {
        resetFakeIndexedDB();
        vi.resetModules();
    });

    it("los alimentos entran en getSyncableData() y importData() los restaura con su id", async () => {

        const store = await import("../data/nutritionStore.js");
        await store.hydrate();
        const backup = await import("./backup.js");

        const product = { code: "1", name: "Plátano", brand: null, unit: "g", per100: { kcal: 90, protein: 1.2, carbs: 20, fat: null }, serving: null };
        const entry = store.addNutritionEntry({ date: "2026-09-24", meal: "snack", product, grams: 120 });
        expect(backup.getSyncableData().nutritionEntries.map(e => e.id)).toEqual([entry.id]);
        expect(backup.getDataSummary().nutritionEntries).toBe(1);

        vi.resetModules();
        resetFakeIndexedDB();
        const fresh = await import("../data/nutritionStore.js");
        await fresh.hydrate();
        const freshBackup = await import("./backup.js");

        freshBackup.importData({ schemaVersion: 1, exportedAt: "2026-09-24T00:00:00.000Z", nutritionEntries: [entry] });

        expect(fresh.getNutritionEntries()).toEqual([entry]);

    });

});

describe("backup.js / sync -- dieta de la plantilla CSV (en el sync desde el primer día)", () => {

    beforeEach(() => {
        resetFakeIndexedDB();
        vi.resetModules();
    });

    it("dieta, días marcados y fines de semana elegidos entran en getSyncableData() e importData() los restaura", async () => {

        const store = await import("../data/dietStore.js");
        const { parseDietCsv } = await import("./dietCsv.js");
        await store.hydrate();
        const backup = await import("./backup.js");

        const csv = ["dia,momento,opcion,alimento,notas", ...["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "TIRADA_LARGA", "DESCANSO"].map(d => `${d},09:00,1,avena 35 g,`)].join(String.fromCharCode(10));
        const plan = store.importDietPlan(parseDietCsv(csv).plan);
        store.toggleMealEaten("2026-09-24", plan.id, "JUEVES|09:00", "JUEVES|09:00|1");
        store.setWeekendLongRunDay("2026-09-24", "domingo");

        const data = backup.getSyncableData();
        expect(data.dietPlans.map(p => p.id)).toEqual([plan.id]);
        expect(data.dietChecks.map(c => c.id)).toEqual(["2026-09-24"]);
        expect(data.dietWeekends.map(w => w.id)).toEqual(["2026-09-21"]);
        expect(backup.getDataSummary()).toMatchObject({ dietPlans: 1, dietChecks: 1, dietWeekends: 1 });

        vi.resetModules();
        resetFakeIndexedDB();
        const fresh = await import("../data/dietStore.js");
        await fresh.hydrate();
        const freshBackup = await import("./backup.js");

        freshBackup.importData({ schemaVersion: 1, exportedAt: "2026-09-24T00:00:00.000Z", dietPlans: data.dietPlans, dietChecks: data.dietChecks, dietWeekends: data.dietWeekends });

        expect(fresh.getActiveDietPlan()).toEqual(plan);
        expect(fresh.getEatenForDate("2026-09-24")).toEqual({ "JUEVES|09:00": "JUEVES|09:00|1" });
        expect(fresh.getWeekendLongRunDay("2026-09-26")).toBe("domingo");

    });

});
