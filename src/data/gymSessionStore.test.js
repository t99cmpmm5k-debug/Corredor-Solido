import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { describe, it, expect, beforeEach, vi } from "vitest";

function resetFakeIndexedDB() {
    globalThis.indexedDB = new IDBFactory();
}

describe("gymSessionStore — RIR retirado de la interfaz, sin tocar datos históricos", () => {

    beforeEach(async () => {

        resetFakeIndexedDB();

        // hydrate() memoiza su promesa a nivel de módulo -- sin esto, el
        // segundo test reutilizaría la hidratación (y el array en memoria)
        // del primero en vez de leer la IndexedDB fresca de este test.
        vi.resetModules();

    });

    it("una sesión nueva ya no guarda rir en sus series", async () => {

        const { hydrate: hydrateRoutines, createRoutine } = await import("./gymRoutineStore.js");
        await hydrateRoutines();

        const routine = await createRoutine({
            name: "Torso",
            days: [{
                id: "d1",
                title: "Día 1",
                exercises: [{ id: "e1", name: "Press", sets: 2, targetReps: "8", targetWeight: 40, weightUnit: "kg" }]
            }],
            progressionNote: ""
        });

        const { hydrate: hydrateSessions, startSession } = await import("./gymSessionStore.js");
        await hydrateSessions();

        const session = startSession(routine.days[0].id);

        expect(session.exercises[0].sets[0]).not.toHaveProperty("rir");
        expect(Object.keys(session.exercises[0].sets[0]).sort()).toEqual(["done", "reps", "weight"]);

    });

    it("una sesión antigua con rir ya guardado en IndexedDB no lo expone en getExerciseSessionHistory (dato histórico intacto, solo deja de mostrarse)", async () => {

        // Registro tal cual lo dejaría una versión anterior de la app,
        // escrito directamente en IndexedDB (sin pasar por buildInitialSets,
        // que ya no produce rir) -- simula el histórico real de un usuario.
        const request = indexedDB.open("corredor-solido", 9);

        await new Promise((resolve, reject) => {

            request.onupgradeneeded = () => {

                const db = request.result;
                db.createObjectStore("meta", { keyPath: "key" });
                db.createObjectStore("gymRoutines", { keyPath: "id" });
                const gymSessions = db.createObjectStore("gymSessions", { keyPath: "id" });
                gymSessions.createIndex("date", "date", { unique: false });
                gymSessions.createIndex("dayId", "dayId", { unique: false });

            };

            request.onsuccess = () => {

                const db = request.result;
                const tx = db.transaction("gymSessions", "readwrite");

                tx.objectStore("gymSessions").put({
                    id: "s-antigua",
                    date: "2026-01-10",
                    dayId: "d1",
                    finishedAt: "2026-01-10T12:00:00.000Z",
                    exercises: [{
                        exerciseId: "e1",
                        name: "Press",
                        sets: [{ weight: 40, reps: 8, rir: 2, done: true }],
                        notes: ""
                    }]
                });

                tx.oncomplete = () => { db.close(); resolve(); };
                tx.onerror = () => reject(tx.error);

            };

            request.onerror = () => reject(request.error);

        });

        const { hydrate, getExerciseSessionHistory, getGymSessions } = await import("./gymSessionStore.js");
        await hydrate();

        // El dato sigue existiendo tal cual en el store en memoria (nunca
        // se borra el histórico) ...
        expect(getGymSessions()[0].exercises[0].sets[0].rir).toBe(2);

        // ... pero la función que alimenta la UI de historial ya no lo
        // expone en absoluto.
        const history = getExerciseSessionHistory("e1");
        expect(history[0].sets[0]).not.toHaveProperty("rir");
        expect(history[0].sets[0]).toEqual({ weight: 40, reps: 8 });

    });

});

