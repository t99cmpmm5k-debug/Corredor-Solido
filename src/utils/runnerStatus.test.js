import { describe, it, expect } from "vitest";
import { buildRunnerStatusIndicators } from "./runnerStatus.js";

const REFERENCE = new Date(2026, 8, 10); // jueves 10 sept 2026

const UNAVAILABLE_ACWR = { available: false, reason: "insufficient-history", daysOfHistory: 10, missingDays: 18 };
const UNAVAILABLE_Z2 = { available: false, count: 1 };
const NO_PLAN = { hasPlan: false, sessionsPlanned: 0, sessionsCompleted: 0, plannedKm: 0, actualKm: 0, kmPercent: null };

function acwr(ratio, zoneId, barLabel) {
    return { available: true, ratio, zone: { id: zoneId, barLabel, badgeLabel: `Carga ${barLabel.toLowerCase()}` } };
}

function z2(firstPace, lastPace) {
    return {
        available: true,
        count: 5,
        first: { date: "2026-08-01", avgPaceSecPerKm: firstPace, avgHr: null },
        last: { date: "2026-09-08", avgPaceSecPerKm: lastPace, avgHr: null }
    };
}

function planCompliance(kmPercent) {
    return { hasPlan: true, sessionsPlanned: 3, sessionsCompleted: 2, plannedKm: 20, actualKm: 15, kmPercent };
}

describe("buildRunnerStatusIndicators", () => {

    it("con las 4 fuentes disponibles, devuelve los 4 indicadores en orden", () => {

        const result = buildRunnerStatusIndicators({
            acwrInsight: acwr(1.1, "optimal", "Óptima"),
            z2Evolution: z2(353, 342), // 5:53/km -> 5:42/km, mejora de 11s/km
            planCompliance: planCompliance(77),
            upcomingRaces: [{ id: "r1", date: "2026-09-22", isGoal: false }]
        }, REFERENCE);

        expect(result.map(i => i.key)).toEqual(["acwr", "z2", "week", "race"]);
        expect(result.find(i => i.key === "acwr").value).toBe("Óptima");
        expect(result.find(i => i.key === "z2").value).toBe("-11s/km");
        expect(result.find(i => i.key === "week").value).toBe("77%");
        expect(result.find(i => i.key === "race").value).toBe("12 días");

    });

    it("sin ninguna fuente disponible, devuelve un array vacío", () => {

        const result = buildRunnerStatusIndicators({
            acwrInsight: UNAVAILABLE_ACWR,
            z2Evolution: UNAVAILABLE_Z2,
            planCompliance: NO_PLAN,
            upcomingRaces: []
        }, REFERENCE);

        expect(result).toEqual([]);

    });

    it("con solo ACWR y la carrera disponibles, omite z2 y semana sin romper nada", () => {

        const result = buildRunnerStatusIndicators({
            acwrInsight: acwr(0.9, "optimal", "Óptima"),
            z2Evolution: UNAVAILABLE_Z2,
            planCompliance: NO_PLAN,
            upcomingRaces: [{ id: "r1", date: "2026-09-11", isGoal: false }]
        }, REFERENCE);

        expect(result.map(i => i.key)).toEqual(["acwr", "race"]);
        expect(result.find(i => i.key === "race").value).toBe("Mañana");

    });

    it("con plan pero sin ningún km objetivo (kmPercent null), omite el indicador de semana", () => {

        const result = buildRunnerStatusIndicators({
            acwrInsight: UNAVAILABLE_ACWR,
            z2Evolution: UNAVAILABLE_Z2,
            planCompliance: planCompliance(null),
            upcomingRaces: []
        }, REFERENCE);

        expect(result).toEqual([]);

    });

    it("prioriza la carrera marcada como objetivo sobre la más próxima por fecha, igual que NextGoalWidget", () => {

        const result = buildRunnerStatusIndicators({
            acwrInsight: UNAVAILABLE_ACWR,
            z2Evolution: UNAVAILABLE_Z2,
            planCompliance: NO_PLAN,
            upcomingRaces: [
                { id: "r1", date: "2026-09-11", isGoal: false },
                { id: "r2", date: "2026-10-01", isGoal: true }
            ]
        }, REFERENCE);

        expect(result).toHaveLength(1);
        expect(result[0].key).toBe("race");
        expect(result[0].value).toBe("21 días");

    });

    it("carrera hoy mismo se etiqueta 'Hoy', nunca '0 días'", () => {

        const result = buildRunnerStatusIndicators({
            acwrInsight: UNAVAILABLE_ACWR,
            z2Evolution: UNAVAILABLE_Z2,
            planCompliance: NO_PLAN,
            upcomingRaces: [{ id: "r1", date: "2026-09-10", isGoal: false }]
        }, REFERENCE);

        expect(result[0].value).toBe("Hoy");

    });

});
