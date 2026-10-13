import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { parseDietCsv } from "../utils/dietCsv.js";

// Dieta tipo "por día de la semana" con el AJUSTE de cada día: el martes
// es "Sin entreno" (como la de 1700 kcal), hay dos días de rodaje (miércoles
// y viernes, para comprobar que gana el primero) y mayúsculas/tildes
// distintas a propósito.
function csv(adjustments) {

    const rows = ["dia,momento,opcion,alimento,notas"];

    for (const [day, adjustment] of Object.entries(adjustments)) {
        rows.push(`${day},Desayuno,1,Avena ${day},`);
        rows.push(`${day},Cena,1,Pescado ${day},`);
        if (adjustment) rows.push(`${day},AJUSTE,1,,"${adjustment}"`);
    }

    return rows.join("\n");

}

const DIET = parseDietCsv(csv({
    LUNES: "Gym · torso. Objetivo 1800 kcal",
    MARTES: "Sin entreno · objetivo 1700 kcal",
    MIERCOLES: "RUNNING · rodaje Z2",
    JUEVES: "Rúnning · Séries en pista",
    VIERNES: "Running · 8 km suaves",
    TIRADA_LARGA: "Tirada larga",
    DESCANSO: "Descanso"
})).plan;

// Sin ningún día de running ni de gym por su AJUSTE.
const DIET_NO_MATCH = parseDietCsv(csv({
    LUNES: "Pierna", MARTES: "Sin entreno", MIERCOLES: "Tren superior", JUEVES: "Pista",
    VIERNES: "Suave", TIRADA_LARGA: "Largo", DESCANSO: "Descanso"
})).plan;

// Semana del 12 al 18 de octubre de 2026.
const MON = "2026-10-12";
const TUE = "2026-10-13";
const WED = "2026-10-14";
const THU = "2026-10-15";
const FRI = "2026-10-16";
const SUN = "2026-10-18";

function resetFakeIndexedDB() {
    globalThis.indexedDB = new IDBFactory();
}

async function fresh(parsed = DIET) {

    const diet = await import("./dietStore.js");
    const workouts = await import("./workoutStore.js");
    const gym = await import("./gymRoutineStore.js");
    await diet.hydrate();

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-01T10:00:00"));
    const plan = diet.importDietPlan(parsed);
    vi.useRealTimers();

    const session = (date, type, title = null) => workouts.restorePlannedSession({
        id: `${date}-${type}`, date, slot: 0, weekStartDate: MON, type, title
    });

    return { diet, workouts, gym, plan, session };

}