describe("gymSessionStore — duración real de la sesión (primer paso del entrenador de carga)", () => {

    beforeEach(async () => {

        resetFakeIndexedDB();
        vi.resetModules();

    });

    async function startTestSession() {

        const { hydrate: hydrateRoutines, createRoutine } = await import("./gymRoutineStore.js");
        await hydrateRoutines();

        const routine = await createRoutine({
            name: "Torso",
            days: [{
                id: "d1",
                title: "Día 1",
                exercises: [{ id: "e1", name: "Press", sets: 2, targetReps: "8", targetWeight: 40, weightUnit: "kg" }]
            }],
            progressionNote: ""
        });

        const gymSessionStore = await import("./gymSessionStore.js");
        await gymSessionStore.hydrate();

        const session = gymSessionStore.startSession(routine.days[0].id);

        return { gymSessionStore, session };

    }

    it("al empezar una sesión se registra la hora de inicio", async () => {

        const before = Date.now();
        const { session } = await startTestSession();
        const after = Date.now();

        expect(session.startedAt).toBeTruthy();

        const startedAtMs = new Date(session.startedAt).getTime();
        expect(startedAtMs).toBeGreaterThanOrEqual(before);
        expect(startedAtMs).toBeLessThanOrEqual(after);

        expect(session.finishedAt).toBeNull();
        expect(session.durationSec).toBeNull();

    });

    it("al retomar la sesión de hoy (checkpoint) no se resetea la hora de inicio original", async () => {

        const { gymSessionStore, session } = await startTestSession();
        const originalStartedAt = session.startedAt;

        // Simula que ha pasado tiempo real antes de volver a entrar al
        // mismo día -- startSession() debe devolver la MISMA sesión, sin
        // tocar su startedAt original.
        session.startedAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();

        const resumed = gymSessionStore.startSession("d1");

        expect(resumed.id).toBe(session.id);
        expect(resumed.startedAt).toBe(session.startedAt);
        expect(resumed.startedAt).not.toBe(originalStartedAt);

    });

    it("al guardar/finalizar, calcula la duración real en segundos a partir de inicio y fin", async () => {

        const { gymSessionStore, session } = await startTestSession();

        // 12 minutos y medio antes, sin fake timers: se manipula
        // startedAt directamente sobre el objeto ya en memoria (misma
        // referencia que vive en el store).
        session.startedAt = new Date(Date.now() - 12.5 * 60 * 1000).toISOString();

        const finished = gymSessionStore.finishSession(session.id);

        expect(finished.finishedAt).toBeTruthy();
        expect(finished.durationSec).toBeGreaterThanOrEqual(748); // ~12.5 min, con margen
        expect(finished.durationSec).toBeLessThanOrEqual(752);
        expect(finished.durationUnreliable).toBe(false);

    });

    it("una duración por encima de 4 horas se descarta como no fiable, sin guardar un número inventado", async () => {

        const { gymSessionStore, session } = await startTestSession();

        session.startedAt = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(); // 5h antes

        const finished = gymSessionStore.finishSession(session.id);

        expect(finished.durationSec).toBeNull();
        expect(finished.durationUnreliable).toBe(true);
        // El fin de la sesión sigue registrándose -- solo la duración se
        // descarta por no ser de fiar.
        expect(finished.finishedAt).toBeTruthy();

    });

    it("justo por debajo del tope de 4 horas sí se guarda como duración válida", async () => {

        const { gymSessionStore, session } = await startTestSession();

        session.startedAt = new Date(Date.now() - (4 * 60 * 60 * 1000 - 5000)).toISOString();

        const finished = gymSessionStore.finishSession(session.id);

        expect(finished.durationUnreliable).toBe(false);
        expect(finished.durationSec).toBeGreaterThan(0);
        expect(finished.durationSec).toBeLessThanOrEqual(4 * 60 * 60);

    });

    it("una sesión guardada antes de este cambio (sin startedAt) no recibe una duración inventada retroactivamente", async () => {

        const request = indexedDB.open("corredor-solido", 9);

        await new Promise((resolve, reject) => {

            request.onupgradeneeded = () => {

                const db = request.result;
                db.createObjectStore("meta", { keyPath: "key" });
                db.createObjectStore("gymRoutines", { keyPath: "id" });
                const gymSessions = db.createObjectStore("gymSessions", { keyPath: "id" });
                gymSessions.createIndex("date", "date", { unique: false });
                gymSessions.createIndex("dayId", "dayId", { unique: false });

            };

            request.onsuccess = () => {

                const db = request.result;
                const tx = db.transaction("gymSessions", "readwrite");

                // Registro tal cual lo dejaba la versión anterior de la app:
                // sin startedAt ni durationSec en absoluto.
                tx.objectStore("gymSessions").put({
                    id: "s-antigua",
                    date: "2026-01-10",
                    dayId: "d1",
                    finishedAt: "2026-01-10T12:00:00.000Z",
                    exercises: []
                });

                tx.oncomplete = () => { db.close(); resolve(); };
                tx.onerror = () => reject(tx.error);

            };

            request.onerror = () => reject(request.error);

        });

        const { hydrate, getGymSessions } = await import("./gymSessionStore.js");
        await hydrate();

        const legacy = getGymSessions()[0];
        expect(legacy.startedAt).toBeUndefined();
        expect(legacy.durationSec).toBeUndefined();

    });

});

