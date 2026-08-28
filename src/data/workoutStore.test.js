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

describe("setPlannedRaceGoal — \"Objetivo principal\" (detalle de Carreras)", () => {

    beforeEach(() => {

        resetFakeIndexedDB();
        vi.resetModules();

    });

    it("marca isGoal:true en la carrera indicada", async () => {

        const { hydrate, importPlannedRaces, setPlannedRaceGoal, getPlannedRaces } = await import("./workoutStore.js");
        await hydrate();

        await importPlannedRaces([{ date: "2026-09-01", type: "RU", name: "Carrera A" }]);
        const race = getPlannedRaces().find(r => r.name === "Carrera A");

        setPlannedRaceGoal(race.id, true);

        expect(getPlannedRaces().find(r => r.id === race.id).isGoal).toBe(true);

    });

    it("marcar una nueva desmarca automáticamente cualquier otra que lo tuviera — solo una a la vez", async () => {

        const { hydrate, importPlannedRaces, setPlannedRaceGoal, getPlannedRaces } = await import("./workoutStore.js");
        await hydrate();

        await importPlannedRaces([
            { date: "2026-09-01", type: "RU", name: "Carrera A" },
            { date: "2026-09-08", type: "RU", name: "Carrera B" }
        ]);

        const raceA = getPlannedRaces().find(r => r.name === "Carrera A");
        const raceB = getPlannedRaces().find(r => r.name === "Carrera B");

        setPlannedRaceGoal(raceA.id, true);
        expect(getPlannedRaces().find(r => r.id === raceA.id).isGoal).toBe(true);

        setPlannedRaceGoal(raceB.id, true);

        expect(getPlannedRaces().find(r => r.id === raceB.id).isGoal).toBe(true);
        expect(getPlannedRaces().find(r => r.id === raceA.id).isGoal).toBe(false);

    });

    it("desmarcar la actual no promueve ninguna otra — puede quedar sin ninguna marcada", async () => {

        const { hydrate, importPlannedRaces, setPlannedRaceGoal, getPlannedRaces } = await import("./workoutStore.js");
        await hydrate();

        await importPlannedRaces([{ date: "2026-09-01", type: "RU", name: "Carrera A" }]);
        const race = getPlannedRaces().find(r => r.name === "Carrera A");

        setPlannedRaceGoal(race.id, true);
        setPlannedRaceGoal(race.id, false);

        expect(getPlannedRaces().find(r => r.id === race.id).isGoal).toBe(false);
        expect(getPlannedRaces().some(r => r.isGoal)).toBe(false);

    });

});

