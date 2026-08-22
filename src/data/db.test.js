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
function seedLegacyDatabase(version, { meta = [], plannedRaces = [], workouts = [] }) {

    return new Promise((resolve, reject) => {

        const request = indexedDB.open(DB_NAME, version);

        request.onupgradeneeded = () => {

            const db = request.result;
            const metaStore = db.createObjectStore("meta", { keyPath: "key" });
            const racesStore = db.createObjectStore("plannedRaces", { keyPath: "id" });
            racesStore.createIndex("date", "date", { unique: false });
            const workoutsStore = db.createObjectStore("workouts", { keyPath: "id" });

            meta.forEach(m => metaStore.put(m));
            plannedRaces.forEach(r => racesStore.put(r));
            workouts.forEach(w => workoutsStore.put(w));

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
                { key: "plannedRacesRegionMigrated", value: true },
                // la migración incremental (addMissingSeedRaces) es un paso
                // aparte, cubierto por su propio describe() más abajo -- se
                // marca como ya hecha aquí para que este test se quede solo
                // con las 44 originales y pueda comprobar la reparación de
                // region sin que se mezclen las 125 carreras nuevas.
                { key: "plannedRacesIncrementalSeedV1", value: true }
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

describe("migración incremental: instalaciones ya existentes reciben las carreras que les faltan (addMissingSeedRaces)", () => {

    beforeEach(() => {

        resetFakeIndexedDB();
        vi.resetModules();

    });

    const doneMetaExceptIncremental = [
        { key: "plannedRacesSeeded", value: true },
        { key: "plannedRacesRegionMigrated", value: true },
        { key: "plannedRacesRegionRepairedV2", value: true }
    ];

    it("a) instalación con datos previos (solo las 44 originales de Murcia RU, con ids propios distintos del seed) termina con las 169, sin duplicados", async () => {

        const { SEED_RACES } = await import("./seedRaces.js");
        const original44 = SEED_RACES
            .filter(r => r.region === "Murcia" && r.type === "RU")
            .map(r => ({ ...r, id: `mi-instalacion-${r.id}` }));

        await seedLegacyDatabase(6, { meta: doneMetaExceptIncremental, plannedRaces: original44 });

        const { getAll, STORES } = await import("./db.js");
        const result = await getAll(STORES.plannedRaces);

        expect(result).toHaveLength(169);

        const keys = result.map(r => `${r.date}__${r.name}`);
        expect(new Set(keys).size).toBe(169);

    });

    it("b) instalación que ya tenía las 169 importadas a mano (ids propios, no los del seed) no duplica nada", async () => {

        const { SEED_RACES } = await import("./seedRaces.js");
        const importedByHand = SEED_RACES.map(r => ({ ...r, id: `importada-a-mano-${r.id}` }));

        await seedLegacyDatabase(6, { meta: doneMetaExceptIncremental, plannedRaces: importedByHand });

        const { getAll, STORES } = await import("./db.js");
        const result = await getAll(STORES.plannedRaces);

        expect(result).toHaveLength(169);

        const keys = result.map(r => `${r.date}__${r.name}`);
        expect(new Set(keys).size).toBe(169);

        // se conservan los ids originales del usuario, no se reemplazan por los del seed
        result.forEach(r => expect(r.id.startsWith("importada-a-mano-")).toBe(true));

    });

    it("c) workouts (entrenos reales) queda exactamente igual, sin ningún cambio -- la migración nunca los lee ni escribe", async () => {

        const realWorkouts = [
            { id: "w1", type: "run", date: "2026-05-01", title: "Tirada larga", distanceKm: 18.4 },
            { id: "w2", type: "race", date: "2026-06-14", title: "10K Murcia" }
        ];

        await seedLegacyDatabase(6, { meta: doneMetaExceptIncremental, plannedRaces: [], workouts: realWorkouts });

        const { getAll, STORES } = await import("./db.js");
        const result = await getAll(STORES.workouts);

        expect(result).toEqual(realWorkouts);

    });

    it("d) instalación completamente nueva recibe las 169 vía el seed inicial, sin que la migración incremental añada ni duplique nada", async () => {

        const { getAll, STORES } = await import("./db.js");
        const result = await getAll(STORES.plannedRaces);

        expect(result).toHaveLength(169);

        const keys = result.map(r => `${r.date}__${r.name}`);
        expect(new Set(keys).size).toBe(169);

    });

    it("no repite la migración incremental en una instalación que ya la tiene aplicada", async () => {

        await seedLegacyDatabase(8, {
            meta: [...doneMetaExceptIncremental, { key: "plannedRacesIncrementalSeedV1", value: true }],
            plannedRaces: [
                { id: "m1", date: "2026-08-22", name: "El usuario borró el resto a mano", region: "Murcia" }
            ]
        });

        const { getAll, STORES } = await import("./db.js");
        const result = await getAll(STORES.plannedRaces);

        // si se repitiera, volvería a meter las 125 que faltan
        expect(result).toHaveLength(1);

    });

});
