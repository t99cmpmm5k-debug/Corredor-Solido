import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { parseBodyCompositionForm } from "./bodyCompositionStore.js";

function resetFakeIndexedDB() {
    globalThis.indexedDB = new IDBFactory();
}

describe("parseBodyCompositionForm", () => {

    it("con todos los campos, acepta coma decimal y redondea a un decimal", () => {

        const { fields } = parseBodyCompositionForm({ date: "2026-09-23", weightKg: "72,45", bodyFatPercent: "18,2", waterPercent: "55", musclePercent: "41.37" });

        expect(fields).toEqual({ date: "2026-09-23", weightKg: 72.5, bodyFatPercent: 18.2, waterPercent: 55, musclePercent: 41.4 });

    });

    it("solo con peso: los porcentajes quedan null, nunca 0 ni estimados", () => {

        const { fields } = parseBodyCompositionForm({ date: "2026-09-23", weightKg: "71", bodyFatPercent: "", waterPercent: " ", musclePercent: undefined });

        expect(fields).toEqual({ date: "2026-09-23", weightKg: 71, bodyFatPercent: null, waterPercent: null, musclePercent: null });

    });

    it("rechaza peso vacío o imposible, porcentajes fuera de 0-100 y fecha vacía", () => {

        expect(parseBodyCompositionForm({ date: "2026-09-23", weightKg: "" }).error).toMatch(/obligatorio/);
        expect(parseBodyCompositionForm({ date: "2026-09-23", weightKg: "0" }).error).toMatch(/peso/);
        expect(parseBodyCompositionForm({ date: "2026-09-23", weightKg: "abc" }).error).toMatch(/peso/);
        expect(parseBodyCompositionForm({ date: "2026-09-23", weightKg: "70", bodyFatPercent: "120" }).error).toMatch(/grasa/);
        expect(parseBodyCompositionForm({ date: "", weightKg: "70" }).error).toMatch(/fecha/);

    });

});

describe("bodyCompositionStore", () => {

    beforeEach(() => {
        resetFakeIndexedDB();
        vi.resetModules();
    });

    it("añade, edita y borra registros; persiste en IndexedDB y ordena por fecha descendente", async () => {

        const store = await import("./bodyCompositionStore.js");
        await store.hydrate();

        const older = store.addBodyCompositionEntry({ date: "2026-09-01", weightKg: 73, bodyFatPercent: null, waterPercent: null, musclePercent: null });
        const newer = store.addBodyCompositionEntry({ date: "2026-09-20", weightKg: 72, bodyFatPercent: 18, waterPercent: 55, musclePercent: 41 });

        expect(store.getBodyCompositionEntries().map(e => e.id)).toEqual([newer.id, older.id]);

        store.updateBodyCompositionEntry(older.id, { weightKg: 73.4 });
        store.deleteBodyCompositionEntry(newer.id);
        await new Promise(r => setTimeout(r, 20));

        vi.resetModules();
        const again = await import("./bodyCompositionStore.js");
        await again.hydrate();

        expect(again.getBodyCompositionEntries()).toEqual([expect.objectContaining({ id: older.id, weightKg: 73.4, bodyFatPercent: null })]);

    });

    it("cada cambio dispara el sync y el borrado deja tombstone", async () => {

        const store = await import("./bodyCompositionStore.js");
        const tombstones = await import("./tombstoneStore.js");
        const { onDataChanged } = await import("./changeEvents.js");
        await store.hydrate();
        await tombstones.hydrate();

        const listener = vi.fn();
        onDataChanged(listener);

        const entry = store.addBodyCompositionEntry({ date: "2026-09-23", weightKg: 72, bodyFatPercent: null, waterPercent: null, musclePercent: null });
        store.updateBodyCompositionEntry(entry.id, { weightKg: 71.8 });
        store.deleteBodyCompositionEntry(entry.id);

        expect(listener).toHaveBeenCalledTimes(3);
        expect(tombstones.getTombstones().map(t => t.id)).toContain(`bodyComposition:${entry.id}`);

    });

});

describe("getLatestBodyComposition / getBodyCompositionSeries", () => {

    beforeEach(() => {
        resetFakeIndexedDB();
        vi.resetModules();
    });

    it("compara cada métrica con el anterior que la tenga; sin valor o sin anterior, sin comparación", async () => {

        const store = await import("./bodyCompositionStore.js");
        await store.hydrate();

        store.addBodyCompositionEntry({ date: "2026-09-10", weightKg: 81.7, bodyFatPercent: 17.3, waterPercent: null, musclePercent: 43.8 });
        store.addBodyCompositionEntry({ date: "2026-09-17", weightKg: 81.2, bodyFatPercent: null, waterPercent: null, musclePercent: null });
        store.addBodyCompositionEntry({ date: "2026-09-24", weightKg: 80.9, bodyFatPercent: 16.2, waterPercent: 61.3, musclePercent: null });

        const { date, metrics } = store.getLatestBodyComposition();

        expect(date).toBe("2026-09-24");
        expect(metrics.weightKg).toEqual({ value: 80.9, previousValue: 81.2, previousDate: "2026-09-17", delta: -0.3 });
        // El 17 no tiene % grasa: se compara con el 10.
        expect(metrics.bodyFatPercent).toEqual({ value: 16.2, previousValue: 17.3, previousDate: "2026-09-10", delta: -1.1 });
        // Primer registro con agua: sin nada con qué comparar.
        expect(metrics.waterPercent).toEqual({ value: 61.3, previousValue: null, previousDate: null, delta: null });
        // Sin valor hoy: sin comparación aunque haya uno antes.
        expect(metrics.musclePercent).toEqual({ value: null, previousValue: null, previousDate: null, delta: null });

    });

    it("serie de los últimos 30 días, en orden y solo con registros que tienen esa métrica", async () => {

        const store = await import("./bodyCompositionStore.js");
        await store.hydrate();

        store.addBodyCompositionEntry({ date: "2026-08-25", weightKg: 82, bodyFatPercent: null, waterPercent: null, musclePercent: null });
        store.addBodyCompositionEntry({ date: "2026-08-26", weightKg: 81.9, bodyFatPercent: 17, waterPercent: null, musclePercent: null });
        store.addBodyCompositionEntry({ date: "2026-09-24", weightKg: 80.9, bodyFatPercent: null, waterPercent: null, musclePercent: null });

        expect(store.getBodyCompositionSeries("weightKg", "2026-09-24")).toEqual([
            { date: "2026-08-26", value: 81.9 },
            { date: "2026-09-24", value: 80.9 }
        ]);
        expect(store.getBodyCompositionSeries("bodyFatPercent", "2026-09-24")).toEqual([{ date: "2026-08-26", value: 17 }]);

    });

});
