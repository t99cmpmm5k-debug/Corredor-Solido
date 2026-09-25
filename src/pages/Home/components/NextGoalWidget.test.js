import { describe, it, expect, vi, afterEach } from "vitest";
import { NextGoalWidget } from "./NextGoalWidget.js";
import { getUpcomingPlannedRaces } from "../../../data/workoutStore.js";

vi.mock("../../../data/workoutStore.js", () => ({
    getUpcomingPlannedRaces: vi.fn()
}));

const REFERENCE = new Date(2026, 7, 26); // 26 agosto 2026

describe("NextGoalWidget -- 'TU PRÓXIMO OBJETIVO' (rediseño de Inicio, 2026-09-25)", () => {

    afterEach(() => {
        vi.mocked(getUpcomingPlannedRaces).mockReset();
    });

    it("sin ninguna carrera próxima real, no renderiza nada", () => {

        vi.mocked(getUpcomingPlannedRaces).mockReturnValue([]);

        expect(NextGoalWidget(REFERENCE)).toBe("");

    });

    // El cambio central de este rediseño: una carrera del calendario
    // general (ni Inscrito ni Objetivo, solo "Siguiendo" -- las dos
    // banderas en false) YA NO cae aquí como fallback. Antes
    // upcoming[0] la mostraba igual; ahora el widget desaparece del todo.
    it("una carrera próxima sin isRegistered ni isGoal (solo 'Siguiendo') NO aparece -- el widget desaparece", () => {

        vi.mocked(getUpcomingPlannedRaces).mockReturnValue([
            { id: "r1", name: "10K Murcia", date: "2026-09-22" }
        ]);

        expect(NextGoalWidget(REFERENCE)).toBe("");

    });

    it("título 'TU PRÓXIMO OBJETIVO' con una carrera marcada Objetivo", () => {

        vi.mocked(getUpcomingPlannedRaces).mockReturnValue([
            { id: "r1", name: "10K Murcia", date: "2026-09-22", isGoal: true }
        ]);

        const html = NextGoalWidget(REFERENCE);

        expect(html).toContain("TU PRÓXIMO OBJETIVO");
        expect(html).not.toContain("PRÓXIMAS CARRERAS");
        expect(html).toContain("next-goal-more-hint");

    });

    it("carrera marcada Inscrito muestra el badge INSCRITO", () => {

        vi.mocked(getUpcomingPlannedRaces).mockReturnValue([
            { id: "r1", name: "10K Murcia", date: "2026-09-22", isRegistered: true }
        ]);

        const html = NextGoalWidget(REFERENCE);

        expect(html).toContain("INSCRITO");
        expect(html).not.toContain(">OBJETIVO<");

    });

    it("carrera marcada solo Objetivo (no inscrita) muestra el badge OBJETIVO", () => {

        vi.mocked(getUpcomingPlannedRaces).mockReturnValue([
            { id: "r1", name: "10K Murcia", date: "2026-09-22", isGoal: true }
        ]);

        const html = NextGoalWidget(REFERENCE);

        expect(html).toContain(">OBJETIVO<");
        expect(html).not.toContain(">INSCRITO<");

    });

    // Prioridad: Inscrito más próxima gana a Objetivo más próxima, aunque
    // el Objetivo sea temporalmente anterior.
    it("con una Inscrito y una Objetivo, prioriza la Inscrito aunque sea más lejana en fecha", () => {

        vi.mocked(getUpcomingPlannedRaces).mockReturnValue([
            { id: "r1", name: "Objetivo cercano", date: "2026-09-01", isGoal: true },
            { id: "r2", name: "Inscrita lejana", date: "2026-10-15", isRegistered: true }
        ]);

        const html = NextGoalWidget(REFERENCE);

        expect(html).toContain("Inscrita lejana");
        expect(html).not.toContain("Objetivo cercano");

    });

    it("con varias Inscrito, muestra la más próxima por fecha", () => {

        vi.mocked(getUpcomingPlannedRaces).mockReturnValue([
            { id: "r1", name: "Inscrita cercana", date: "2026-09-01", isRegistered: true },
            { id: "r2", name: "Inscrita lejana", date: "2026-10-15", isRegistered: true }
        ]);

        const html = NextGoalWidget(REFERENCE);

        expect(html).toContain("Inscrita cercana");
        expect(html).not.toContain("Inscrita lejana");

    });

    it("nombre, distancia real y fecha, sin ubicación ni superficie", () => {

        vi.mocked(getUpcomingPlannedRaces).mockReturnValue([
            { id: "r1", name: "Carrera Popular", date: "2026-09-22", distanceKm: 10, location: "Águilas", isGoal: true }
        ]);

        const html = NextGoalWidget(REFERENCE);

        expect(html).toContain("Carrera Popular");
        expect(html).toContain("10,00 km");
        expect(html).toContain("22 SEPT");
        expect(html).not.toContain("Águilas"); // la ubicación ya no se muestra

    });

    it("sin distanceKm, la línea de meta solo trae la fecha (sin inventar ni disciplina ni ubicación)", () => {

        vi.mocked(getUpcomingPlannedRaces).mockReturnValue([
            { id: "r1", name: "Carrera Nocturna", date: "2026-09-22", type: "RU", location: "Las Torres", isGoal: true }
        ]);

        const html = NextGoalWidget(REFERENCE);

        expect(html).not.toContain("Asfalto");
        expect(html).not.toContain("Las Torres");
        expect(html).toContain("22 SEPT");

    });

    it("cuenta atrás real: 'Faltan N días' para una carrera lejana", () => {

        vi.mocked(getUpcomingPlannedRaces).mockReturnValue([
            { id: "r1", name: "10K Murcia", date: "2026-09-18", isGoal: true } // 23 días desde el 26 ago
        ]);

        const html = NextGoalWidget(REFERENCE);

        expect(html).toContain("Faltan 23 días");

    });

    it("cuenta atrás para mañana: 'Falta 1 día'", () => {

        vi.mocked(getUpcomingPlannedRaces).mockReturnValue([
            { id: "r1", name: "10K Murcia", date: "2026-08-27", isGoal: true }
        ]);

        const html = NextGoalWidget(REFERENCE);

        expect(html).toContain("Falta 1 día");

    });

    it("cuenta atrás para hoy: 'Es hoy'", () => {

        vi.mocked(getUpcomingPlannedRaces).mockReturnValue([
            { id: "r1", name: "10K Murcia", date: "2026-08-26", isGoal: true }
        ]);

        const html = NextGoalWidget(REFERENCE);

        expect(html).toContain("Es hoy");

    });

    it("una carrera sin nombre usa 'Carrera' como fallback", () => {

        vi.mocked(getUpcomingPlannedRaces).mockReturnValue([
            { id: "r1", date: "2026-08-30", isGoal: true }
        ]);

        const html = NextGoalWidget(REFERENCE);
        expect(html).toContain("Carrera");

    });

    it("toda la tarjeta lleva data-action/data-race-id para abrir el detalle real de esa carrera", () => {

        vi.mocked(getUpcomingPlannedRaces).mockReturnValue([
            { id: "r42", name: "10K Murcia", date: "2026-09-22", isGoal: true }
        ]);

        const html = NextGoalWidget(REFERENCE);

        expect(html).toContain('data-action="open-goal-race"');
        expect(html).toContain('data-race-id="r42"');

    });

    it("un nombre de carrera largo real sigue en el mismo <span> (el recorte a 2 líneas/elipsis es cosa del CSS)", () => {

        vi.mocked(getUpcomingPlannedRaces).mockReturnValue([
            { id: "r1", name: "30ª Carrera Nocturna Fiestas de Las Torres 2026", date: "2026-08-26", isGoal: true }
        ]);

        const html = NextGoalWidget(REFERENCE);

        expect(html).toContain('<span class="next-goal-name">30ª Carrera Nocturna Fiestas de Las Torres 2026</span>');

    });

});
