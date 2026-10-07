import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { parseDietCsv } from "../utils/dietCsv.js";

// Lunes con una comida común (09:00) y un post-entreno distinto por franja.
const CSV = [
    "dia,momento,opcion,alimento,notas",
    "LUNES,09:00,1,Avena 40 g,",
    "LUNES,Mañana - Post-gym,1,Proteína 30 g,",
    "LUNES,Mediodía - Post-gym,1,Proteína 30 g + arroz 50 g,",
    "LUNES,Tarde - Post-gym,1,Batido 300 ml,",
    "MARTES,09:00,1,Avena 40 g,",
    "MIERCOLES,09:00,1,Avena 40 g,",
    "JUEVES,09:00,1,Avena 40 g,",
    "VIERNES,09:00,1,Avena 40 g,",
    "TIRADA_LARGA,Pre,1,Plátano 120 g,",
    "DESCANSO,09:00,1,Huevos + pan 40 g,"
].join("\n");

const PLAN = parseDietCsv(CSV).plan;
const MONDAY = "2026-09-21";
const NEXT_MONDAY = "2026-09-28";

function resetFakeIndexedDB() {
    globalThis.indexedDB = new IDBFactory();
}

async function freshStore() {

    const store = await import("./dietStore.js");
    await store.hydrate();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-20T10:00:00"));
    const plan = store.importDietPlan(PLAN);
    vi.useRealTimers();

    return { store, plan };

}

describe("dietStore -- franja de entrenamiento", () => {

    beforeEach(() => {
        resetFakeIndexedDB();
        vi.resetModules();
    });

    it("comidas de una franja: las suyas más las comunes; sin franja, todas", async () => {

        const { store } = await freshStore();
        const day = PLAN.days.LUNES;

        expect(store.dayHasTrainingTimes(day)).toBe(true);
        expect(store.dayHasTrainingTimes(PLAN.days.MARTES)).toBe(false);
        expect(store.getMealsForTrainingTime(day, "tarde").map(m => m.key)).toEqual(["LUNES|09:00", "LUNES|Tarde - Post-gym"]);
        expect(store.getMealsForTrainingTime(day, null)).toHaveLength(4);

    });

    it("franja del día: la elegida ese día; si no, la del último día anterior; si nunca, mediodía", async () => {

        const { store, plan } = await freshStore();

        expect(store.getTrainingTimeForDate(MONDAY)).toBe("mediodia");

        store.setTrainingTime(MONDAY, plan.id, "manana");
        expect(store.getTrainingTimeForDate(MONDAY)).toBe("manana");
        // Martes sin elegir: hereda la del lunes.
        expect(store.getTrainingTimeForDate("2026-09-22")).toBe("manana");
        // El domingo anterior no cambia por lo elegido después.
        expect(store.getTrainingTimeForDate("2026-09-20")).toBe("mediodia");

    });

    it("marcar una comida conserva la franja, y elegir franja conserva lo marcado", async () => {

        const { store, plan } = await freshStore();

        store.setTrainingTime(MONDAY, plan.id, "tarde");
        store.toggleMealEaten(MONDAY, plan.id, "LUNES|09:00", "LUNES|09:00|1");
        expect(store.getTrainingTimeForDate(MONDAY)).toBe("tarde");

        store.setTrainingTime(MONDAY, plan.id, "manana");
        expect(store.getEatenForDate(MONDAY)).toEqual({ "LUNES|09:00": "LUNES|09:00|1" });

    });

    it("cumplimiento: cuenta solo las comidas de la franja más las comunes", async () => {

        const { store, plan } = await freshStore();

        store.setTrainingTime(MONDAY, plan.id, "tarde");
        store.toggleMealEaten(MONDAY, plan.id, "LUNES|09:00", "LUNES|09:00|1");
        // Marcada pero de OTRA franja: ni suma ni resta.
        store.toggleMealEaten(MONDAY, plan.id, "LUNES|Mañana - Post-gym", "LUNES|Mañana - Post-gym|1");

        expect(store.getDayCompliance(MONDAY)).toEqual({ done: 1, total: 2, percent: 50 });

        store.setTrainingTime(MONDAY, plan.id, "manana");
        expect(store.getDayCompliance(MONDAY)).toEqual({ done: 2, total: 2, percent: 100 });

        // Pura, con la franja explícita (lo que usa el anillo).
        const eaten = store.getEatenForDate(MONDAY);
        expect(store.computeDayCompliance(PLAN.days.LUNES, eaten, "mediodia")).toEqual({ done: 1, total: 2, percent: 50 });

    });

    it("plan sin franjas: el cumplimiento no cambia aunque haya una franja guardada", async () => {

        const { store, plan } = await freshStore();

        store.setTrainingTime(NEXT_MONDAY, plan.id, "tarde");
        store.toggleMealEaten("2026-09-29", plan.id, "MARTES|09:00", "MARTES|09:00|1");

        expect(store.getDayCompliance("2026-09-29")).toEqual({ done: 1, total: 1, percent: 100 });

    });

});