describe("dietStore -- día de dieta según la sesión del plan de la fecha", () => {

    beforeEach(() => {
        resetFakeIndexedDB();
        vi.resetModules();
    });

    it("rodaje un martes: el primer día con AJUSTE de running sin series (no el martes 'Sin entreno')", async () => {

        const { diet, plan, session } = await fresh();
        await session(TUE, "z2", "Rodaje aeróbico - 45 minutos");

        const r = diet.getDietDayResolution(TUE, plan);
        expect(r.dayKey).toBe("MIERCOLES");
        expect(r.calendarDayKey).toBe("MARTES");
        expect(r.notices).toEqual([]);

    });

    it("recuperación y rodajes antiguos (easy) también son rodaje", async () => {

        const { diet, plan, session } = await fresh();
        await session(TUE, "recovery");
        await session(WED, "easy");

        expect(diet.resolveDietDay(TUE, plan).dayKey).toBe("MIERCOLES");
        expect(diet.resolveDietDay(WED, plan).dayKey).toBe("MIERCOLES");

    });

    it("series: el día cuyo AJUSTE contiene 'Running · series' (sin mayúsculas ni tildes)", async () => {

        const { diet, plan, session } = await fresh();
        await session(MON, "intervals", "3 x 2000 m");

        expect(diet.resolveDietDay(MON, plan).dayKey).toBe("JUEVES");

    });

    it("gimnasio (rutina con día o sesión de fuerza): el día cuyo AJUSTE empieza por 'Gym'", async () => {

        const { diet, gym, plan, session } = await fresh();
        gym.createRoutine({ name: "Fuerza", days: [{ id: "d1", title: "Torso", weekday: "jueves", exercises: [] }] });
        await session(FRI, "strength");

        expect(diet.resolveDietDay(THU, plan).dayKey).toBe("LUNES");
        expect(diet.resolveDietDay(FRI, plan).dayKey).toBe("LUNES");

    });

    it("running y gimnasio el mismo día: manda running", async () => {

        const { diet, gym, plan, session } = await fresh();
        gym.createRoutine({ name: "Fuerza", days: [{ id: "d1", title: "Torso", weekday: "lunes", exercises: [] }] });
        await session(MON, "z2");

        expect(diet.resolveDietDay(MON, plan).dayKey).toBe("MIERCOLES");

    });

    it("tirada larga el domingo: TIRADA_LARGA, sin pedir el reparto del fin de semana", async () => {

        const { diet, plan, session } = await fresh();
        await session(SUN, "longRun", "Tirada larga 14 km");

        expect(diet.resolveDietDay(SUN, plan)).toEqual({ dayKey: "TIRADA_LARGA", needsWeekendChoice: false });
        // El sábado, sin sesión: DESCANSO.
        expect(diet.resolveDietDay("2026-10-17", plan).dayKey).toBe("DESCANSO");

    });

    it("sin sesión de running ni gimnasio: DESCANSO; con franja de entreno elegida a mano, el de calendario", async () => {

        const { diet, plan, session } = await fresh();
        await session(MON, "z2");

        expect(diet.resolveDietDay(WED, plan).dayKey).toBe("DESCANSO");

        diet.setTrainingTime(WED, plan.id, "tarde");
        expect(diet.resolveDietDay(WED, plan).dayKey).toBe("MIERCOLES");

        // "descanso" a mano sigue siendo DESCANSO.
        diet.setTrainingTime(THU, plan.id, "descanso");
        expect(diet.resolveDietDay(THU, plan).dayKey).toBe("DESCANSO");

    });

    it("sin día de ese tipo en la dieta: el de calendario, con aviso (y 'sin entreno' si lo es)", async () => {

        const { diet, plan, session } = await fresh(DIET_NO_MATCH);
        await session(TUE, "z2");
        await session(WED, "intervals");

        const tue = diet.getDietDayResolution(TUE, plan);
        expect(tue.dayKey).toBe("MARTES");
        expect(tue.notices).toEqual([diet.DIET_NOTICE_NO_MENU, diet.DIET_NOTICE_NO_TRAINING]);

        const wed = diet.getDietDayResolution(WED, plan);
        expect(wed.dayKey).toBe("MIERCOLES");
        expect(wed.notices).toEqual([diet.DIET_NOTICE_NO_MENU]);

    });

    it("el reparto del fin de semana elegido a mano gana a la sesión del plan", async () => {

        const { diet, plan, session } = await fresh();
        await session(SUN, "longRun");
        diet.setWeekendLongRunDay(SUN, "sabado");

        expect(diet.resolveDietDay(SUN, plan).dayKey).toBe("DESCANSO");

    });

    it("cumplimiento con el día resuelto; mover la sesión cambia el menú y conserva lo marcado", async () => {

        const { diet, workouts, plan, session } = await fresh();
        await session(TUE, "z2");
        diet.toggleMealEaten(TUE, plan.id, "MIERCOLES|Desayuno", "MIERCOLES|Desayuno|1");

        expect(diet.getDayCompliance(TUE)).toEqual({ done: 1, total: 2, percent: 50 });

        workouts.movePlannedSession(`${TUE}-z2`, THU);

        // Martes sin sesión: DESCANSO, la marca del rodaje no cuenta pero sigue guardada.
        expect(diet.resolveDietDay(TUE, plan).dayKey).toBe("DESCANSO");
        expect(diet.getDayCompliance(TUE)).toEqual({ done: 0, total: 2, percent: 0 });
        expect(diet.getEatenForDate(TUE)).toEqual({ "MIERCOLES|Desayuno": "MIERCOLES|Desayuno|1" });
        expect(diet.resolveDietDay(THU, plan).dayKey).toBe("MIERCOLES");

        // Vuelve al martes: vuelve a contar.
        workouts.movePlannedSession(`${TUE}-z2`, TUE);
        expect(diet.getDayCompliance(TUE)).toEqual({ done: 1, total: 2, percent: 50 });

    });

    it("sin plan: el día de calendario, sin avisos", async () => {

        const { diet, plan } = await fresh();

        const r = diet.getDietDayResolution(TUE, plan);
        expect(r).toMatchObject({ dayKey: "MARTES", kind: null, notices: [] });
        expect(diet.resolveDietDay(SUN, plan)).toEqual({ dayKey: null, needsWeekendChoice: true });

    });

    it("sin dieta: el día de calendario", async () => {

        const { diet, session } = await fresh();
        await session(TUE, "z2");

        expect(diet.resolveDietDay(TUE, null).dayKey).toBe("MARTES");

    });

});
