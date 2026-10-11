import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { describe, it, expect, beforeEach, vi } from "vitest";

// Emparejado de ejercicios entre sesiones + historial de entrenos
// (2026-10-11). Sesiones sembradas tal cual quedan guardadas (mismo
// formato que startSession()/updateSet()), vía restoreGymSession().

async function loadStores() {

    const routines = await import("./gymRoutineStore.js");
    const sessions = await import("./gymSessionStore.js");

    await routines.hydrate();
    await sessions.hydrate();

    return { routines, sessions };

}

function routine(id, dayId, exercises, name = id) {

    return { id, name, days: [{ id: dayId, title: name, weekday: null, exercises }], progressionNote: "" };

}

function exercise(id, name, sets = 3) {

    return { id, name, muscleGroup: null, sets, targetReps: "10", targetWeight: null, weightUnit: "kg" };

}

function session(id, date, dayId, exercises, extra = {}) {

    return { id, date, dayId, startedAt: `${date}T10:00:00.000Z`, finishedAt: `${date}T11:00:00.000Z`, exercises, ...extra };

}

const done = (weight, reps) => ({ weight, reps, done: true });
const pending = (weight, reps) => ({ weight, reps, done: false });

describe("emparejado de ejercicios entre sesiones", () => {

    beforeEach(() => {
        globalThis.indexedDB = new IDBFactory();
        vi.resetModules();
    });

    it("normaliza el nombre: mayúsculas, tildes y espacios de sobra no cuentan", async () => {

        const { sessions } = await loadStores();

        expect(sessions.normalizeExerciseName("  Jalón   al PECHO ")).toBe("jalon al pecho");
        expect(sessions.normalizeExerciseName(null)).toBe("");

    });

    it("el mismo ejercicio en OTRA rutina (otro id) sí cuenta como 'Anterior'", async () => {

        const { routines, sessions } = await loadStores();

        await routines.restoreRoutine(routine("r1", "d1", [exercise("e-r1", "Sentadilla")]));
        await routines.restoreRoutine(routine("r2", "d2", [exercise("e-r2", "Sentadilla")]));

        await sessions.restoreGymSession(session("s1", "2026-10-01", "d1", [
            { exerciseId: "e-r1", name: "Sentadilla", sets: [done(30, 10), done(32.5, 10), done(35, 8)], notes: "" }
        ]));

        // Por id solo, antes: nada. Ahora, por nombre.
        const previous = sessions.getLastExerciseSession("e-r2");

        expect(previous).toEqual({
            sessionId: "s1",
            date: "2026-10-01",
            sets: [{ weight: 30, reps: 10 }, { weight: 32.5, reps: 10 }, { weight: 35, reps: 8 }]
        });

    });

    it("una rutina borrada y vuelta a crear (ids nuevos) conserva su historial por nombre", async () => {

        const { routines, sessions } = await loadStores();

        // Sesión vieja de un ejercicio cuya rutina ya no existe.
        await sessions.restoreGymSession(session("s-vieja", "2026-09-20", "dia-borrado", [
            { exerciseId: "id-viejo", name: "Hip Thrust", sets: [done(40, 10)], notes: "" }
        ]));

        await routines.restoreRoutine(routine("r-nueva", "d-nuevo", [exercise("id-nuevo", "hip thrust")]));

        expect(sessions.getLastExerciseSession("id-nuevo")?.sessionId).toBe("s-vieja");
        expect(sessions.getPreviousExerciseSummary("id-nuevo")).toEqual({ date: "2026-09-20", setsCount: 1, reps: 10, weight: 40 });

    });

    it("un nombre parecido NO empareja ('Hip Thrust' ≠ 'Hip Thrust ligero')", async () => {

        const { routines, sessions } = await loadStores();

        await routines.restoreRoutine(routine("r3", "d3", [exercise("e-ligero", "Hip Thrust ligero")]));

        await sessions.restoreGymSession(session("s1", "2026-10-01", "d1", [
            { exerciseId: "e-fuerte", name: "Hip Thrust", sets: [done(60, 10)], notes: "" }
        ]));

        expect(sessions.getLastExerciseSession("e-ligero")).toBeNull();

    });

    it("'Anterior' es UNA sesión (la última con series hechas): serie a serie, sin mezclar sesiones", async () => {

        const { routines, sessions } = await loadStores();

        await routines.restoreRoutine(routine("r1", "d1", [exercise("e1", "Press hombro")]));

        await sessions.restoreGymSession(session("s-vieja", "2026-09-01", "d1", [
            { exerciseId: "e1", name: "Press hombro", sets: [done(6, 10), done(6, 10), done(8, 8)], notes: "" }
        ]));

        // Última sesión: solo las 2 primeras series hechas.
        await sessions.restoreGymSession(session("s-ultima", "2026-09-08", "d1", [
            { exerciseId: "e1", name: "Press hombro", sets: [done(8, 10), done(8, 9), pending(8, 10)], notes: "" }
        ]));

        // Una sesión todavía más reciente sin ninguna serie hecha (abrir el
        // día ya crea la sesión) no cuenta como "Anterior".
        await sessions.restoreGymSession(session("s-vacia", "2026-09-10", "d1", [
            { exerciseId: "e1", name: "Press hombro", sets: [pending(8, 10), pending(8, 10), pending(8, 10)], notes: "" }
        ]));

        const previous = sessions.getLastExerciseSession("e1", { excludeSessionId: "s-hoy" });

        expect(previous.date).toBe("2026-09-08");
        expect(previous.sets).toEqual([{ weight: 8, reps: 10 }, { weight: 8, reps: 9 }, null]);

    });

    it("la sesión que se está viendo nunca es su propio 'Anterior', aunque ya esté guardada", async () => {

        const { routines, sessions } = await loadStores();

        await routines.restoreRoutine(routine("r1", "d1", [exercise("e1", "Jalón al pecho")]));

        await sessions.restoreGymSession(session("s-ayer", "2026-10-09", "d1", [
            { exerciseId: "e1", name: "Jalón al pecho", sets: [done(25, 10)], notes: "" }
        ]));
        await sessions.restoreGymSession(session("s-hoy", "2026-10-10", "d1", [
            { exerciseId: "e1", name: "Jalón al pecho", sets: [done(27.5, 10)], notes: "" }
        ]));

        expect(sessions.getLastExerciseSession("e1", { excludeSessionId: "s-hoy" }).sessionId).toBe("s-ayer");

    });

    it("al empezar una sesión nueva, el peso de cada serie parte del de la otra rutina con el mismo ejercicio", async () => {

        const { routines, sessions } = await loadStores();

        await routines.restoreRoutine(routine("r1", "d1", [exercise("e-r1", "Peso muerto rumano", 2)]));
        await routines.restoreRoutine(routine("r2", "d2", [exercise("e-r2", "Peso muerto rumano", 2)]));

        await sessions.restoreGymSession(session("s1", "2026-10-01", "d1", [
            { exerciseId: "e-r1", name: "Peso muerto rumano", sets: [done(30, 10), done(35, 10)], notes: "" }
        ]));

        const started = sessions.startSession("d2");

        expect(started.exercises[0].sets.map(s => s.weight)).toEqual([30, 35]);

    });

});