describe("linkPlannedRaceToPlan / unlinkPlannedRaceFromPlan — conexión real \"En mi plan\" (Carreras↔Plan)", () => {

    beforeEach(() => {

        resetFakeIndexedDB();
        vi.resetModules();

    });

    it("crea una plannedSession real en la fecha de la carrera, tipo race, con su nombre como descripción", async () => {

        const { hydrate, importPlannedRaces, linkPlannedRaceToPlan, getPlannedRaces, getSessionsForDate } = await import("./workoutStore.js");
        await hydrate();

        await importPlannedRaces([{ date: "2026-09-15", type: "RU", name: "Media Maratón Águilas" }]);
        const race = getPlannedRaces().find(r => r.name === "Media Maratón Águilas");

        const session = linkPlannedRaceToPlan(race.id);

        expect(session).toMatchObject({ date: "2026-09-15", type: "race", description: "Media Maratón Águilas" });
        expect(getSessionsForDate("2026-09-15").map(s => s.id)).toContain(session.id);
        expect(getPlannedRaces().find(r => r.id === race.id).linkedPlanSessionId).toBe(session.id);

    });

    it("desmarcar borra la sesión real y limpia linkedPlanSessionId", async () => {

        const { hydrate, importPlannedRaces, linkPlannedRaceToPlan, unlinkPlannedRaceFromPlan, getPlannedRaces, getSessionsForDate } = await import("./workoutStore.js");
        await hydrate();

        await importPlannedRaces([{ date: "2026-09-15", type: "RU", name: "Carrera X" }]);
        const race = getPlannedRaces().find(r => r.name === "Carrera X");

        const session = linkPlannedRaceToPlan(race.id);
        unlinkPlannedRaceFromPlan(race.id);

        expect(getSessionsForDate("2026-09-15").some(s => s.id === session.id)).toBe(false);
        expect(getPlannedRaces().find(r => r.id === race.id).linkedPlanSessionId).toBeNull();

    });

    // El caso de más riesgo de todo el cambio (ver instrucciones): borrar
    // la sesión directamente desde Plan (deletePlannedSession, SIN pasar
    // por unlinkPlannedRaceFromPlan) no debe dejar la carrera con una
    // referencia rota -- mismo tipo de bug que ya tuvimos con
    // Gimnasio↔Plan.
    it("borrar la sesión directamente desde Plan (deletePlannedSession) limpia linkedPlanSessionId en la carrera, sin referencia rota", async () => {

        const { hydrate, importPlannedRaces, linkPlannedRaceToPlan, deletePlannedSession, getPlannedRaces } = await import("./workoutStore.js");
        await hydrate();

        await importPlannedRaces([{ date: "2026-09-15", type: "RU", name: "Carrera Y" }]);
        const race = getPlannedRaces().find(r => r.name === "Carrera Y");

        const session = linkPlannedRaceToPlan(race.id);

        // Borrado directo desde Plan, no vía unlinkPlannedRaceFromPlan.
        deletePlannedSession(session.id);

        expect(getPlannedRaces().find(r => r.id === race.id).linkedPlanSessionId).toBeNull();

    });

    it("borrar una sesión que no está enlazada a ninguna carrera no rompe nada", async () => {

        const { hydrate, addPlannedSession, deletePlannedSession, getSessionsForDate } = await import("./workoutStore.js");
        await hydrate();

        const session = addPlannedSession({ date: "2026-09-20", type: "z2" });

        expect(() => deletePlannedSession(session.id)).not.toThrow();
        expect(getSessionsForDate("2026-09-20")).toHaveLength(0);

    });

    it("reimportar el mismo calendario (dedupe por fecha+nombre) conserva isGoal/isRegistered/linkedPlanSessionId ya guardados", async () => {

        const { hydrate, importPlannedRaces, setPlannedRaceGoal, setPlannedRaceRegistered, linkPlannedRaceToPlan, getPlannedRaces } = await import("./workoutStore.js");
        await hydrate();

        await importPlannedRaces([{ date: "2026-09-15", type: "RU", name: "Carrera Reimportada", region: "Murcia" }]);
        const race = getPlannedRaces().find(r => r.name === "Carrera Reimportada");

        setPlannedRaceGoal(race.id, true);
        setPlannedRaceRegistered(race.id, true);
        const session = linkPlannedRaceToPlan(race.id);

        // Reimportar el "mismo archivo" -- misma fecha+nombre, dedupe por
        // esa clave, el archivo entrante nunca trae estos 3 campos.
        await importPlannedRaces([{ date: "2026-09-15", type: "RU", name: "Carrera Reimportada", region: "Murcia" }]);

        const reimported = getPlannedRaces().find(r => r.id === race.id);
        expect(reimported.isGoal).toBe(true);
        expect(reimported.isRegistered).toBe(true);
        expect(reimported.linkedPlanSessionId).toBe(session.id);

    });

});

describe("addPlannedSession — creación manual de una sesión (ver Plan → tocar un día vacío)", () => {

    beforeEach(() => {

        resetFakeIndexedDB();
        vi.resetModules();

    });

    it("crea una sesión suelta con el tipo y la fecha dados, sin distancia/duración/título", async () => {

        const { hydrate, addPlannedSession, getSessionsForDate } = await import("./workoutStore.js");
        await hydrate();

        const session = addPlannedSession({ date: "2026-08-27", type: "z2", description: "Rodaje suave" });

        expect(session).toMatchObject({
            date: "2026-08-27",
            type: "z2",
            description: "Rodaje suave",
            title: null,
            distanceKm: null,
            durationSec: null
        });

        expect(getSessionsForDate("2026-08-27")).toHaveLength(1);

    });

    it("sin notas, description queda null (no una cadena vacía)", async () => {

        const { hydrate, addPlannedSession } = await import("./workoutStore.js");
        await hydrate();

        const session = addPlannedSession({ date: "2026-08-27", type: "recovery" });

        expect(session.description).toBeNull();

    });

    it("la sesión creada aparece en getWeekSessions() y en getSessionById() -- misma fuente que la línea temporal y el calendario mensual", async () => {

        const { hydrate, addPlannedSession, getWeekSessions, getSessionById } = await import("./workoutStore.js");
        await hydrate();

        const session = addPlannedSession({ date: "2026-08-27", type: "tempo" }); // jueves

        expect(getWeekSessions("2026-08-24").some(s => s.id === session.id)).toBe(true);
        expect(getSessionById(session.id)).toMatchObject({ type: "tempo", date: "2026-08-27" });

    });

    it("dos sesiones creadas el mismo día reciben slots distintos, sin pisarse", async () => {

        const { hydrate, addPlannedSession, getSessionsForDate } = await import("./workoutStore.js");
        await hydrate();

        const first = addPlannedSession({ date: "2026-08-27", type: "z2" });
        const second = addPlannedSession({ date: "2026-08-27", type: "intervals" });

        expect(first.slot).toBe(0);
        expect(second.slot).toBe(1);
        expect(getSessionsForDate("2026-08-27")).toHaveLength(2);

    });

});

