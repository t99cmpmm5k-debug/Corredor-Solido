import { describe, it, expect, vi, afterEach } from "vitest";

// getRoutines() se sustituye por un stub -- estos tests cubren cómo
// fillWeekDays()/PlanTimeline() superponen un día de gimnasio (ver
// gymTimelineBridge.js), no el CRUD real de gymRoutineStore.js.
let gymRoutines = [];
vi.mock("../../../data/gymRoutineStore.js", () => ({
    getRoutines: () => gymRoutines
}));

const { fillWeekDays, PlanTimeline, TIMELINE_TYPE_COLOR } = await import("./PlanTimeline.js");

const MONDAY = "2026-08-17"; // lunes

describe("fillWeekDays", () => {

    it("una semana sin ninguna sesión real devuelve 7 huecos de Descanso, lunes a domingo", () => {

        const days = fillWeekDays(MONDAY, []);

        expect(days).toHaveLength(7);
        expect(days.map(d => d.date)).toEqual([
            "2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20",
            "2026-08-21", "2026-08-22", "2026-08-23"
        ]);

        days.forEach(d => {
            expect(d.type).toBe("free");
            expect(d.title).toBe("Descanso");
            expect(d.isRest).toBe(true);
        });

    });

    it("conserva las sesiones reales en su día y solo rellena los que faltan", () => {

        const sessions = [
            { id: "s1", date: "2026-08-18", slot: 0, type: "z2", title: "Rodaje" },
            { id: "s2", date: "2026-08-21", slot: 0, type: "intervals", title: "Series" }
        ];

        const days = fillWeekDays(MONDAY, sessions);

        expect(days[0].isRest).toBe(true); // lunes 17, sin sesión
        expect(days[1]).toMatchObject({ id: "s1", type: "z2" });
        expect(days[1].isRest).toBeUndefined();
        expect(days[4]).toMatchObject({ id: "s2", type: "intervals" });
        expect(days[2].isRest).toBe(true);
        expect(days[3].isRest).toBe(true);
        expect(days[5].isRest).toBe(true);
        expect(days[6].isRest).toBe(true);

    });

    it("con dos sesiones el mismo día se queda con la de menor slot, sin añadir una octava columna", () => {

        const sessions = [
            { id: "gym", date: "2026-08-19", slot: 1, type: "strength", title: "Gimnasio" },
            { id: "run", date: "2026-08-19", slot: 0, type: "z2", title: "Rodaje" }
        ];

        const days = fillWeekDays(MONDAY, sessions);

        expect(days).toHaveLength(7);
        expect(days[2].id).toBe("run");

    });

    it("los huecos de Descanso llevan un id sintético único que nunca coincide con un id real ni con null", () => {

        const days = fillWeekDays(MONDAY, []);
        const ids = days.map(d => d.id);

        expect(new Set(ids).size).toBe(7);
        ids.forEach(id => {
            expect(id).not.toBeNull();
            expect(typeof id).toBe("string");
        });

    });

});

describe("PlanTimeline", () => {

    it("renderiza siempre 7 columnas .timeline-day, con o sin sesiones", () => {

        const withNone = PlanTimeline(null, [], MONDAY);
        const matches = withNone.match(/data-session-id="/g) || [];

        expect(matches).toHaveLength(7);

    });

    it("los días de Descanso llevan la clase is-rest, los días con sesión real no", () => {

        const sessions = [{ id: "s1", date: "2026-08-18", slot: 0, type: "z2", title: "Rodaje", status: "pending" }];
        const html = PlanTimeline(null, sessions, MONDAY);

        const restMatches = html.match(/is-rest/g) || [];
        expect(restMatches).toHaveLength(6); // 6 de los 7 días son Descanso

    });

    it("ningún día de Descanso queda marcado como seleccionado cuando no hay sesión seleccionada", () => {

        const html = PlanTimeline(null, [], MONDAY);

        expect(html).not.toContain("is-selected");

    });

    it("el degradado de la línea usa el color muted de Descanso en los huecos vacíos", () => {

        const html = PlanTimeline(null, [], MONDAY);

        expect(html).toContain(TIMELINE_TYPE_COLOR.free);

    });

});

describe("fillWeekDays + gimnasio (Gimnasio↔Plan, ver gymTimelineBridge.js)", () => {

    afterEach(() => {
        gymRoutines = [];
    });

    it("un día sin running pero con una rutina de gimnasio para ese día de la semana deja de ser Descanso", () => {

        gymRoutines = [{ id: "r1", name: "Fuerza", days: [{ id: "d1", title: "Viernes - Pierna", exercises: [] }] }];

        const days = fillWeekDays(MONDAY, []);
        const friday = days[4]; // 2026-08-21, viernes

        expect(friday.isRest).toBe(false);
        expect(friday.type).toBe("strength");
        expect(friday.title).toBe("Viernes - Pierna");
        expect(friday.subtitle).toBe("Fuerza");
        expect(friday.gymOnly).toBe(true);
        expect(friday.gymDayId).toBe("d1");

        // El resto de la semana, sin rutina para ese día, se queda como
        // Descanso normal.
        expect(days[0].isRest).toBe(true);
        expect(days[0].gymOnly).toBeUndefined();

    });

    it("un día con running Y gimnasio conserva la sesión real y solo añade hasGym, sin ocultarla", () => {

        gymRoutines = [{ id: "r1", name: "Fuerza", days: [{ id: "d1", title: "Jueves - Torso", exercises: [] }] }];

        const sessions = [{ id: "s1", date: "2026-08-20", slot: 0, type: "z2", title: "Rodaje" }]; // jueves

        const days = fillWeekDays(MONDAY, sessions);
        const thursday = days[3];

        expect(thursday.id).toBe("s1");
        expect(thursday.type).toBe("z2"); // running manda, no se pisa el tipo
        expect(thursday.hasGym).toBe(true);
        expect(thursday.gymDayId).toBe("d1");
        expect(thursday.isRest).toBeUndefined();

    });

    it("un título de rutina que no menciona ningún día de la semana no afecta a ninguna columna", () => {

        gymRoutines = [{ id: "r1", name: "Fuerza", days: [{ id: "d1", title: "Torso Completo", exercises: [] }] }];

        const days = fillWeekDays(MONDAY, []);

        days.forEach(d => {
            expect(d.isRest).toBe(true);
            expect(d.gymOnly).toBeUndefined();
        });

    });

});
