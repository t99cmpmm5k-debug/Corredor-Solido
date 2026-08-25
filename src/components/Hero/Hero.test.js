// @vitest-environment happy-dom
// Hero.js importa themeManager.js, que toca localStorage al cargar el
// módulo -- solo existe en un entorno DOM (ver BottomNavigation.test.js).
import { describe, it, expect, vi, afterEach } from "vitest";

let todaySession = null;
let gymMatch = null;

vi.mock("../../data/workoutStore.js", () => ({
    getTodaySession: () => todaySession,
    getWorkouts: () => []
}));

vi.mock("../../pages/Plan/gymTimelineBridge.js", () => ({
    getGymDayForDate: () => gymMatch
}));

const { Hero } = await import("./Hero.js");

describe("Hero -- estado finalizada / gimnasio de hoy", () => {

    afterEach(() => {
        todaySession = null;
        gymMatch = null;
    });

    it("sesión de running pendiente: usa el hero normal del tipo, no el de completada", () => {

        todaySession = { type: "z2", status: "pending" };

        const html = Hero();

        expect(html).toContain("Construye");
        expect(html).not.toContain("Sesión");
        expect(html).not.toContain("completada");

    });

    it("sesión de running completada: usa el hero de 'ya lo hiciste', no invita a entrenar", () => {

        todaySession = { type: "z2", status: "completed" };

        const html = Hero();

        expect(html).toContain("Sesión");
        expect(html).toContain("completada");
        expect(html).toContain("Ya has entrenado hoy");

    });

    it("sin running hoy pero con gimnasio programado (pendiente): no dice 'nada planificado', usa el hero de fuerza", () => {

        todaySession = null;
        gymMatch = { day: { id: "d1", title: "Torso" }, routine: { id: "r1", name: "Torso" }, finishedSession: null };

        const html = Hero();

        expect(html).not.toContain("no tienes ningún entrenamiento planificado");
        expect(html).toContain("fuerza");

    });

    it("sin running hoy y gimnasio ya completado: usa el hero de 'ya lo hiciste'", () => {

        todaySession = null;
        gymMatch = { day: { id: "d1", title: "Torso" }, routine: { id: "r1", name: "Torso" }, finishedSession: { id: "s1" } };

        const html = Hero();

        expect(html).toContain("Sesión");
        expect(html).toContain("completada");

    });

    it("sin running ni gimnasio hoy: cae al hero de día libre de siempre (restDayHero)", () => {

        todaySession = null;
        gymMatch = null;

        const html = Hero();

        expect(html).toContain("no tienes ningún entrenamiento planificado");

    });

});
