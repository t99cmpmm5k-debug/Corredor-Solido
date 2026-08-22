import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { describe, it, expect, beforeEach, vi } from "vitest";

// Una IDBFactory nueva por test (en vez de borrar y reabrir la misma) —
// así no queda una conexión abierta del test anterior bloqueando el
// borrado (db.js nunca cierra sus conexiones, ni falta que le hace fuera
// de tests: en la app vive toda la sesión).
function resetFakeIndexedDB() {

    globalThis.indexedDB = new IDBFactory();

}

describe("importPlannedRaces - dedupe por fecha+nombre conserva region al reimportar", () => {

    beforeEach(() => {

        resetFakeIndexedDB();
        vi.resetModules();

    });

    it("reimportar el mismo calendario sin \"region\" (como los JSON originales de Murcia) no borra el region ya guardado", async () => {

        const { hydrate, importPlannedRaces, getPlannedRaces } = await import("./workoutStore.js");
        await hydrate();

        await importPlannedRaces([{
            date: "2026-08-22", type: "RU", name: "Carrera de prueba única",
            location: "Ojós, Murcia", registrationDeadline: null,
            url: "https://x.test", region: "Murcia"
        }]);

        const findIt = () => getPlannedRaces().find(r => r.name === "Carrera de prueba única");

        expect(findIt().region).toBe("Murcia");

        // reimport del "mismo archivo": misma fecha+nombre, pero sin region
        // (el JSON original nunca lo trajo) -- debe conservar "Murcia".
        await importPlannedRaces([{
            date: "2026-08-22", type: "RU", name: "Carrera de prueba única",
            location: "Ojós, Murcia", registrationDeadline: null,
            url: "https://x.test", region: null
        }]);

        expect(findIt().region).toBe("Murcia");

    });

    it("un archivo que sí trae region actualiza la carrera existente con ese valor nuevo", async () => {

        const { hydrate, importPlannedRaces, getPlannedRaces } = await import("./workoutStore.js");
        await hydrate();

        await importPlannedRaces([{
            date: "2026-08-22", type: "RU", name: "Carrera reclasificada",
            location: "X", registrationDeadline: null, url: null, region: null
        }]);

        const findIt = () => getPlannedRaces().find(r => r.name === "Carrera reclasificada");

        expect(findIt().region).toBeNull();

        await importPlannedRaces([{
            date: "2026-08-22", type: "RU", name: "Carrera reclasificada",
            location: "X", registrationDeadline: null, url: null, region: "Andalucía"
        }]);

        expect(findIt().region).toBe("Andalucía");

    });

    it("una carrera nueva (no existía antes) usa el region que traiga, o null si no trae ninguno", async () => {

        const { hydrate, importPlannedRaces, getPlannedRaces } = await import("./workoutStore.js");
        await hydrate();

        await importPlannedRaces([{
            date: "2026-09-01", type: "RU", name: "Carrera totalmente nueva",
            location: "Y", registrationDeadline: null, url: null, region: null
        }]);

        expect(getPlannedRaces().find(r => r.name === "Carrera totalmente nueva").region).toBeNull();

    });

});
