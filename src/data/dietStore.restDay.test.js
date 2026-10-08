import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { parseDietCsv } from "../utils/dietCsv.js";

// Lunes con franjas (una común + un post-entreno por franja), martes sin
// franjas, y un DESCANSO de dos comidas con su AJUSTE.
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
    "DESCANSO,Desayuno,1,Huevos + pan 40 g,",
    "DESCANSO,Desayuno,2,Yogur + avena 40 g,",
    "DESCANSO,Cena,1,Merluza 180 g,",
    "DESCANSO,AJUSTE,1,,Día sin entreno."
].join("\n");

const PLAN = parseDietCsv(CSV).plan;
const MONDAY = "2026-09-21";
const TUESDAY = "2026-09-22";

// El mismo plan tal como lo guardaba (o lo sincroniza) una versión sin el
// campo `training`: el momento conserva el prefijo.
function withoutTraining(plan) {

    const days = Object.fromEntries(Object.entries(plan.days).map(([key, day]) => [key, {
        ...day,
        meals: day.meals.map(({ training, ...meal }) => ({ ...meal, moment: meal.key.slice(meal.key.indexOf("|") + 1) }))
    }]));

    return { ...plan, days };

}

function resetFakeIndexedDB() {
    globalThis.indexedDB = new IDBFactory();
}

async function freshStore(parsed = PLAN) {

    const store = await import("./dietStore.js");
    await store.hydrate();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-20T10:00:00"));
    const plan = store.importDietPlan(parsed);
    vi.useRealTimers();

    return { store, plan };

}

