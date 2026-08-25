import { describe, it, expect, vi, afterEach } from "vitest";

// getRoutines() se sustituye por un stub -- gymTimelineBridge.js es un
// puente de solo lectura, no le corresponde probar el CRUD real de
// gymRoutineStore.js (ya cubierto en su propio test) ni el cálculo de
// fecha/dedupe de gymSchedule.js (ya cubierto en gymSchedule.test.js) --
// solo que reutiliza esa misma fuente de verdad (day.weekday) en vez de
// inventar una propia por texto.
let routines = [];
let gymSessions = [];
vi.mock("../../data/gymRoutineStore.js", () => ({
    getRoutines: () => routines
}));
vi.mock("../../data/gymSessionStore.js", () => ({
    getGymSessions: () => gymSessions
}));

const { getGymDayForDate } = await import("./gymTimelineBridge.js");

const MONDAY = "2026-08-24"; // lunes -- misma semana que PlanTimeline.test.js (MONDAY = 2026-08-17 + 7)

function routine(name, days) {
    return { id: `r-${name}`, name, days };
}

function day(id, weekday, title = id) {
    return { id, weekday, title, exercises: [] };
}

describe("getGymDayForDate", () => {

    it("sin rutinas guardadas, ningún día tiene gimnasio", () => {

        routines = [];
        expect(getGymDayForDate(MONDAY)).toBeNull();

    });

    it("encuentra el día por day.weekday, sin importar el título (rutinas por defecto sin renombrar)", () => {

        routines = [routine("Fuerza", [day("d1", "lunes", "Torso Completo")])];

        expect(getGymDayForDate(MONDAY)?.day.id).toBe("d1");
        expect(getGymDayForDate(MONDAY)?.routine.name).toBe("Fuerza");
        expect(getGymDayForDate("2026-08-25")).toBeNull(); // martes, sin día programado

    });

    it("un día sin weekday (constructor manual, aún sin calendario) no coincide con nada", () => {

        routines = [routine("Fuerza", [day("d1", null, "Lunes - Torso")])]; // título con "Lunes" pero sin weekday real

        expect(getGymDayForDate(MONDAY)).toBeNull();

    });

    it("con dos rutinas para el mismo weekday, gana la primera por orden de getRoutines() -- mismo criterio que getTodayGymDay", () => {

        routines = [
            routine("A", [day("d-a", "lunes")]),
            routine("B", [day("d-b", "lunes")])
        ];

        expect(getGymDayForDate(MONDAY)?.day.id).toBe("d-a");

    });

    it("el mismo día repetido (mismo id, dos objetos) en la misma rutina no se cuenta dos veces -- mismo dedupe que 'Próximos entrenamientos'", () => {

        const viernes = day("d-viernes", "viernes");
        routines = [routine("Fuerza", [viernes, { ...viernes }])];

        expect(getGymDayForDate("2026-08-28")?.day.id).toBe("d-viernes"); // viernes

    });

});

describe("getGymDayForDate -- finishedSession", () => {

    afterEach(() => {
        gymSessions = [];
    });

    it("sin ninguna sesión terminada ese dayId/fecha, finishedSession es null", () => {

        routines = [routine("Fuerza", [day("d1", "lunes")])];
        gymSessions = [];

        expect(getGymDayForDate(MONDAY)?.finishedSession).toBeNull();

    });

    it("con una sesión terminada para ese dayId en esa fecha exacta, la devuelve", () => {

        routines = [routine("Fuerza", [day("d1", "lunes")])];
        gymSessions = [{ id: "s1", dayId: "d1", date: MONDAY, finishedAt: "2026-08-24T10:00:00.000Z" }];

        expect(getGymDayForDate(MONDAY)?.finishedSession?.id).toBe("s1");

    });

    it("una sesión sin finishedAt (en curso, no terminada) no cuenta", () => {

        routines = [routine("Fuerza", [day("d1", "lunes")])];
        gymSessions = [{ id: "s1", dayId: "d1", date: MONDAY, finishedAt: null }];

        expect(getGymDayForDate(MONDAY)?.finishedSession).toBeNull();

    });

    it("una sesión terminada de OTRO día (fecha distinta) no cuenta para hoy", () => {

        routines = [routine("Fuerza", [day("d1", "lunes")])];
        gymSessions = [{ id: "s1", dayId: "d1", date: "2026-08-17", finishedAt: "2026-08-17T10:00:00.000Z" }]; // lunes pasado

        expect(getGymDayForDate(MONDAY)?.finishedSession).toBeNull();

    });

});
