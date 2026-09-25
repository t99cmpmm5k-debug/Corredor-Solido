// @vitest-environment happy-dom
// Hero.js importa themeManager.js, que toca localStorage al cargar el
// módulo -- solo existe en un entorno DOM (ver BottomNavigation.test.js).
import { describe, it, expect, vi, afterEach } from "vitest";

let todaySession = null;
let gymMatch = null;
let workouts = [];

vi.mock("../../data/workoutStore.js", () => ({
    getTodaySession: () => todaySession,
    getWorkouts: () => workouts
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

    // Rediseño de Inicio (2026-09-25): el titular deja de ser la frase
    // poética de heroData[type].title ("Construye"/"base") y pasa a
    // "HOY: <TIPO>" -- literal, usando el label ya existente en
    // WORKOUT_TYPES ("Rodaje (Z2)" sin paréntesis, en mayúsculas).
    it("sesión de running pendiente: titular 'HOY: RODAJE Z2', no el de completada", () => {

        todaySession = { type: "z2", status: "pending" };

        const html = Hero();

        expect(html).toContain("HOY:");
        expect(html).toContain("RODAJE Z2");
        expect(html).not.toContain("Sesión");
        expect(html).not.toContain("completada");

    });

    it("sesión de descanso del plan (recovery) pendiente: titular 'HOY: RECUPERA'", () => {

        todaySession = { type: "recovery", status: "pending" };

        const html = Hero();

        expect(html).toContain("HOY:");
        expect(html).toContain("RECUPERA");

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
        expect(html).toContain("HOY:");
        expect(html).toContain("FUERZA");

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

// Línea secundaria "Último entreno · X km ayer" (rediseño de Inicio,
// 2026-09-25) -- fechas relativas al reloj real (Hero() no recibe
// referenceDate, mismo criterio que formatCurrentDate() dentro), para no
// depender de una fecha de test fija que se quede desfasada.
describe("Hero -- línea secundaria 'Último entreno' (independiente del titular de hoy)", () => {

    function isoDaysAgo(days) {
        const d = new Date();
        d.setDate(d.getDate() - days);
        return d.toISOString().slice(0, 10);
    }

    afterEach(() => {
        todaySession = null;
        gymMatch = null;
        workouts = [];
    });

    it("con sesión de plan hoy Y un entreno real reciente, muestra las dos cosas a la vez (titular + línea secundaria)", () => {

        todaySession = { type: "z2", status: "pending" };
        workouts = [{ date: isoDaysAgo(1), distanceKm: 4.3 }];

        const html = Hero();

        expect(html).toContain("HOY:");
        expect(html).toContain("RODAJE Z2");
        expect(html).toContain("Último entreno · 4,3 km ayer");

    });

    it("sin ningún entreno real, no muestra la línea secundaria (nunca un hueco vacío)", () => {

        todaySession = { type: "z2", status: "pending" };
        workouts = [];

        const html = Hero();

        expect(html).not.toContain("Último entreno");

    });

    it("un entreno de hoy mismo se lee 'hoy', no 'hace 0 días'", () => {

        todaySession = null;
        gymMatch = null;
        workouts = [{ date: isoDaysAgo(0), distanceKm: 8 }];

        const html = Hero();

        expect(html).toContain("Último entreno · 8 km hoy");

    });

    it("un entreno real demasiado viejo (más del umbral) no muestra la línea secundaria", () => {

        todaySession = { type: "z2", status: "pending" };
        workouts = [{ date: isoDaysAgo(45), distanceKm: 10 }];

        const html = Hero();

        expect(html).not.toContain("Último entreno");

    });

});
