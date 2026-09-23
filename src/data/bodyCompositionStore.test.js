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
