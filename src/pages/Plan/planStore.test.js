import { describe, it, expect, beforeEach } from "vitest";
import {
    getPlanViewMode,
    setPlanViewMode,
    getViewedMonth,
    setViewedMonth,
    setViewedWeekStart,
    shiftViewedMonth,
    resetPlanView
} from "./planStore.js";

describe("planStore — vista semanal/mensual", () => {

    beforeEach(() => {
        resetPlanView();
    });

    it("por defecto la vista es semanal", () => {
        expect(getPlanViewMode()).toBe("week");
    });

    it("setPlanViewMode cambia la vista activa", () => {

        setPlanViewMode("month");
        expect(getPlanViewMode()).toBe("month");

        setPlanViewMode("week");
        expect(getPlanViewMode()).toBe("week");

    });

    it("getViewedMonth se inicializa al mes de la semana que se estuviera viendo, no siempre al mes real de hoy", () => {

        setViewedWeekStart("2026-03-18"); // semana a mitad de marzo 2026

        expect(getViewedMonth()).toBe("2026-03-01");

    });

    it("una vez inicializado, getViewedMonth no vuelve a recalcularse en cada llamada", () => {

        setViewedWeekStart("2026-03-18");
        const first = getViewedMonth();

        setViewedWeekStart("2026-11-02"); // cambiar de semana después no debe mover el mes ya fijado
        const second = getViewedMonth();

        expect(first).toBe("2026-03-01");
        expect(second).toBe("2026-03-01");

    });

    it("setViewedMonth fija el mes explícitamente", () => {

        setViewedMonth("2026-07-01");
        expect(getViewedMonth()).toBe("2026-07-01");

    });

    it("shiftViewedMonth avanza y retrocede un mes", () => {

        setViewedMonth("2026-07-01");

        shiftViewedMonth(1);
        expect(getViewedMonth()).toBe("2026-08-01");

        shiftViewedMonth(-2);
        expect(getViewedMonth()).toBe("2026-06-01");

    });

    it("shiftViewedMonth cruza correctamente un límite de año en ambas direcciones", () => {

        setViewedMonth("2026-12-01");
        shiftViewedMonth(1);
        expect(getViewedMonth()).toBe("2027-01-01");

        setViewedMonth("2026-01-01");
        shiftViewedMonth(-1);
        expect(getViewedMonth()).toBe("2025-12-01");

    });

    it("resetPlanView vuelve a la vista semanal y olvida el mes fijado", () => {

        setPlanViewMode("month");
        setViewedMonth("2026-07-01");

        resetPlanView();

        expect(getPlanViewMode()).toBe("week");

        // Tras el reset, viewedWeekStart vuelve a "hoy" -- getViewedMonth
        // se re-deriva de ahí la próxima vez que se pida, no se queda en
        // julio 2026.
        expect(getViewedMonth()).not.toBe("2026-07-01");

    });

});