describe("dietStore -- pestaña Descanso", () => {

    beforeEach(() => {
        resetFakeIndexedDB();
        vi.resetModules();
    });

    it("default sin elección: el último entreno elegido, nunca descanso por arrastre", async () => {

        const { store, plan } = await freshStore();

        store.setTrainingTime(MONDAY, plan.id, "tarde");
        store.setTrainingTime(TUESDAY, plan.id, "descanso");

        expect(store.getTrainingTimeForDate(TUESDAY)).toBe("descanso");
        // Miércoles sin elegir: la tarde del lunes, no el descanso del martes.
        expect(store.getTrainingTimeForDate("2026-09-23")).toBe("tarde");

    });

    it("default sin elección y solo descansos antes: mediodía", async () => {

        const { store, plan } = await freshStore();

        store.setTrainingTime(MONDAY, plan.id, "descanso");
        expect(store.getTrainingTimeForDate(TUESDAY)).toBe("mediodia");

    });

    it("menú con descanso: las comidas y el AJUSTE del día DESCANSO, sin mezclar las del día", async () => {

        const { store, plan } = await freshStore();

        expect(store.canChooseRestDay(plan, "LUNES")).toBe(true);
        // Sin franjas (martes) o el propio DESCANSO: no hay pestaña.
        expect(store.canChooseRestDay(plan, "MARTES")).toBe(false);
        expect(store.canChooseRestDay(plan, "DESCANSO")).toBe(false);

        const menu = store.getDietMenu(plan, "LUNES", "descanso");
        expect(menu.dayKey).toBe("DESCANSO");
        expect(menu.day.adjustment).toBe("Día sin entreno.");
        expect(menu.meals.map(m => m.key)).toEqual(["DESCANSO|Desayuno", "DESCANSO|Cena"]);

        // En un día sin franjas "descanso" no cambia nada.
        expect(store.getDietMenu(plan, "MARTES", "descanso").meals.map(m => m.key)).toEqual(["MARTES|09:00"]);

    });

    it("cumplimiento con descanso: solo cuentan las comidas del menú DESCANSO", async () => {

        const { store, plan } = await freshStore();

        store.toggleMealEaten(MONDAY, plan.id, "LUNES|09:00", "LUNES|09:00|1");
        store.toggleMealEaten(MONDAY, plan.id, "LUNES|Mediodía - Post-gym", "LUNES|Mediodía - Post-gym|1");
        expect(store.getDayCompliance(MONDAY)).toEqual({ done: 2, total: 2, percent: 100 });

        store.setTrainingTime(MONDAY, plan.id, "descanso");
        // Las marcas de mediodía ni suman ni restan en descanso.
        expect(store.getDayCompliance(MONDAY)).toEqual({ done: 0, total: 2, percent: 0 });

        store.toggleMealEaten(MONDAY, plan.id, "DESCANSO|Desayuno", "DESCANSO|Desayuno|2");
        expect(store.getDayCompliance(MONDAY)).toEqual({ done: 1, total: 2, percent: 50 });
        expect(store.getWeekDietCompliance(MONDAY, MONDAY)).toEqual({ done: 1, total: 2, percent: 50 });

        // Y la de descanso no cuenta al volver a mediodía.
        store.setTrainingTime(MONDAY, plan.id, "mediodia");
        expect(store.getDayCompliance(MONDAY)).toEqual({ done: 2, total: 2, percent: 100 });

    });

    it("marcar una comida conserva la franja descanso", async () => {

        const { store, plan } = await freshStore();

        store.setTrainingTime(MONDAY, plan.id, "descanso");
        store.toggleMealEaten(MONDAY, plan.id, "DESCANSO|Cena", "DESCANSO|Cena|1");
        store.toggleMealEaten(MONDAY, plan.id, "DESCANSO|Cena", "DESCANSO|Cena|1");

        expect(store.getTrainingTimeForDate(MONDAY)).toBe("descanso");

    });

    it("reimportar el mismo CSV no pierde las marcas del menú DESCANSO", async () => {

        const { store, plan } = await freshStore();

        store.setTrainingTime(MONDAY, plan.id, "descanso");
        store.toggleMealEaten(MONDAY, plan.id, "DESCANSO|Cena", "DESCANSO|Cena|1");
        const reimported = store.importDietPlan(parseDietCsv(CSV).plan);

        const menu = store.getDietMenu(reimported, "LUNES", "descanso");
        expect(store.computeDayCompliance(menu.day, store.getEatenForDate(MONDAY), menu.trainingTime)).toEqual({ done: 1, total: 2, percent: 50 });

    });

    it("plan guardado sin `training`: franja y nombre sin prefijo deducidos del momento original", async () => {

        const { store, plan } = await freshStore(withoutTraining(PLAN));

        expect(plan.days.LUNES.meals.some(m => m.training)).toBe(false);
        expect(store.canChooseRestDay(plan, "LUNES")).toBe(true);

        const menu = store.getDietMenu(plan, "LUNES", "tarde");
        expect(menu.meals.map(m => [m.key, m.moment, m.training ?? null])).toEqual([
            ["LUNES|09:00", "09:00", null],
            ["LUNES|Tarde - Post-gym", "Post-gym", "tarde"]
        ]);

        // El cumplimiento usa la misma deducción.
        store.setTrainingTime(MONDAY, plan.id, "tarde");
        store.toggleMealEaten(MONDAY, plan.id, "LUNES|Mañana - Post-gym", "LUNES|Mañana - Post-gym|1");
        expect(store.getDayCompliance(MONDAY)).toEqual({ done: 0, total: 2, percent: 0 });

    });

    it("comidas «Descanso - » del propio día: solo en la pestaña Descanso, y cuentan solo ahí", async () => {

        const rows = CSV.split("\n");
        rows.splice(5, 0, "LUNES,Descanso - Desayuno,1,Huevos + pan 40 g,", "LUNES,Descanso - Desayuno,2,Yogur 200 g,");
        const { store, plan } = await freshStore(parseDietCsv(rows.join("\n")).plan);

        for (const time of ["manana", "mediodia", "tarde"]) {
            expect(store.getDietMenu(plan, "LUNES", time).meals.map(m => m.key)).not.toContain("LUNES|Descanso - Desayuno");
        }

        expect(store.canChooseRestDay(plan, "LUNES")).toBe(true);

        // Las suyas más las comunes, del propio día -- no el menú DESCANSO.
        const menu = store.getDietMenu(plan, "LUNES", "descanso");
        expect(menu.dayKey).toBe("LUNES");
        expect(menu.meals.map(m => [m.key, m.moment])).toEqual([
            ["LUNES|09:00", "09:00"],
            ["LUNES|Descanso - Desayuno", "Desayuno"]
        ]);

        store.setTrainingTime(MONDAY, plan.id, "descanso");
        store.toggleMealEaten(MONDAY, plan.id, "LUNES|Descanso - Desayuno", "LUNES|Descanso - Desayuno|2");
        expect(store.getDayCompliance(MONDAY)).toEqual({ done: 1, total: 2, percent: 50 });

        store.setTrainingTime(MONDAY, plan.id, "tarde");
        expect(store.getDayCompliance(MONDAY)).toEqual({ done: 0, total: 2, percent: 0 });

    });

});