describe("updatePlannedSession — editar una sesión real (menú \"···\" de PlanWorkoutCard)", () => {

    beforeEach(() => {

        resetFakeIndexedDB();
        vi.resetModules();

    });

    it("actualiza tipo y descripción, sin tocar el resto de campos reales", async () => {

        const { hydrate, addPlannedSession, updatePlannedSession, getSessionById } = await import("./workoutStore.js");
        await hydrate();

        const session = addPlannedSession({ date: "2026-08-27", type: "z2", description: "Rodaje suave" });

        const updated = updatePlannedSession(session.id, { type: "intervals", description: "Series 6x400" });

        expect(updated).toMatchObject({ type: "intervals", description: "Series 6x400", date: "2026-08-27" });
        expect(getSessionById(session.id)).toMatchObject({ type: "intervals", description: "Series 6x400" });

    });

    it("una descripción vacía se guarda como null, igual que al crear", async () => {

        const { hydrate, addPlannedSession, updatePlannedSession } = await import("./workoutStore.js");
        await hydrate();

        const session = addPlannedSession({ date: "2026-08-27", type: "z2", description: "Algo" });
        const updated = updatePlannedSession(session.id, { type: "z2", description: null });

        expect(updated.description).toBeNull();

    });

    it("un id que no existe no rompe nada, devuelve null", async () => {

        const { hydrate, updatePlannedSession } = await import("./workoutStore.js");
        await hydrate();

        expect(updatePlannedSession("no-existe", { type: "z2", description: null })).toBeNull();

    });

});

describe("duplicatePlannedSession — clonar una sesión real a otro día (menú \"···\" de PlanWorkoutCard)", () => {

    beforeEach(() => {

        resetFakeIndexedDB();
        vi.resetModules();

    });

    it("clona todos los campos reales (no solo tipo/notas) a un id y fecha propios", async () => {

        const { hydrate, addPlannedSession, duplicatePlannedSession, getSessionsForDate } = await import("./workoutStore.js");
        await hydrate();

        const session = addPlannedSession({ date: "2026-08-24", type: "longRun", description: "Tirada larga" });

        const duplicate = duplicatePlannedSession(session.id, "2026-08-29");

        expect(duplicate.id).not.toBe(session.id);
        expect(duplicate.date).toBe("2026-08-29");
        expect(duplicate.type).toBe("longRun");
        expect(duplicate.description).toBe("Tirada larga");

        // La original sigue existiendo en su día de siempre -- duplicar no
        // la mueve ni la borra.
        expect(getSessionsForDate("2026-08-24")).toHaveLength(1);
        expect(getSessionsForDate("2026-08-29")).toHaveLength(1);

    });

    it("dos duplicados al mismo día reciben slots distintos, sin pisarse entre sí ni con una sesión ya real ese día", async () => {

        const { hydrate, addPlannedSession, duplicatePlannedSession, getSessionsForDate } = await import("./workoutStore.js");
        await hydrate();

        const session = addPlannedSession({ date: "2026-08-24", type: "z2" });
        addPlannedSession({ date: "2026-08-29", type: "recovery" }); // ya hay algo ese día

        const duplicate = duplicatePlannedSession(session.id, "2026-08-29");

        expect(duplicate.slot).toBe(1);
        expect(getSessionsForDate("2026-08-29")).toHaveLength(2);

    });

    it("un id que no existe no rompe nada, devuelve null", async () => {

        const { hydrate, duplicatePlannedSession } = await import("./workoutStore.js");
        await hydrate();

        expect(duplicatePlannedSession("no-existe", "2026-08-29")).toBeNull();

    });

});
