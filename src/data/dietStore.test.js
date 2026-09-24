import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { parseDietCsv } from "../utils/dietCsv.js";

function resetFakeIndexedDB() {
    globalThis.indexedDB = new IDBFactory();
}

// Extracto de la plantilla real (dieta_2500_plantilla.csv), con una comida
// mínima para cada día obligatorio.
const CSV = [
    "dia,momento,opcion,alimento,notas",
    "LUNES,HIDRATACION,1,3.0 L aprox.,",
    "LUNES,09:00,1,2 huevos + 150 ml claras + avena 35 g + plátano 120 g + nueces 15 g,",
    "LUNES,21:00,1,Merluza 180 g + verdura 250 g + aceite de oliva 10 g,",
    "LUNES,21:00,2,Pollo 160 g + verdura 250 g + aceite 10 g,",
    "LUNES,AJUSTE,1,,Mantener igual que en la dieta original.",
    "MARTES,Post-run,1,Proteína 30 g + crema de arroz 40 g,",
    "MIERCOLES,Post-gym,1,Proteína 30 g + crema de arroz 50 g,",
    "JUEVES,Post-series,1,Proteína 30 g + crema de arroz 50 g,",
    "VIERNES,Post-gym,1,Proteína 30 g + crema de arroz 40 g,",
    "TIRADA_LARGA,Pre,1,Plátano 120 g + café,",
    "TIRADA_LARGA,Post,1,Proteína 30 g + crema de arroz 40-50 g,",
    "DESCANSO,09:00,1,2 huevos + 150 ml claras + pan 40 g + nueces 10 g,",
    "REGLAS_GENERALES,REGLA,1,,Mantén esta estructura 2-3 semanas antes de recortar calorías."
].join("\n");

const PARSED = parseDietCsv(CSV).plan;

// Semana del lunes 2026-09-21: sábado 26, domingo 27.
const MONDAY = "2026-09-21";
const SATURDAY = "2026-09-26";
const SUNDAY = "2026-09-27";

describe("dietStore", () => {

    beforeEach(() => {
        resetFakeIndexedDB();
        vi.resetModules();
    });

    it("guarda la dieta tal como la dio el parser y persiste en IndexedDB", async () => {

        const store = await import("./dietStore.js");
        await store.hydrate();

        const plan = store.importDietPlan(PARSED, { fileName: "dieta_2500_plantilla.csv" });
        expect(plan).toMatchObject({ active: true, sourceFileName: "dieta_2500_plantilla.csv", days: PARSED.days, generalRules: PARSED.generalRules });

        await new Promise(r => setTimeout(r, 20));
        vi.resetModules();
        const again = await import("./dietStore.js");
        await again.hydrate();

        expect(again.getActiveDietPlan()).toEqual(plan);

    });

    it("de lunes a viernes el día sale de la fecha; el fin de semana, de la elección de esa semana", async () => {

        const store = await import("./dietStore.js");
        await store.hydrate();

        expect(store.resolveDietDay(MONDAY)).toEqual({ dayKey: "LUNES", needsWeekendChoice: false });
        expect(store.resolveDietDay(SATURDAY)).toEqual({ dayKey: null, needsWeekendChoice: true });

        store.setWeekendLongRunDay(MONDAY, "domingo");
        expect(store.resolveDietDay(SATURDAY).dayKey).toBe("DESCANSO");
        expect(store.resolveDietDay(SUNDAY).dayKey).toBe("TIRADA_LARGA");

        store.setWeekendLongRunDay(SUNDAY, "sabado");
        expect(store.resolveDietDay(SATURDAY).dayKey).toBe("TIRADA_LARGA");
        expect(store.getDietWeekends()).toEqual([expect.objectContaining({ id: MONDAY, weekStart: MONDAY, longRunDay: "sabado" })]);

        // La semana siguiente, sin elegir.
        expect(store.resolveDietDay("2026-10-03").needsWeekendChoice).toBe(true);

    });

    it("una opción por comida: tocar otra la cambia, tocar la misma la desmarca; cumplimiento por comidas", async () => {

        const store = await import("./dietStore.js");
        await store.hydrate();
        const plan = store.importDietPlan(PARSED);
        const monday = plan.days.LUNES;

        store.toggleMealEaten(MONDAY, plan.id, "LUNES|21:00", "LUNES|21:00|1");
        store.toggleMealEaten(MONDAY, plan.id, "LUNES|21:00", "LUNES|21:00|2");
        expect(store.getEatenForDate(MONDAY)).toEqual({ "LUNES|21:00": "LUNES|21:00|2" });

        // HIDRATACION y AJUSTE no son comidas: 1 de 2.
        expect(store.computeDayCompliance(monday, store.getEatenForDate(MONDAY))).toEqual({ done: 1, total: 2, percent: 50 });

        store.toggleMealEaten(MONDAY, plan.id, "LUNES|21:00", "LUNES|21:00|2");
        expect(store.getEatenForDate(MONDAY)).toEqual({});

        // Una marca de una opción que ya no existe no cuenta.
        expect(store.computeDayCompliance(monday, { "LUNES|21:00": "LUNES|21:00|9" })).toEqual({ done: 0, total: 2, percent: 0 });

    });

    it("histórico: fin de semana sin elegir y días antes de importar, sin dato", async () => {

        const store = await import("./dietStore.js");
        await store.hydrate();
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(new Date("2026-09-22T10:00:00"));
        const plan = store.importDietPlan(PARSED);
        vi.useRealTimers();

        store.toggleMealEaten(SATURDAY, plan.id, "TIRADA_LARGA|Pre", "TIRADA_LARGA|Pre|1");
        store.setWeekendLongRunDay(SATURDAY, "sabado");

        const history = store.getComplianceHistory(SUNDAY, 7);
        expect(history.map(h => h.percent)).toEqual([null, 0, 0, 0, 0, 50, 0]);

    });

    it("importar otra dieta desactiva la anterior sin borrarla; borrar deja tombstone", async () => {

        const store = await import("./dietStore.js");
        const tombstones = await import("./tombstoneStore.js");
        await store.hydrate();
        await tombstones.hydrate();

        const first = store.importDietPlan(PARSED);
        const second = store.importDietPlan(PARSED);

        expect(store.getDietPlans().map(p => [p.id, p.active])).toEqual(expect.arrayContaining([[first.id, false], [second.id, true]]));

        store.deleteDietPlan(second.id);
        expect(store.getActiveDietPlan()).toBeNull();
        expect(tombstones.getTombstones().map(t => t.id)).toContain(`dietPlans:${second.id}`);

    });

});

describe("getWeekCompliance", () => {

    beforeEach(() => {
        resetFakeIndexedDB();
        vi.resetModules();
    });

    it("lunes a domingo de la semana, con su % y si es futuro", async () => {

        const store = await import("./dietStore.js");
        await store.hydrate();
        const plan = store.importDietPlan(PARSED);

        store.toggleMealEaten(MONDAY, plan.id, "LUNES|09:00", "LUNES|09:00|1");
        store.toggleMealEaten(MONDAY, plan.id, "LUNES|21:00", "LUNES|21:00|1");

        const week = store.getWeekCompliance("2026-09-24", "2026-09-24");

        expect(week.map(d => d.date)).toEqual(["2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25", "2026-09-26", "2026-09-27"]);
        expect(week[0]).toEqual({ date: MONDAY, percent: 100, future: false });
        expect(week[4].future).toBe(true);
        // Fin de semana sin elegir: sin menú con el que comparar.
        expect(week[5].percent).toBeNull();

    });

});
