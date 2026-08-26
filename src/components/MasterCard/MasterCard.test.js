import { describe, it, expect, vi, afterEach } from "vitest";
import { setState } from "../../core/state.js";

let todaySession = null;
let gymMatch = null;

vi.mock("../../data/workoutStore.js", () => ({
    getTodaySession: () => todaySession,
    getCurrentWeekSessions: () => [],
    getWorkoutForSession: () => null
}));

vi.mock("../../pages/Plan/gymTimelineBridge.js", () => ({
    getGymDayForDate: () => gymMatch
}));

const { MasterCard } = await import("./MasterCard.js");

describe("MasterCard -- prioridad running > gimnasio > vacío (running siempre manda, confirmado 2026-08-25)", () => {

    afterEach(() => {
        todaySession = null;
        gymMatch = null;
        setState("selectedWorkout", null);
        setState("homeSelectedWorkout", null);
    });

    it("con running planificado hoy, muestra SessionCard aunque también haya gimnasio programado", () => {

        todaySession = { id: "run1", title: "Rodaje", status: "pending" };
        gymMatch = { routine: { id: "r1", name: "Torso" }, day: { id: "d1", title: "Torso" }, finishedSession: null };

        const html = MasterCard();

        expect(html).toContain("SESIÓN DE HOY");
        expect(html).not.toContain("GIMNASIO DE HOY");

    });

    it("sin running hoy pero con gimnasio programado, muestra la tarjeta de gimnasio en el mismo hueco", () => {

        todaySession = null;
        gymMatch = { routine: { id: "r1", name: "Torso" }, day: { id: "d1", title: "Torso" }, finishedSession: null };

        const html = MasterCard();

        expect(html).toContain("GIMNASIO DE HOY");
        expect(html).not.toContain("session-card--empty");

    });

    it("sin running ni gimnasio hoy, muestra el aviso vacío de siempre", () => {

        todaySession = null;
        gymMatch = null;

        const html = MasterCard();

        expect(html).toContain("session-card--empty");
        expect(html).not.toContain("GIMNASIO DE HOY");

    });

    it("una selección manual de otro día en Inicio (homeSelectedWorkout, botón \"Cambiar\") tiene prioridad y no activa el hueco de gimnasio", () => {

        todaySession = null;
        gymMatch = { routine: { id: "r1", name: "Torso" }, day: { id: "d1", title: "Torso" }, finishedSession: null };
        setState("homeSelectedWorkout", { id: "other-day", title: "Descanso", status: "pending" });

        const html = MasterCard();

        expect(html).toContain("SESIÓN DE HOY");
        expect(html).not.toContain("GIMNASIO DE HOY");

    });

    // Bug real 2026-08-26: Inicio y Plan compartían el mismo
    // selectedWorkout (state.js) -- tocar cualquier día en la línea
    // temporal de Plan se colaba aquí como si fuera "la sesión de hoy".
    // homeSelectedWorkout (propio de Inicio) y selectedWorkout (propio de
    // Plan, ver planStore.js) son dos claves de estado independientes
    // desde entonces -- este test confirma que MasterCard() ignora por
    // completo la de Plan.
    it("selectedWorkout (el estado de Plan) NO afecta a Inicio -- son estados independientes", () => {

        todaySession = null;
        gymMatch = null;
        setState("selectedWorkout", { id: "plan-tuesday", title: "Series", status: "pending" });

        const html = MasterCard();

        // Sin sesión hoy ni en Inicio ni en Plan, el hueco vacío de
        // siempre -- si selectedWorkout se colara, aquí aparecería
        // "Series" en su lugar.
        expect(html).toContain("session-card--empty");
        expect(html).not.toContain("Series");

    });

});
