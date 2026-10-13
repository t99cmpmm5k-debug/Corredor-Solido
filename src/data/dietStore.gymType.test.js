import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { parseDietCsv } from "../utils/dietCsv.js";

function csv(adjustments) {

    const rows = ["dia,momento,opcion,alimento,notas"];

    for (const [day, adjustment] of Object.entries(adjustments)) {
        rows.push(`${day},Desayuno,1,Avena ${day},`);
        rows.push(`${day},Cena,1,Pescado ${day},`);
        rows.push(`${day},AJUSTE,1,,"${adjustment}"`);
    }

    return rows.join("\n");

}

// Como la de 2550: torso el lunes, pierna el miércoles, full body el viernes.
const DIET_2550 = parseDietCsv(csv({
    LUNES: "Gym · torso. Objetivo del día: 2500 kcal",
    MARTES: "Running · 8 km Z2. Objetivo del día: 2450 kcal",
    MIERCOLES: "Gym · pierna. Objetivo del día: 2550 kcal",
    JUEVES: "Running · series. Objetivo del día: 2550 kcal",
    VIERNES: "Gym · full body. Objetivo del día: 2450 kcal",
    TIRADA_LARGA: "Tirada larga",
    DESCANSO: "Descanso"
})).plan;

// Como la de 1700 etiquetada: pierna el lunes, tren superior el miércoles,
// pierna suave el viernes.
const DIET_1700 = parseDietCsv(csv({
    LUNES: "Gym · pierna · objetivo 1800 kcal",
    MARTES: "Running · rodaje de descarga · objetivo 1600 kcal",
    MIERCOLES: "Gym · tren superior · objetivo 1700 kcal",
    JUEVES: "Running · series en pista · objetivo 1800 kcal",
    VIERNES: "Gym · pierna suave · objetivo 1700 kcal",
    TIRADA_LARGA: "Rodaje largo + cena libre",
    DESCANSO: "Descanso · objetivo 1600 kcal"
})).plan;

const MON = "2026-10-12";
const TUE = "2026-10-13";
const THU = "2026-10-15";

function resetFakeIndexedDB() {
    globalThis.indexedDB = new IDBFactory();
}

async function fresh(parsed) {

    const diet = await import("./dietStore.js");
    const workouts = await import("./workoutStore.js");
    const gym = await import("./gymRoutineStore.js");
    await diet.hydrate();

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-01T10:00:00"));
    const plan = diet.importDietPlan(parsed);
    vi.useRealTimers();

    const routine = (name, title, weekday) => gym.createRoutine({ name, days: [{ id: `d-${weekday}`, title, weekday, exercises: [] }] });
    const session = (date, type, title = null) => workouts.restorePlannedSession({
        id: `${date}-${type}`, date, slot: 0, weekStartDate: MON, type, title
    });

    return { diet, workouts, plan, routine, session };

}

describe("dietStore -- menú de gimnasio por tipo de sesión", () => {

    beforeEach(() => {
        resetFakeIndexedDB();
        vi.resetModules();
    });

    it("coincidencia por tipo: pierna -> el día 'Gym · pierna', no el primer día de gym", async () => {

        const { diet, plan, routine } = await fresh(DIET_2550);
        routine("Fuerza", "Pierna", "martes");

        expect(diet.resolveDietDay(TUE, plan).dayKey).toBe("MIERCOLES");

    });

    it("el tipo puede venir del nombre de la rutina o del título de la sesión de fuerza del plan", async () => {

        const { diet, plan, routine, session } = await fresh(DIET_2550);
        routine("Full Body A", "Día 1", "martes");
        await session(THU, "strength", "Fuerza: torso y core");

        expect(diet.resolveDietDay(TUE, plan).dayKey).toBe("VIERNES");
        expect(diet.resolveDietDay(THU, plan).dayKey).toBe("LUNES");

    });

    it("tren superior = torso y tren inferior = pierna (en el AJUSTE y en el nombre)", async () => {

        const { diet, plan, routine } = await fresh(DIET_1700);
        routine("Rutina", "Torso", "martes");
        routine("Rutina 2", "Tren inferior", "jueves");

        // "Torso" encaja con "Gym · tren superior" (miércoles).
        expect(diet.resolveDietDay(TUE, plan).dayKey).toBe("MIERCOLES");
        // "Tren inferior" encaja con "Gym · pierna" (lunes).
        expect(diet.resolveDietDay(THU, plan).dayKey).toBe("LUNES");

        const { diet: diet2550, plan: plan2550, routine: routine2550 } = await (async () => {
            resetFakeIndexedDB();
            vi.resetModules();
            return fresh(DIET_2550);
        })();
        routine2550("Rutina", "Tren superior", "martes");
        expect(diet2550.resolveDietDay(TUE, plan2550).dayKey).toBe("LUNES");

    });

    it("sin mayúsculas ni tildes, y el tipo más concreto gana ('Pierna suave' -> pierna suave)", async () => {

        const { diet, plan, routine } = await fresh(DIET_1700);
        routine("PIERNA SÚAVE", "Día B", "martes");
        routine("Pierna", "Día A", "jueves");

        expect(diet.resolveDietDay(TUE, plan).dayKey).toBe("VIERNES");
        expect(diet.resolveDietDay(THU, plan).dayKey).toBe("LUNES");

    });

    it("nombre sin tipo reconocible: el primer día de gym, sin aviso", async () => {

        const { diet, plan, routine } = await fresh(DIET_2550);
        routine("Rutina de Ana", "Día 1", "martes");

        const r = diet.getDietDayResolution(TUE, plan);
        expect(r.dayKey).toBe("LUNES");
        expect(r.notices).toEqual([]);

    });

    it("palabras enteras: 'torsion' no es torso", async () => {

        const { diet, plan, routine } = await fresh(DIET_2550);
        routine("Torsiones y pierna", "Core", "martes");

        expect(diet.resolveDietDay(TUE, plan).dayKey).toBe("MIERCOLES");

    });

    it("running y gym el mismo día: sigue mandando el running", async () => {

        const { diet, plan, routine, session } = await fresh(DIET_2550);
        routine("Fuerza", "Pierna", "martes");
        await session(TUE, "z2", "Rodaje aeróbico - 45 minutos");

        expect(diet.resolveDietDay(TUE, plan).dayKey).toBe("MARTES");

    });

    it("cumplimiento con el día por tipo; las marcas conservan sus claves al mover la sesión", async () => {

        const { diet, workouts, plan, session } = await fresh(DIET_2550);
        await session(TUE, "strength", "Pierna");
        diet.toggleMealEaten(TUE, plan.id, "MIERCOLES|Desayuno", "MIERCOLES|Desayuno|1");

        expect(diet.getDayCompliance(TUE)).toEqual({ done: 1, total: 2, percent: 50 });

        workouts.movePlannedSession(`${TUE}-strength`, THU);
        expect(diet.resolveDietDay(THU, plan).dayKey).toBe("MIERCOLES");
        expect(diet.getEatenForDate(TUE)).toEqual({ "MIERCOLES|Desayuno": "MIERCOLES|Desayuno|1" });

    });

});
