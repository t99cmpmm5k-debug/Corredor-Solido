import { describe, it, expect } from "vitest";
import { hasWeeklySchedule, getTodayGymDay, getUpcomingGymDays, getWeekProgress, getWeekSessions, getFinishedGymSessionForDay } from "./gymSchedule.js";

// jueves 27 de agosto de 2026, para poder razonar "viernes" como
// "mañana" en los tests de abajo sin ambigüedad.
const TODAY = "2026-08-27";

function day(id, weekday, title = id) {
    return { id, weekday, title, exercises: [] };
}

describe("scheduledDays (a través de las funciones públicas) -- deduplica por id", () => {

    it("un mismo día repetido dos veces en el array (mismo id) cuenta y se pinta una sola vez en 'próximos'", () => {

        const viernes = day("d-viernes", "viernes", "Torso Completo");
        const days = [viernes, { ...viernes }]; // misma id, dos objetos distintos en memoria

        const upcoming = getUpcomingGymDays(days, TODAY);

        expect(upcoming).toHaveLength(1);
        expect(upcoming[0].day.id).toBe("d-viernes");

    });

    it("el mismo día repetido no infla el total de getWeekProgress", () => {

        const viernes = day("d-viernes", "viernes");
        const days = [viernes, { ...viernes }, { ...viernes }];

        const progress = getWeekProgress(days, [], TODAY);
        expect(progress.total).toBe(1);

    });

    it("dos días DISTINTOS (ids distintos) programados el mismo día de la semana no se consideran duplicados -- caso real y legítimo", () => {

        const days = [
            day("rutina-a-viernes", "viernes", "Torso"),
            day("rutina-b-viernes", "viernes", "Torso") // mismo título, id distinto: es un caso real, no un bug
        ];

        const upcoming = getUpcomingGymDays(days, TODAY);
        expect(upcoming).toHaveLength(2);

    });

    it("duplicar el viernes no afecta al resto de días de la semana", () => {

        const viernes = day("d-viernes", "viernes", "Torso Completo");
        const lunes = day("d-lunes", "lunes", "Pierna Funcional");
        const days = [viernes, { ...viernes }, lunes];

        const upcoming = getUpcomingGymDays(days, TODAY, 10);

        expect(upcoming.map(u => u.day.id).sort()).toEqual(["d-lunes", "d-viernes"]);

    });

});

describe("getTodayGymDay / hasWeeklySchedule", () => {

    it("sin ningún día con weekday, no hay calendario semanal", () => {

        const days = [{ id: "d1", title: "Torso", exercises: [] }]; // sin weekday
        expect(hasWeeklySchedule(days)).toBe(false);
        expect(getTodayGymDay(days, TODAY)).toBeNull();

    });

    it("encuentra el día programado para hoy (jueves)", () => {

        const days = [day("d-jueves", "jueves", "Full Body"), day("d-viernes", "viernes", "Torso")];
        expect(getTodayGymDay(days, TODAY)?.id).toBe("d-jueves");

    });

});

describe("getUpcomingGymDays -- cálculo de fecha", () => {

    it("un día programado mañana (viernes) cae en la fecha correcta, no hoy", () => {

        const days = [day("d-viernes", "viernes")];
        const upcoming = getUpcomingGymDays(days, TODAY);

        expect(upcoming[0].date).toBe("2026-08-28");

    });

    it("respeta el tope `count`", () => {

        const days = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]
            .map((wd, i) => day(`d${i}`, wd));

        expect(getUpcomingGymDays(days, TODAY, 3)).toHaveLength(3);

    });

    it("ordena por fecha ascendente aunque los días no vengan en orden", () => {

        const days = [day("d-sabado", "sabado"), day("d-jueves", "jueves"), day("d-viernes", "viernes")];
        const upcoming = getUpcomingGymDays(days, TODAY, 10);

        const dates = upcoming.map(u => u.date);
        expect(dates).toEqual([...dates].sort());

    });

});

describe("getWeekProgress / getWeekSessions", () => {

    it("solo cuenta sesiones terminadas que pertenecen a un día programado de esta semana", () => {

        const days = [day("d-viernes", "viernes", "Torso")];

        const sessions = [
            {
                id: "s1", dayId: "d-viernes", date: "2026-08-28", finishedAt: "2026-08-28T20:00:00.000Z",
                exercises: [
                    { exerciseId: "e1", sets: [{ done: true }, { done: true }, { done: false }] },
                    { exerciseId: "e2", sets: [{ done: true }] }
                ]
            },
            { id: "s2", dayId: "d-viernes", date: "2026-08-28", finishedAt: null }, // sin terminar, no cuenta
            { id: "s3", dayId: "otro-dia-no-programado", date: "2026-08-27", finishedAt: "2026-08-27T20:00:00.000Z" }
        ];

        const progress = getWeekProgress(days, sessions, TODAY);
        expect(progress).toEqual({ completed: 1, total: 1, exercises: 2, sets: 3 });

        expect(getWeekSessions(days, sessions, TODAY).map(s => s.id)).toEqual(["s1"]);

    });

    it("ejercicios/series en 0 sin ninguna sesión terminada esta semana (nunca inventa un total)", () => {

        const days = [day("d-viernes", "viernes", "Torso")];

        const progress = getWeekProgress(days, [], TODAY);
        expect(progress).toEqual({ completed: 0, total: 1, exercises: 0, sets: 0 });

    });

});

describe("getFinishedGymSessionForDay", () => {

    it("devuelve la sesión terminada para ese dayId en esa fecha exacta", () => {

        const sessions = [{ id: "s1", dayId: "d-jueves", date: TODAY, finishedAt: "2026-08-27T20:00:00.000Z" }];
        expect(getFinishedGymSessionForDay("d-jueves", sessions, TODAY)?.id).toBe("s1");

    });

    it("null si esa sesión no tiene finishedAt (en curso)", () => {

        const sessions = [{ id: "s1", dayId: "d-jueves", date: TODAY, finishedAt: null }];
        expect(getFinishedGymSessionForDay("d-jueves", sessions, TODAY)).toBeNull();

    });

    it("null si la sesión terminada es de otro dayId o de otra fecha", () => {

        const sessions = [
            { id: "s1", dayId: "otro-dia", date: TODAY, finishedAt: "2026-08-27T20:00:00.000Z" },
            { id: "s2", dayId: "d-jueves", date: "2026-08-20", finishedAt: "2026-08-20T20:00:00.000Z" }
        ];
        expect(getFinishedGymSessionForDay("d-jueves", sessions, TODAY)).toBeNull();

    });

});
