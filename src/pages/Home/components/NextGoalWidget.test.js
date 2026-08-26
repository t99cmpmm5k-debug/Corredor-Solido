import { describe, it, expect, vi, afterEach } from "vitest";
import { NextGoalWidget } from "./NextGoalWidget.js";
import { getUpcomingPlannedRaces } from "../../../data/workoutStore.js";

vi.mock("../../../data/workoutStore.js", () => ({
    getUpcomingPlannedRaces: vi.fn()
}));

const REFERENCE = new Date(2026, 7, 26); // 26 agosto 2026

describe("NextGoalWidget", () => {

    afterEach(() => {
        vi.mocked(getUpcomingPlannedRaces).mockReset();
    });

    it("sin ninguna carrera próxima real, no renderiza nada", () => {

        vi.mocked(getUpcomingPlannedRaces).mockReturnValue([]);

        expect(NextGoalWidget(REFERENCE)).toBe("");

    });

    it("con una carrera próxima real, muestra su nombre y los días reales que faltan", () => {

        vi.mocked(getUpcomingPlannedRaces).mockReturnValue([
            { id: "r1", name: "10K Murcia", date: "2026-09-22" }
        ]);

        const html = NextGoalWidget(REFERENCE);

        expect(html).toContain("10K Murcia");
        expect(html).toContain("27 días");
        expect(html).not.toContain("Objetivo ·");

    });

    it("una carrera hoy mismo dice 'Hoy', no '0 días'", () => {

        vi.mocked(getUpcomingPlannedRaces).mockReturnValue([
            { id: "r1", name: "10K Murcia", date: "2026-08-26" }
        ]);

        const html = NextGoalWidget(REFERENCE);
        expect(html).toContain("Hoy");

    });

    it("una carrera mañana dice 'Mañana', no '1 días'", () => {

        vi.mocked(getUpcomingPlannedRaces).mockReturnValue([
            { id: "r1", name: "10K Murcia", date: "2026-08-27" }
        ]);

        const html = NextGoalWidget(REFERENCE);
        expect(html).toContain("Mañana");
        expect(html).not.toContain("1 días");

    });

    it("una carrera sin nombre usa 'Carrera' como fallback", () => {

        vi.mocked(getUpcomingPlannedRaces).mockReturnValue([
            { id: "r1", date: "2026-08-27" }
        ]);

        const html = NextGoalWidget(REFERENCE);
        expect(html).toContain("Carrera");

    });

});