describe("hoja de historial de un ejercicio (getExerciseLog)", () => {

    beforeEach(() => {
        globalThis.indexedDB = new IDBFactory();
        vi.resetModules();
    });

    it("sin historial: ninguna sesión y sin mejor peso", async () => {

        const { sessions } = await loadStores();

        expect(sessions.getExerciseLog("nada")).toEqual({ entries: [], best: null });

    });

    it("últimas 5 sesiones (más reciente primero) y mejor peso de TODO el historial", async () => {

        const { routines, sessions } = await loadStores();

        await routines.restoreRoutine(routine("r1", "d1", [exercise("e1", "Hip Thrust")]));

        // 7 sesiones; el mejor peso (70) está en la más antigua, fuera de
        // las 5 últimas.
        const weights = [70, 40, 45, 50, 50, 55, 60];

        for (const [index, weight] of weights.entries()) {

            await sessions.restoreGymSession(session(`s${index}`, `2026-09-0${index + 1}`, "d1", [
                { exerciseId: "e1", name: "Hip Thrust", sets: [done(weight, 10), pending(weight, 10)], notes: "" }
            ]));

        }

        const { entries, best } = sessions.getExerciseLog("e1");

        expect(entries.map(e => e.date)).toEqual(["2026-09-07", "2026-09-06", "2026-09-05", "2026-09-04", "2026-09-03"]);
        expect(entries[0].sets).toEqual([{ weight: 60, reps: 10 }]);
        expect(best).toEqual({ weight: 70, reps: 10, date: "2026-09-01" });

    });

    it("excluye la sesión en curso", async () => {

        const { sessions } = await loadStores();

        await sessions.restoreGymSession(session("s-hoy", "2026-10-10", "d1", [
            { exerciseId: "e1", name: "Remo", sets: [done(12, 10)], notes: "" }
        ]));

        expect(sessions.getExerciseLog("e1", { excludeSessionId: "s-hoy" }).entries).toEqual([]);

    });

});

