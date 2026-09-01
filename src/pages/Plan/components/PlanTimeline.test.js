import { describe, it, expect, vi, afterEach } from "vitest";

// getRoutines() se sustituye por un stub -- estos tests cubren cómo
// fillWeekDays()/PlanTimeline() superponen un día de gimnasio (ver
// gymTimelineBridge.js), no el CRUD real de gymRoutineStore.js.
let gymRoutines = [];
let gymSessions = [];
vi.mock("../../../data/gymRoutineStore.js", () => ({
    getRoutines: () => gymRoutines
}));
vi.mock("../../../data/gymSessionStore.js", () => ({
    getGymSessions: () => gymSessions
}));

const { fillWeekDays, PlanTimeline, buildGymOnlyDay } = await import("./PlanTimeline.js");
const { resolveDayColor } = await import("../planDayColor.js");

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

// Sistema de color con significado fijo (fase 2 del pulido de Plan,
// 2026-08-27): azul=pendiente, verde=realizado, gris=descanso por
// defecto -- series/tirada larga/gimnasio mantienen su color fijo pase lo
// que pase con el estado (decisión explícita del usuario). Gimnasio se
// sumó después (bug real: reutilizaba el mismo azul que "pendiente",
// #2faeff casi idéntico a --color-primary #2EA8FF, indistinguible salvo
// por el icono a tamaño pequeño).
describe("resolveDayColor -- color por ESTADO, con series/tirada larga/gimnasio como únicas excepciones fijas", () => {

    it("descanso (isRest) siempre gris, sin importar el tipo", () => {
        expect(resolveDayColor({ isRest: true, type: "z2", status: "pending" })).toBe("var(--color-text-muted)");
    });

    it("pendiente (no completado) es azul, para cualquier tipo salvo series/tirada larga/gimnasio", () => {
        expect(resolveDayColor({ type: "z2", status: "pending" })).toBe("var(--color-primary)");
    });

    it("realizado es verde, para cualquier tipo salvo series/tirada larga/gimnasio", () => {
        expect(resolveDayColor({ type: "z2", status: "completed" })).toBe("var(--color-success)");
        expect(resolveDayColor({ type: "recovery", status: "completed" })).toBe("var(--color-success)");
    });

    it("series (intervals) es siempre naranja, tanto pendiente como realizada", () => {
        expect(resolveDayColor({ type: "intervals", status: "pending" })).toBe("#ff7a33");
        expect(resolveDayColor({ type: "intervals", status: "completed" })).toBe("#ff7a33");
    });

    it("tirada larga (longRun) es siempre amarilla, tanto pendiente como realizada", () => {
        expect(resolveDayColor({ type: "longRun", status: "pending" })).toBe("var(--color-warning)");
        expect(resolveDayColor({ type: "longRun", status: "completed" })).toBe("var(--color-warning)");
    });

    it("gimnasio (strength) es siempre violeta, tanto pendiente como realizado -- nunca el azul de 'pendiente'", () => {
        expect(resolveDayColor({ type: "strength", status: "upcoming" })).toBe("var(--color-gym)");
        expect(resolveDayColor({ type: "strength", status: "completed" })).toBe("var(--color-gym)");
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

    it("el degradado de la línea usa el color gris de Descanso en los huecos vacíos", () => {

        const html = PlanTimeline(null, [], MONDAY);

        expect(html).toContain(resolveDayColor({ isRest: true }));

    });

});

describe("fillWeekDays + gimnasio (Gimnasio↔Plan, ver gymTimelineBridge.js) -- por day.weekday, la misma fuente que 'Próximos entrenamientos' en Gimnasio", () => {

    afterEach(() => {
        gymRoutines = [];
        gymSessions = [];
    });

    it("un día sin running pero con una rutina de gimnasio programada (day.weekday) para ese día de la semana deja de ser Descanso -- título sin ningún indicio de día, igual que las 3 rutinas por defecto reales", () => {

        gymRoutines = [{ id: "r1", name: "Pierna Funcional", days: [{ id: "d1", weekday: "viernes", title: "Pierna Funcional", exercises: [] }] }];

        const days = fillWeekDays(MONDAY, []);
        const friday = days[4]; // 2026-08-21, viernes

        expect(friday.isRest).toBe(false);
        expect(friday.type).toBe("strength");
        expect(friday.title).toBe("Pierna Funcional");
        expect(friday.subtitle).toBe("Pierna Funcional");
        expect(friday.gymOnly).toBe(true);
        expect(friday.gymDayId).toBe("d1");

        // El resto de la semana, sin rutina programada para ese día, se
        // queda como Descanso normal.
        expect(days[0].isRest).toBe(true);
        expect(days[0].gymOnly).toBeUndefined();

    });

    it("un día solo de gimnasio trae la lista real de ejercicios (para la tarjeta de detalle inline, ver PlanGymDayCard.js)", () => {

        const exercises = [{ id: "e1", name: "Sentadilla" }, { id: "e2", name: "Peso muerto" }];
        gymRoutines = [{ id: "r1", name: "Pierna Funcional", days: [{ id: "d1", weekday: "viernes", title: "Pierna Funcional", exercises }] }];

        const days = fillWeekDays(MONDAY, []);

        expect(days[4].exercises).toEqual(exercises);

    });

    it("un día con running Y gimnasio conserva la sesión real y solo añade hasGym, sin ocultarla", () => {

        gymRoutines = [{ id: "r1", name: "Torso Completo", days: [{ id: "d1", weekday: "jueves", title: "Torso Completo", exercises: [] }] }];

        const sessions = [{ id: "s1", date: "2026-08-20", slot: 0, type: "z2", title: "Rodaje" }]; // jueves

        const days = fillWeekDays(MONDAY, sessions);
        const thursday = days[3];

        expect(thursday.id).toBe("s1");
        expect(thursday.type).toBe("z2"); // running manda, no se pisa el tipo
        expect(thursday.hasGym).toBe(true);
        expect(thursday.gymDayId).toBe("d1");
        expect(thursday.isRest).toBeUndefined();

    });

    it("un día de gimnasio sin day.weekday no afecta a ninguna columna, aunque su título mencione un día de la semana", () => {

        gymRoutines = [{ id: "r1", name: "Fuerza", days: [{ id: "d1", title: "Lunes - Torso", exercises: [] }] }]; // sin weekday

        const days = fillWeekDays(MONDAY, []);

        days.forEach(d => {
            expect(d.isRest).toBe(true);
            expect(d.gymOnly).toBeUndefined();
        });

    });

});

describe("buildGymOnlyDay -- mismo objeto sintético que fillWeekDays(), reexpuesto para initPlanEvents.js (ver selectGymOnlyDay())", () => {

    afterEach(() => {
        gymRoutines = [];
        gymSessions = [];
    });

    it("con una rutina real programada esa fecha, devuelve el objeto gymOnly completo", () => {

        gymRoutines = [{ id: "r1", name: "Fuerza Base", days: [{ id: "d1", weekday: "martes", title: "Pierna Funcional", exercises: [{ id: "e1", name: "Sentadilla" }] }] }];

        const result = buildGymOnlyDay("2026-08-18"); // martes

        expect(result).not.toBeNull();
        expect(result.gymOnly).toBe(true);
        expect(result.title).toBe("Pierna Funcional");
        expect(result.gymDayId).toBe("d1");
        expect(result.exercises).toEqual([{ id: "e1", name: "Sentadilla" }]);

    });

    it("sin ninguna rutina programada esa fecha, devuelve null", () => {

        const result = buildGymOnlyDay("2026-08-18");

        expect(result).toBeNull();

    });

});

describe("fillWeekDays + gimnasio -- estado 'finalizada' (sesión ya registrada ese día)", () => {

    afterEach(() => {
        gymRoutines = [];
        gymSessions = [];
    });

    it("un día solo-gimnasio con una sesión terminada ese día pasa a status 'completed' (mismo day-check que running)", () => {

        gymRoutines = [{ id: "r1", name: "Pierna Funcional", days: [{ id: "d1", weekday: "viernes", title: "Pierna Funcional", exercises: [] }] }];
        gymSessions = [{ id: "s1", dayId: "d1", date: "2026-08-21", finishedAt: "2026-08-21T20:00:00.000Z" }]; // viernes

        const friday = fillWeekDays(MONDAY, [])[4];

        expect(friday.status).toBe("completed");
        expect(friday.gymCompleted).toBe(true);
        expect(friday.gymSessionId).toBe("s1");

    });

    it("un día solo-gimnasio SIN sesión terminada se queda en 'rest' aunque esté programado", () => {

        gymRoutines = [{ id: "r1", name: "Pierna Funcional", days: [{ id: "d1", weekday: "viernes", title: "Pierna Funcional", exercises: [] }] }];
        gymSessions = [];

        const friday = fillWeekDays(MONDAY, [])[4];

        expect(friday.status).toBe("rest");
        expect(friday.gymCompleted).toBe(false);
        expect(friday.gymSessionId).toBeNull();

    });

    it("un día con running Y gimnasio, con SOLO gimnasio terminado: cada uno refleja su estado real de forma independiente", () => {

        gymRoutines = [{ id: "r1", name: "Torso Completo", days: [{ id: "d1", weekday: "jueves", title: "Torso Completo", exercises: [] }] }];
        gymSessions = [{ id: "s1", dayId: "d1", date: "2026-08-20", finishedAt: "2026-08-20T20:00:00.000Z" }]; // jueves

        // La sesión de running NO trae status "completed" (sin workout real
        // enlazado) -- withDerivedFields()/getSessionStatus() son cosa de
        // workoutStore.js, aquí se simula ya resuelta como "pending".
        const sessions = [{ id: "run1", date: "2026-08-20", slot: 0, type: "z2", title: "Rodaje", status: "pending" }];

        const thursday = fillWeekDays(MONDAY, sessions)[3];

        expect(thursday.id).toBe("run1");
        expect(thursday.status).toBe("pending"); // running: no hecho
        expect(thursday.gymCompleted).toBe(true); // gimnasio: sí hecho
        expect(thursday.gymSessionId).toBe("s1");

    });

    it("un día con running Y gimnasio, con SOLO running terminado: gymCompleted en false, sin contaminar el status de running", () => {

        gymRoutines = [{ id: "r1", name: "Torso Completo", days: [{ id: "d1", weekday: "jueves", title: "Torso Completo", exercises: [] }] }];
        gymSessions = []; // gimnasio no hecho

        const sessions = [{ id: "run1", date: "2026-08-20", slot: 0, type: "z2", title: "Rodaje", status: "completed" }];

        const thursday = fillWeekDays(MONDAY, sessions)[3];

        expect(thursday.status).toBe("completed"); // running: hecho (viene ya resuelto de fuera)
        expect(thursday.gymCompleted).toBe(false); // gimnasio: no hecho
        expect(thursday.gymSessionId).toBeNull();

    });

    it("PlanTimeline(): el badge de gimnasio lleva la clase is-completed solo cuando gymCompleted es true", () => {

        gymRoutines = [{ id: "r1", name: "Torso Completo", days: [{ id: "d1", weekday: "jueves", title: "Torso Completo", exercises: [] }] }];
        gymSessions = [{ id: "s1", dayId: "d1", date: "2026-08-20", finishedAt: "2026-08-20T20:00:00.000Z" }];

        const sessions = [{ id: "run1", date: "2026-08-20", slot: 0, type: "z2", title: "Rodaje", status: "pending" }];

        const html = PlanTimeline(null, sessions, MONDAY);

        expect(html).toContain('day-gym-badge is-completed');

    });

});
