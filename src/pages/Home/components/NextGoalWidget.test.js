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

    it("con una carrera próxima real, muestra su nombre completo y los datos reales de la segunda línea", () => {

        vi.mocked(getUpcomingPlannedRaces).mockReturnValue([
            { id: "r1", name: "10K Murcia", date: "2026-09-22", distanceKm: 10, location: "Murcia" }
        ]);

        const html = NextGoalWidget(REFERENCE);

        expect(html).toContain("10K Murcia");
        expect(html).toContain("10,00 km");
        expect(html).toContain("Murcia");

    });

    it("una carrera hoy muestra la cápsula HOY, sin repetir 'Hoy' en la segunda línea (versión final, ronda de cierre)", () => {

        vi.mocked(getUpcomingPlannedRaces).mockReturnValue([
            { id: "r1", name: "10K Murcia", date: "2026-08-26", distanceKm: 10, location: "Murcia" }
        ]);

        const html = NextGoalWidget(REFERENCE);

        expect(html).toContain("next-goal-today-pill");
        expect(html).toContain("HOY");
        expect(html).not.toContain("Hoy");

    });

    it("una carrera mañana dice 'Mañana' en la segunda línea, sin cápsula HOY", () => {

        vi.mocked(getUpcomingPlannedRaces).mockReturnValue([
            { id: "r1", name: "10K Murcia", date: "2026-08-27" }
        ]);

        const html = NextGoalWidget(REFERENCE);

        expect(html).toContain("Mañana");
        expect(html).not.toContain("next-goal-today-pill");

    });

    it("una carrera más lejana muestra el día de la semana y la fecha real, sin cápsula HOY", () => {

        vi.mocked(getUpcomingPlannedRaces).mockReturnValue([
            { id: "r1", name: "10K Murcia", date: "2026-09-22" }
        ]);

        const html = NextGoalWidget(REFERENCE);

        expect(html).toContain("22 sep");
        expect(html).not.toContain("next-goal-today-pill");

    });

    it("una carrera sin nombre usa 'Carrera' como fallback", () => {

        vi.mocked(getUpcomingPlannedRaces).mockReturnValue([
            { id: "r1", date: "2026-08-27" }
        ]);

        const html = NextGoalWidget(REFERENCE);
        expect(html).toContain("Carrera");

    });

    it("sin distanceKm pero con type (RU/TRS, el campo real de plannedRaces), usa la etiqueta de disciplina en vez de omitir esa pieza", () => {

        vi.mocked(getUpcomingPlannedRaces).mockReturnValue([
            { id: "r1", name: "Carrera Nocturna", date: "2026-08-26", type: "RU", location: "Las Torres" }
        ]);

        const html = NextGoalWidget(REFERENCE);

        expect(html).toContain("Asfalto");
        expect(html).toContain("Las Torres");

    });

    it("sin distanceKm ni type ni location, para una carrera futura la segunda línea solo trae la fecha real", () => {

        vi.mocked(getUpcomingPlannedRaces).mockReturnValue([
            { id: "r1", name: "Carrera Nocturna", date: "2026-09-22" }
        ]);

        const html = NextGoalWidget(REFERENCE);

        expect(html).toContain("next-goal-subtitle\">Martes, 22 sept<");

    });

    // Versión final (ronda de cierre): la cápsula "HOY" ya dice que es
    // hoy, así que la segunda línea no repite la fecha -- si además la
    // carrera no trae ni tipo ni ubicación, no queda nada real que
    // mostrar en esa línea, y se omite entera en vez de dejar un <span>
    // vacío.
    it("una carrera de hoy sin type/distanceKm/location no deja ninguna segunda línea (nada real que mostrar)", () => {

        vi.mocked(getUpcomingPlannedRaces).mockReturnValue([
            { id: "r1", name: "Carrera Nocturna", date: "2026-08-26" }
        ]);

        const html = NextGoalWidget(REFERENCE);

        expect(html).not.toContain("next-goal-subtitle");

    });

});
