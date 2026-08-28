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

    it("título 'PRÓXIMAS CARRERAS' (renombrado en los ajustes de cierre) con la flecha de que hay más en Carreras", () => {

        vi.mocked(getUpcomingPlannedRaces).mockReturnValue([
            { id: "r1", name: "10K Murcia", date: "2026-09-22" }
        ]);

        const html = NextGoalWidget(REFERENCE);

        expect(html).toContain("PRÓXIMAS CARRERAS");
        expect(html).not.toContain("PRÓXIMO OBJETIVO");
        expect(html).toContain("next-goal-more-hint");

    });

    // Aunque getUpcomingPlannedRaces() pueda devolver varias carreras
    // reales, el widget solo pinta la primera -- el resto vive en
    // Carreras (ver comentario en NextGoalWidget.js).
    it("con varias carreras próximas reales, solo muestra la primera (la más próxima)", () => {

        vi.mocked(getUpcomingPlannedRaces).mockReturnValue([
            { id: "r1", name: "10K Murcia", date: "2026-09-22" },
            { id: "r2", name: "Media Maratón Águilas", date: "2026-10-01" }
        ]);

        const html = NextGoalWidget(REFERENCE);

        expect(html).toContain("10K Murcia");
        expect(html).not.toContain("Media Maratón Águilas");

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

    it("una carrera hoy muestra la cápsula HOY, sin repetir 'Hoy' en la segunda línea", () => {

        vi.mocked(getUpcomingPlannedRaces).mockReturnValue([
            { id: "r1", name: "10K Murcia", date: "2026-08-26", distanceKm: 10, location: "Murcia" }
        ]);

        const html = NextGoalWidget(REFERENCE);

        expect(html).toContain("next-goal-day-pill");
        expect(html).toContain("HOY");
        expect(html).not.toContain("Hoy");

    });

    // Ajuste B2 (ronda de ajustes finales): misma cápsula que HOY, con
    // texto MAÑANA -- y por el mismo motivo que HOY, la fecha ya no se
    // repite en la segunda línea.
    it("una carrera mañana muestra la cápsula MAÑANA, sin repetir 'Mañana' en la segunda línea", () => {

        vi.mocked(getUpcomingPlannedRaces).mockReturnValue([
            { id: "r1", name: "10K Murcia", date: "2026-08-27", distanceKm: 10, location: "Murcia" }
        ]);

        const html = NextGoalWidget(REFERENCE);

        expect(html).toContain("next-goal-day-pill");
        expect(html).toContain("MAÑANA");
        expect(html).not.toContain("next-goal-subtitle\">Mañana<");

    });

    it("una carrera más lejana muestra el día de la semana y la fecha real, sin ninguna cápsula", () => {

        vi.mocked(getUpcomingPlannedRaces).mockReturnValue([
            { id: "r1", name: "10K Murcia", date: "2026-09-22" }
        ]);

        const html = NextGoalWidget(REFERENCE);

        expect(html).toContain("22 sep");
        expect(html).not.toContain("next-goal-day-pill");

    });

    it("una carrera sin nombre usa 'Carrera' como fallback", () => {

        vi.mocked(getUpcomingPlannedRaces).mockReturnValue([
            { id: "r1", date: "2026-08-30" }
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

    it("una carrera de hoy sin type/distanceKm/location no deja ninguna segunda línea (nada real que mostrar)", () => {

        vi.mocked(getUpcomingPlannedRaces).mockReturnValue([
            { id: "r1", name: "Carrera Nocturna", date: "2026-08-26" }
        ]);

        const html = NextGoalWidget(REFERENCE);

        expect(html).not.toContain("next-goal-subtitle");

    });

    // Nombre largo real (30ª Carrera Nocturna Fiestas de Las Torres 2026)
    // -- probado explícitamente en la ronda de columnas porque a media
    // anchura es el caso más apretado; aquí solo se confirma que el
    // marcado sigue siendo el <span> de siempre (el ajuste de ancho/
    // elipsis vive en CSS, ver NextGoalWidget.css).
    it("con una carrera marcada isGoal, la prioriza por encima de la más próxima por fecha simple", () => {

        vi.mocked(getUpcomingPlannedRaces).mockReturnValue([
            { id: "r1", name: "10K Murcia (más próxima)", date: "2026-09-22" },
            { id: "r2", name: "Maratón Objetivo", date: "2026-10-15", isGoal: true }
        ]);

        const html = NextGoalWidget(REFERENCE);

        expect(html).toContain("Maratón Objetivo");
        expect(html).not.toContain("10K Murcia (más próxima)");

    });

    it("sin ninguna carrera marcada isGoal, mantiene el comportamiento actual (la más próxima por fecha)", () => {

        vi.mocked(getUpcomingPlannedRaces).mockReturnValue([
            { id: "r1", name: "10K Murcia", date: "2026-09-22" },
            { id: "r2", name: "Media Maratón Águilas", date: "2026-10-01" }
        ]);

        const html = NextGoalWidget(REFERENCE);

        expect(html).toContain("10K Murcia");
        expect(html).not.toContain("Media Maratón Águilas");

    });

    it("un nombre de carrera largo real sigue en el mismo <span> (el recorte a 2 líneas/elipsis es cosa del CSS)", () => {

        vi.mocked(getUpcomingPlannedRaces).mockReturnValue([
            { id: "r1", name: "30ª Carrera Nocturna Fiestas de Las Torres 2026", date: "2026-08-26", type: "RU", location: "Torres de Cotillas (Las), Murcia" }
        ]);

        const html = NextGoalWidget(REFERENCE);

        expect(html).toContain('<span class="next-goal-name">30ª Carrera Nocturna Fiestas de Las Torres 2026</span>');

    });

});