describe("getAverageDurationForDay -- duración real para un día aún no empezado hoy (GymTodayCard.js)", () => {

    beforeEach(() => {
        resetFakeIndexedDB();
        vi.resetModules();
    });

    // Push directo al array en memoria (misma referencia que devuelve
    // getGymSessions()) -- suficiente para esta función, que solo lee del
    // array ya cargado, sin depender de IndexedDB ni de startSession()
    // (que solo puede crear sesiones "de hoy", no del histórico pasado
    // que hace falta aquí para promediar).
    function fakeFinishedSession(dayId, date, durationSec, overrides = {}) {
        return { id: `s-${date}`, dayId, date, startedAt: `${date}T10:00:00.000Z`, finishedAt: `${date}T10:${String(Math.round(durationSec / 60)).padStart(2, "0")}:00.000Z`, durationSec, durationUnreliable: false, exercises: [], ...overrides };
    }

    it("sin ninguna sesión terminada de ese día, no hay media que calcular", async () => {

        const { hydrate, getAverageDurationForDay } = await import("./gymSessionStore.js");
        await hydrate();

        expect(getAverageDurationForDay("d1")).toBeNull();

    });

    it("con historial real, calcula la media de las últimas sesiones terminadas de ese dayId", async () => {

        const { hydrate, getGymSessions, getAverageDurationForDay } = await import("./gymSessionStore.js");
        await hydrate();

        getGymSessions().push(
            fakeFinishedSession("d1", "2026-08-05", 2400), // 40 min
            fakeFinishedSession("d1", "2026-08-12", 3000), // 50 min
            fakeFinishedSession("d2", "2026-08-12", 600)   // otro día -- no debe contar
        );

        expect(getAverageDurationForDay("d1")).toBe(2700); // media de 2400 y 3000

    });

    it("una sesión en curso (sin finishedAt) no cuenta para la media", async () => {

        const { hydrate, getGymSessions, getAverageDurationForDay } = await import("./gymSessionStore.js");
        await hydrate();

        getGymSessions().push(
            fakeFinishedSession("d1", "2026-08-05", 2400),
            { id: "s-en-curso", dayId: "d1", date: "2026-08-20", startedAt: "2026-08-20T10:00:00.000Z", finishedAt: null, durationSec: null, exercises: [] }
        );

        expect(getAverageDurationForDay("d1")).toBe(2400);

    });

    it("una sesión con duración marcada como no fiable no cuenta para la media", async () => {

        const { hydrate, getGymSessions, getAverageDurationForDay } = await import("./gymSessionStore.js");
        await hydrate();

        getGymSessions().push(
            fakeFinishedSession("d1", "2026-08-05", 2400),
            fakeFinishedSession("d1", "2026-08-12", 99999, { durationUnreliable: true })
        );

        expect(getAverageDurationForDay("d1")).toBe(2400);

    });

    it("solo promedia las últimas `limit` sesiones, no todo el histórico", async () => {

        const { hydrate, getGymSessions, getAverageDurationForDay } = await import("./gymSessionStore.js");
        await hydrate();

        getGymSessions().push(
            fakeFinishedSession("d1", "2026-01-01", 6000), // muy vieja, fuera del límite
            fakeFinishedSession("d1", "2026-08-01", 1200),
            fakeFinishedSession("d1", "2026-08-08", 1200)
        );

        expect(getAverageDurationForDay("d1", { limit: 2 })).toBe(1200); // ignora la de enero

    });

});
