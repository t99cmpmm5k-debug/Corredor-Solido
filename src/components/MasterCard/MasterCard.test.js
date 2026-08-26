import { describe, it, expect, vi, afterEach } from "vitest";
import { setState } from "../../core/state.js";

let todaySession = null;
let gymMatch = null;
const getGymDayForDateSpy = vi.fn(() => gymMatch);

vi.mock("../../data/workoutStore.js", () => ({
    getTodaySession: () => todaySession,
    getCurrentWeekSessions: () => [],
    getWorkoutForSession: () => null
}));

vi.mock("../../pages/Plan/gymTimelineBridge.js", () => ({
    getGymDayForDate: (date) => getGymDayForDateSpy(date)
}));

vi.mock("../../data/gymSessionStore.js", () => ({
    getAverageDurationForDay: () => null
}));

const { MasterCard } = await import("./MasterCard.js");

// Corrección 2026-08-26 (coherencia Plan↔Home): "running siempre manda"
// (25 ago) se descarta -- si Plan tiene programados running Y gimnasio el
// mismo día, Inicio debe mostrar los dos apilados, no solo uno.
describe("MasterCard -- coherencia con Plan: muestra running Y gimnasio si los dos existen (corregido 2026-08-26)", () => {

    afterEach(() => {
        todaySession = null;
        gymMatch = null;
        getGymDayForDateSpy.mockClear();
        setState("selectedWorkout", null);
        setState("homeSelectedWorkout", null);
    });

    it("con running Y gimnasio programados el mismo día, apila las dos tarjetas", () => {

        todaySession = { id: "run1", title: "Rodaje", status: "pending" };
        gymMatch = { routine: { id: "r1", name: "Torso" }, day: { id: "d1", title: "Torso", exercises: [] }, finishedSession: null };

        const html = MasterCard();

        expect(html).toContain("RUNNING DE HOY");
        expect(html).toContain("GIMNASIO DE HOY");

    });

    it("solo con running, no hay hueco de gimnasio", () => {

        todaySession = { id: "run1", title: "Rodaje", status: "pending" };
        gymMatch = null;

        const html = MasterCard();

        expect(html).toContain("RUNNING DE HOY");
        expect(html).not.toContain("GIMNASIO DE HOY");

    });

    it("sin running hoy pero con gimnasio programado, muestra la tarjeta de gimnasio en el mismo hueco", () => {

        todaySession = null;
        gymMatch = { routine: { id: "r1", name: "Torso" }, day: { id: "d1", title: "Torso", exercises: [] }, finishedSession: null };

        const html = MasterCard();

        expect(html).toContain("GIMNASIO DE HOY");
        expect(html).not.toContain("session-card--empty");
        expect(html).not.toContain("RUNNING DE HOY");

    });

    it("sin running ni gimnasio hoy, muestra el aviso vacío de siempre", () => {

        todaySession = null;
        gymMatch = null;

        const html = MasterCard();

        expect(html).toContain("session-card--empty");
        expect(html).not.toContain("GIMNASIO DE HOY");
        expect(html).not.toContain("RUNNING DE HOY");

    });

    it("una selección manual de otro día en Inicio (homeSelectedWorkout, botón \"Cambiar\") con gimnasio también programado ESE día muestra las dos", () => {

        todaySession = null;
        gymMatch = { routine: { id: "r1", name: "Torso" }, day: { id: "d1", title: "Torso", exercises: [] }, finishedSession: null };
        setState("homeSelectedWorkout", { id: "other-day", title: "Descanso", status: "pending", date: "2026-08-28" });

        const html = MasterCard();

        expect(html).toContain("RUNNING DE HOY");
        expect(html).toContain("GIMNASIO DE HOY");

    });

    it("la comprobación de gimnasio usa la fecha del día seleccionado a mano, no siempre \"hoy\" -- coherente con Plan para ESE día", () => {

        setState("homeSelectedWorkout", { id: "other-day", title: "Series", status: "pending", date: "2026-08-28" });

        MasterCard();

        expect(getGymDayForDateSpy).toHaveBeenCalledWith("2026-08-28");

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
