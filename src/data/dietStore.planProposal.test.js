import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { parseDietCsv } from "../utils/dietCsv.js";

// Días con franjas (Mañana/Mediodía/Tarde) y comidas "Descanso - " el
// lunes; el resto usa el menú DESCANSO para la pestaña Descanso.
const CSV = [
    "dia,momento,opcion,alimento,notas",
    "LUNES,Mañana - Pre,1,Plátano,",
    "LUNES,Mediodía - Post,1,Arroz,",
    "LUNES,Tarde - Post,1,Batido,",
    "LUNES,Descanso - Comida,1,Ensalada,",
    "MARTES,Mañana - Pre,1,Plátano,",
    "MARTES,Mediodía - Post,1,Arroz,",
    "MARTES,Tarde - Post,1,Batido,",
    "MIERCOLES,Mañana - Pre,1,Plátano,",
    "MIERCOLES,Mediodía - Post,1,Arroz,",
    "MIERCOLES,Tarde - Post,1,Batido,",
    "JUEVES,Mañana - Pre,1,Plátano,",
    "JUEVES,Mediodía - Post,1,Arroz,",
    "JUEVES,Tarde - Post,1,Batido,",
    "VIERNES,Mañana - Pre,1,Plátano,",
    "VIERNES,Mediodía - Post,1,Arroz,",
    "VIERNES,Tarde - Post,1,Batido,",
    "TIRADA_LARGA,Pre,1,Tostadas,",
    "TIRADA_LARGA,Post,1,Pasta,",
    "DESCANSO,Desayuno,1,Huevos,",
    "DESCANSO,Cena,1,Merluza,"
].join("\n");

const PLAN = parseDietCsv(CSV).plan;
const MON = "2026-09-21";
const TUE = "2026-09-22";
const WED = "2026-09-23";
const THU = "2026-09-24";
const FRI = "2026-09-25";
const SAT = "2026-09-26";
const SUN = "2026-09-27";

function resetFakeIndexedDB() {
    globalThis.indexedDB = new IDBFactory();
}

async function fresh() {

    const diet = await import("./dietStore.js");
    const workouts = await import("./workoutStore.js");
    const gym = await import("./gymRoutineStore.js");
    await diet.hydrate();

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-20T10:00:00"));
    const plan = diet.importDietPlan(PLAN);
    vi.useRealTimers();

    const session = (date, type, extra = {}) => workouts.restorePlannedSession({
        id: `${date}-${type}`, date, slot: 0, weekStartDate: MON, type, title: null, ...extra
    });

    return { diet, workouts, gym, plan, session };

}