describe("historial de entrenos (getCompletedGymSessions)", () => {

    beforeEach(() => {
        globalThis.indexedDB = new IDBFactory();
        vi.resetModules();
    });

    it("sin entrenos guardados: lista vacía", async () => {

        const { sessions } = await loadStores();

        expect(sessions.getCompletedGymSessions()).toEqual([]);

    });

    it("más reciente primero, con nº de ejercicios y series hechas; sesiones sin ninguna serie hecha fuera", async () => {

        const { sessions } = await loadStores();

        await sessions.restoreGymSession(session("s-1", "2026-10-01", "d1", [
            { exerciseId: "a", name: "Sentadilla", sets: [done(30, 10), done(30, 10), pending(30, 10)], notes: "" },
            { exerciseId: "b", name: "Core: plancha", sets: [done(null, 30)], notes: "" },
            { exerciseId: "c", name: "Zancadas", sets: [pending(null, 12)], notes: "" }
        ]));

        await sessions.restoreGymSession(session("s-abierta", "2026-10-05", "d1", [
            { exerciseId: "a", name: "Sentadilla", sets: [pending(30, 10)], notes: "" }
        ]));

        await sessions.restoreGymSession(session("s-2", "2026-10-03", "d2", [
            { exerciseId: "x", name: "Jalón al pecho", sets: [done(25, 10)], notes: "" }
        ]));

        const list = sessions.getCompletedGymSessions();

        expect(list.map(s => s.id)).toEqual(["s-2", "s-1"]);
        expect(list[1]).toMatchObject({ date: "2026-10-01", dayId: "d1", exerciseCount: 2, setCount: 3 });
        expect(list[1].exercises).toEqual([
            { exerciseId: "a", name: "Sentadilla", sets: [{ weight: 30, reps: 10 }, { weight: 30, reps: 10 }] },
            { exerciseId: "b", name: "Core: plancha", sets: [{ weight: null, reps: 30 }] }
        ]);

    });

    it("dos entrenos el mismo día: desempata la hora de inicio", async () => {

        const { sessions } = await loadStores();

        await sessions.restoreGymSession(session("manana", "2026-10-01", "d1", [
            { exerciseId: "a", name: "A", sets: [done(10, 10)], notes: "" }
        ], { startedAt: "2026-10-01T08:00:00.000Z" }));

        await sessions.restoreGymSession(session("tarde", "2026-10-01", "d2", [
            { exerciseId: "b", name: "B", sets: [done(10, 10)], notes: "" }
        ], { startedAt: "2026-10-01T19:00:00.000Z" }));

        expect(sessions.getCompletedGymSessions().map(s => s.id)).toEqual(["tarde", "manana"]);

    });

    it("sesiones con formato antiguo (rir, sin startedAt/notes, sin series) se listan sin romper", async () => {

        const { sessions } = await loadStores();

        await sessions.restoreGymSession({
            id: "antigua",
            date: "2026-08-19",
            dayId: "day1",
            exercises: [
                { exerciseId: "day1-ex1", name: "Press banca", sets: [{ weight: 60, reps: 6, rir: 2, done: true }] },
                { exerciseId: "day1-ex2", name: "Fondos" }
            ]
        });

        await sessions.restoreGymSession({ id: "rota", date: "2026-08-18", dayId: "day1" });

        const list = sessions.getCompletedGymSessions();

        expect(list).toHaveLength(1);
        expect(list[0].exercises).toEqual([
            { exerciseId: "day1-ex1", name: "Press banca", sets: [{ weight: 60, reps: 6 }] }
        ]);
        expect(sessions.getLastExerciseSession("day1-ex1").sets).toEqual([{ weight: 60, reps: 6 }]);

    });

    it("eliminar un entreno lo quita del historial", async () => {

        const { sessions } = await loadStores();

        await sessions.restoreGymSession(session("s-1", "2026-10-01", "d1", [
            { exerciseId: "a", name: "A", sets: [done(10, 10)], notes: "" }
        ]));

        sessions.deleteSession("s-1");

        expect(sessions.getCompletedGymSessions()).toEqual([]);
        expect(sessions.getLastExerciseSession("a")).toBeNull();

    });

});
