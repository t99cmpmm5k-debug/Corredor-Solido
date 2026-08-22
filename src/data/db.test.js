import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { describe, it, expect, beforeEach, vi } from "vitest";

const DB_NAME = "corredor-solido";

// Una IDBFactory nueva por test (en vez de borrar y reabrir la misma) —
// así no queda una conexión abierta del test anterior bloqueando el
// borrado (db.js nunca cierra sus conexiones, ni falta que le hace fuera
// de tests: en la app vive toda la sesión).
function resetFakeIndexedDB() {

    globalThis.indexedDB = new IDBFactory();

}

// Crea a mano el estado mínimo de una instalación YA EXISTENTE, sin pasar
// por db.js -- simula justo lo que había en el disco de un usuario real
// antes de este fix: un meta ya marcado como migrado (para que la
// migración original no vuelva a ejecutarse sola) y unas plannedRaces con
// region a null porque un reimport del calendario de Murcia (que no trae
// "region" en el JSON) pisó el valor que la migración había puesto.
function seedLegacyDatabase(version, { meta = [], plannedRaces = [] }) {

    return new Promise((resolve, reject) => {

        const request = indexedDB.open(DB_NAME, version);

        request.onupgradeneeded = () => {

            const db = request.result;
            const metaStore = db.createObjectStore("meta", { keyPath: "key" });
            const racesStore = db.createObjectStore("plannedRaces", { keyPath: "id" });
            racesStore.createIndex("date", "date", { unique: false });

            meta.forEach(m => metaStore.put(m));
            plannedRaces.forEach(r => racesStore.put(r));

        };

        request.onsuccess = () => { request.result.close(); resolve(); };
        request.onerror = () => reject(request.error);

    });

}

describe("reparación de region en plannedRaces (instalación ya existente, no una limpia)", () => {

    beforeEach(() => {

        resetFakeIndexedDB();
        vi.resetModules();

    });

    it("repara a Murcia las 44 carreras que se quedaron con region null tras reimportar, sin tocar el resto de sus campos", async () => {

        const legacyRaces = Array.from({ length: 44 }, (_, i) => ({
            id: `legacy-race-${i}`,
            date: "2026-08-22",
            type: "RU",
            name: `Carrera de Murcia ${i}`,
            location: "Murcia, Murcia",
            registrationDeadline: null,
            url: "https://www.alcanzatumeta.es/calendario.php",
            region: null,
            importBatchId: "batch-reimport"
        }));

        await seedLegacyDatabase(6, {
            meta: [
                { key: "plannedRacesSeeded", value: true },
                { key: "plannedRacesRegionMigrated", value: true }
            ],
            plannedRaces: legacyRaces
        });

        const { getAll, STORES } = await import("./db.js");
        const result = await getAll(STORES.plannedRaces);

        expect(result).toHaveLength(44);
        result.forEach(race => expect(race.region).toBe("Murcia"));

        const first = result.find(r => r.id === "legacy-race-0");
        expect(first.name).toBe("Carrera de Murcia 0");
        expect(first.location).toBe("Murcia, Murcia");
        expect(first.importBatchId).toBe("batch-reimport");

    });

    it("no toca una region ya puesta a Andalucía, solo repara las que están a null", async () => {

        await seedLegacyDatabase(6, {
            meta: [
                { key: "plannedRacesSeeded", value: true },
                { key: "plannedRacesRegionMigrated", value: true }
            ],
            plannedRaces: [
                { id: "m1", date: "2026-08-22", name: "Murcia sin region tras el reimport", region: null },
                { id: "a1", date: "2026-08-23", name: "Andalucía con region correcta", region: "Andalucía" }
            ]
        });

        const { getAll, STORES } = await import("./db.js");
        const result = await getAll(STORES.plannedRaces);

        expect(result.find(r => r.id === "m1").region).toBe("Murcia");
        expect(result.find(r => r.id === "a1").region).toBe("Andalucía");

    });

    it("no repite la reparación en una instalación que ya la tiene aplicada", async () => {

        await seedLegacyDatabase(7, {
            meta: [
                { key: "plannedRacesSeeded", value: true },
                { key: "plannedRacesRegionMigrated", value: true },
                { key: "plannedRacesRegionRepairedV2", value: true }
            ],
            plannedRaces: [
                // region null a propósito: si la reparación se repitiera
                // por error, esto pasaría a "Murcia" -- debe quedarse null
                // porque su meta ya dice "reparación hecha".
                { id: "m1", date: "2026-08-22", name: "Carrera borrada a mano por el usuario", region: null }
            ]
        });

        const { getAll, STORES } = await import("./db.js");
        const result = await getAll(STORES.plannedRaces);

        expect(result.find(r => r.id === "m1").region).toBeNull();

    });

    it("una instalación nueva (sin plannedRaces) se siembra ya con region correcto en las 169 carreras, sin pasar por ninguna reparación", async () => {

        const { getAll, STORES } = await import("./db.js");
        const result = await getAll(STORES.plannedRaces);

        expect(result).toHaveLength(169);
        result.forEach(race => expect(typeof race.region).toBe("string"));

    });

});