describe("dietStore -- franja y menú propuestos por el plan", () => {

    beforeEach(() => {
        resetFakeIndexedDB();
        vi.resetModules();
    });

    it("franja por hora: mañana hasta las 11:00, mediodía hasta las 16:30, tarde después", async () => {

        const { trainingTimeFromClock } = await import("./dietPlanContext.js");

        expect(trainingTimeFromClock("07:30")).toBe("manana");
        expect(trainingTimeFromClock("10:59")).toBe("manana");
        expect(trainingTimeFromClock("11:00")).toBe("mediodia");
        expect(trainingTimeFromClock("16:29")).toBe("mediodia");
        expect(trainingTimeFromClock("16:30")).toBe("tarde");
        expect(trainingTimeFromClock(null)).toBe(null);

        const { diet, plan, session } = await fresh();
        await session(TUE, "z2", { startTime: "18:15" });
        await session(WED, "intervals", { startTime: "08:00" });

        expect(diet.resolveTrainingTime(plan, "MARTES", TUE)).toEqual({ trainingTime: "tarde", source: "plan" });
        expect(diet.resolveTrainingTime(plan, "MIERCOLES", WED)).toEqual({ trainingTime: "manana", source: "plan" });

    });

    it("sesión sin hora: la última franja de entreno elegida a mano, o mediodía", async () => {

        const { diet, plan, session } = await fresh();
        await session(WED, "z2");
        await session(THU, "intervals");

        expect(diet.resolveTrainingTime(plan, "MIERCOLES", WED).trainingTime).toBe("mediodia");

        diet.setTrainingTime(MON, plan.id, "tarde");
        expect(diet.resolveTrainingTime(plan, "JUEVES", THU).trainingTime).toBe("tarde");

    });

    it("día sin sesión de running ni de gimnasio: descanso (menú DESCANSO o el propio del día)", async () => {

        const { diet, plan, session } = await fresh();
        await session(WED, "z2");
        await session(THU, "free");

        // Martes sin sesión: menú DESCANSO entero.
        expect(diet.resolveTrainingTime(plan, "MARTES", TUE)).toEqual({ trainingTime: "descanso", source: "plan" });
        expect(diet.getDietMenu(plan, "MARTES", "descanso").dayKey).toBe("DESCANSO");
        // Lunes sin sesión: sus comidas "Descanso - ".
        expect(diet.getDietMenu(plan, "LUNES", diet.resolveTrainingTime(plan, "LUNES", MON).trainingTime).meals.map(m => m.moment))
            .toEqual(["Comida"]);
        // Un "free" (día libre del plan) no es sesión.
        expect(diet.resolveTrainingTime(plan, "JUEVES", THU).trainingTime).toBe("descanso");

    });

    it("descanso propuesto nunca se arrastra al día siguiente con sesión", async () => {

        const { diet, plan, session } = await fresh();
        await session(WED, "z2");

        expect(diet.resolveTrainingTime(plan, "MARTES", TUE).trainingTime).toBe("descanso");
        expect(diet.resolveTrainingTime(plan, "MIERCOLES", WED).trainingTime).toBe("mediodia");

    });

    it("un día de gimnasio programado cuenta como sesión", async () => {

        const { diet, gym, plan, session } = await fresh();
        await session(WED, "z2");
        gym.createRoutine({ name: "Fuerza", days: [{ id: "d1", title: "Torso", weekday: "martes", exercises: [] }] });

        expect(diet.resolveTrainingTime(plan, "MARTES", TUE)).toEqual({ trainingTime: "mediodia", source: "inherited" });

        const { getPlanDayForDate, describePlanDay } = await import("./dietPlanContext.js");
        expect(describePlanDay(getPlanDayForDate(TUE))).toBe("Gimnasio · Torso");

    });

    it("tirada larga en el plan: menú TIRADA_LARGA (también entre semana)", async () => {

        const { diet, plan, session } = await fresh();
        await session(THU, "longRun", { title: "Tirada larga 14 km" });

        expect(diet.resolveDietDay(THU, plan).dayKey).toBe("TIRADA_LARGA");
        expect(diet.resolveDietDay(WED, plan).dayKey).toBe("MIERCOLES");

    });

    it("fin de semana sin elegir: el reparto sale de la tirada larga del plan", async () => {

        const { diet, plan, session } = await fresh();
        await session(SUN, "longRun");
        await session(SAT, "z2");

        expect(diet.resolveDietDay(SUN, plan)).toEqual({ dayKey: "TIRADA_LARGA", needsWeekendChoice: false });
        // El otro día del fin de semana es DESCANSO, como en el reparto a mano.
        expect(diet.resolveDietDay(SAT, plan)).toEqual({ dayKey: "DESCANSO", needsWeekendChoice: false });

    });

    it("el reparto de fin de semana elegido a mano gana al plan", async () => {

        const { diet, plan, session } = await fresh();
        await session(SUN, "longRun");
        diet.setWeekendLongRunDay(SAT, "sabado");

        expect(diet.resolveDietDay(SAT, plan).dayKey).toBe("TIRADA_LARGA");
        expect(diet.resolveDietDay(SUN, plan).dayKey).toBe("DESCANSO");

    });

    it("la franja elegida a mano gana siempre y lo marcado no se pierde", async () => {

        const { diet, plan, session } = await fresh();
        await session(WED, "z2");

        // Martes sin sesión: propone descanso; se elige tarde a mano.
        diet.toggleMealEaten(TUE, plan.id, "MARTES|Tarde - Post", "MARTES|Tarde - Post|1");
        diet.setTrainingTime(TUE, plan.id, "tarde");

        expect(diet.resolveTrainingTime(plan, "MARTES", TUE)).toEqual({ trainingTime: "tarde", source: "manual" });
        expect(diet.getDayCompliance(TUE)).toEqual({ done: 1, total: 1, percent: 100 });

        // Cambia el plan (ahora hay sesión el martes): la elección manual sigue.
        await session(TUE, "intervals", { startTime: "07:00" });
        expect(diet.resolveTrainingTime(plan, "MARTES", TUE).trainingTime).toBe("tarde");
        expect(diet.getEatenForDate(TUE)).toEqual({ "MARTES|Tarde - Post": "MARTES|Tarde - Post|1" });

    });

    it("cumplimiento con la misma franja resuelta: mover la sesión cambia el día que cuenta", async () => {

        const { diet, workouts, plan, session } = await fresh();
        await session(WED, "z2", { startTime: "08:00" });
        diet.toggleMealEaten(WED, plan.id, "MIERCOLES|Mañana - Pre", "MIERCOLES|Mañana - Pre|1");

        expect(diet.getDayCompliance(WED)).toEqual({ done: 1, total: 1, percent: 100 });

        // Se mueve la sesión al jueves: el miércoles pasa a descanso (menú
        // DESCANSO, 2 comidas sin marcar); la marca sigue guardada.
        workouts.movePlannedSession(`${WED}-z2`, THU);
        expect(diet.getDayCompliance(WED)).toEqual({ done: 0, total: 2, percent: 0 });
        expect(diet.getEatenForDate(WED)).toEqual({ "MIERCOLES|Mañana - Pre": "MIERCOLES|Mañana - Pre|1" });

    });

    it("sin plan (ni sesiones ni gimnasio): comportamiento de siempre", async () => {

        const { diet, plan } = await fresh();

        expect(diet.resolveTrainingTime(plan, "MARTES", TUE)).toEqual({ trainingTime: "mediodia", source: "inherited" });
        expect(diet.resolveDietDay(SAT, plan)).toEqual({ dayKey: null, needsWeekendChoice: true });
        expect(diet.resolveDietDay(FRI, plan).dayKey).toBe("VIERNES");

        const { getPlanDayForDate } = await import("./dietPlanContext.js");
        expect(getPlanDayForDate(TUE)).toBe(null);

    });

    it("plan de otra semana: esta semana no se toca", async () => {

        const { diet, workouts, plan } = await fresh();
        workouts.addPlannedSession({ date: "2026-10-07", type: "z2" });

        expect(diet.resolveTrainingTime(plan, "MARTES", TUE).source).toBe("inherited");

    });

});
