import { describe, it, expect } from "vitest";
import { buildRunnerStatusIndicators, buildRunnerStatusSummary } from "./runnerStatus.js";

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

describe("buildRunnerStatusSummary -- frase-resumen priorizada (Capa 3)", () => {

    it("sin ninguna fuente disponible, no hay frase (null)", () => {

        const result = buildRunnerStatusSummary({
            acwrInsight: UNAVAILABLE_ACWR,
            z2Evolution: UNAVAILABLE_Z2,
            planCompliance: NO_PLAN,
            upcomingRaces: []
        }, REFERENCE);

        expect(result).toBeNull();

    });

    it("regla (a): carrera a <=3 días gana SIEMPRE, aunque el resto de reglas también aplicarían", () => {

        const result = buildRunnerStatusSummary({
            acwrInsight: acwr(1.8, "highRisk", "Muy alta"), // también aplicaría la regla (b)
            z2Evolution: z2(353, 342),
            planCompliance: planCompliance(100), // también aplicaría la (c)
            upcomingRaces: [{ id: "r1", date: "2026-09-12", isGoal: false }] // 2 días vista
        }, REFERENCE);

        expect(result).toBe("Carrera en 2 días — llega descansado.");

    });

    it("carrera hoy y mañana usan 'hoy'/'mañana', no '0 días'/'1 días'", () => {

        expect(buildRunnerStatusSummary({
            acwrInsight: UNAVAILABLE_ACWR, z2Evolution: UNAVAILABLE_Z2, planCompliance: NO_PLAN,
            upcomingRaces: [{ id: "r1", date: "2026-09-10", isGoal: false }]
        }, REFERENCE)).toBe("Carrera hoy — llega descansado.");

        expect(buildRunnerStatusSummary({
            acwrInsight: UNAVAILABLE_ACWR, z2Evolution: UNAVAILABLE_Z2, planCompliance: NO_PLAN,
            upcomingRaces: [{ id: "r1", date: "2026-09-11", isGoal: false }]
        }, REFERENCE)).toBe("Carrera mañana — llega descansado.");

    });

    it("una carrera a más de 3 días NO dispara la regla (a) -- cae a la siguiente que aplique", () => {

        const result = buildRunnerStatusSummary({
            acwrInsight: acwr(1.6, "highRisk", "Muy alta"),
            z2Evolution: UNAVAILABLE_Z2,
            planCompliance: NO_PLAN,
            upcomingRaces: [{ id: "r1", date: "2026-09-14", isGoal: false }] // 4 días vista
        }, REFERENCE);

        expect(result).toBe("Carga muy alta esta semana — prioriza el descanso.");

    });

    it("regla (b): carga alta/muy alta, con vocabulario sin alarmismo ('carga', nunca 'riesgo')", () => {

        const moderate = buildRunnerStatusSummary({
            acwrInsight: acwr(1.4, "moderateRisk", "Alta"),
            z2Evolution: UNAVAILABLE_Z2, planCompliance: NO_PLAN, upcomingRaces: []
        }, REFERENCE);

        expect(moderate).toBe("Carga alta esta semana — no fuerces más de la cuenta.");
        expect(moderate).not.toMatch(/riesgo/i);

        const high = buildRunnerStatusSummary({
            acwrInsight: acwr(1.8, "highRisk", "Muy alta"),
            z2Evolution: UNAVAILABLE_Z2, planCompliance: NO_PLAN, upcomingRaces: []
        }, REFERENCE);

        expect(high).toBe("Carga muy alta esta semana — prioriza el descanso.");
        expect(high).not.toMatch(/riesgo/i);

    });

    it("carga óptima/baja NO dispara la regla (b) -- cae a la siguiente que aplique", () => {

        const result = buildRunnerStatusSummary({
            acwrInsight: acwr(1.1, "optimal", "Óptima"),
            z2Evolution: UNAVAILABLE_Z2,
            planCompliance: planCompliance(95),
            upcomingRaces: []
        }, REFERENCE);

        expect(result).toBe("Casi completas la semana — buen ritmo de trabajo.");

    });

    it("regla (c): semana completada (100%, sin exceso) frente a casi completada (90-99%)", () => {

        expect(buildRunnerStatusSummary({
            acwrInsight: acwr(1.1, "optimal", "Óptima"), z2Evolution: UNAVAILABLE_Z2,
            planCompliance: planCompliance(100), upcomingRaces: []
        }, REFERENCE)).toBe("Semana completada. Buen ritmo de trabajo.");

        expect(buildRunnerStatusSummary({
            acwrInsight: acwr(1.1, "optimal", "Óptima"), z2Evolution: UNAVAILABLE_Z2,
            planCompliance: planCompliance(90), upcomingRaces: []
        }, REFERENCE)).toBe("Casi completas la semana — buen ritmo de trabajo.");

    });

    // Distinguir cumplimiento de carga (Capa 3, punto 4): cumplir de más NO
    // es automáticamente "mejor" cuanto más alto sea el % -- mismo criterio
    // que ACWR, mismo umbral que PlanComplianceWidget.js
    // (classifyPlanOverage(), utils/planCompliance.js).
    it("regla (c): exceso MODERADO (hasta 120%) sigue siendo refuerzo positivo, exceso ALTO (>120%) pasa a frase informativa sin veredicto", () => {

        expect(buildRunnerStatusSummary({
            acwrInsight: acwr(1.1, "optimal", "Óptima"), z2Evolution: UNAVAILABLE_Z2,
            planCompliance: planCompliance(120), upcomingRaces: []
        }, REFERENCE)).toBe("Semana completada. Buen ritmo de trabajo.");

        expect(buildRunnerStatusSummary({
            acwrInsight: acwr(1.1, "optimal", "Óptima"), z2Evolution: UNAVAILABLE_Z2,
            planCompliance: planCompliance(145), upcomingRaces: []
        }, REFERENCE)).toBe("Volumen por encima de lo previsto esta semana.");

    });

    it("cumplimiento por debajo del 90% NO dispara la regla (c) -- cae a Z2", () => {

        const result = buildRunnerStatusSummary({
            acwrInsight: acwr(1.1, "optimal", "Óptima"),
            z2Evolution: z2(353, 342),
            planCompliance: planCompliance(77),
            upcomingRaces: []
        }, REFERENCE);

        expect(result).toBe("Tu Z2 mejora poco a poco últimamente.");

    });

    it("regla (d): evolución Z2 como dato de fondo -- mejora, empeora ligeramente, y sin cambios", () => {

        const faster = buildRunnerStatusSummary({
            acwrInsight: UNAVAILABLE_ACWR, z2Evolution: z2(353, 342), planCompliance: NO_PLAN, upcomingRaces: []
        }, REFERENCE);
        expect(faster).toBe("Tu Z2 mejora poco a poco últimamente.");

        const slower = buildRunnerStatusSummary({
            acwrInsight: UNAVAILABLE_ACWR, z2Evolution: z2(342, 353), planCompliance: NO_PLAN, upcomingRaces: []
        }, REFERENCE);
        expect(slower).toBe("Tu Z2 va algo más lento últimamente, nada que preocupe.");

        const stable = buildRunnerStatusSummary({
            acwrInsight: UNAVAILABLE_ACWR, z2Evolution: z2(350, 350), planCompliance: NO_PLAN, upcomingRaces: []
        }, REFERENCE);
        expect(stable).toBe("Tu Z2 se mantiene estable últimamente.");

    });

    it("escenario real con las 4 fuentes disponibles pero ninguna urgente: cae hasta Z2 (fondo)", () => {

        const result = buildRunnerStatusSummary({
            acwrInsight: acwr(1.1, "optimal", "Óptima"),
            z2Evolution: z2(353, 342),
            planCompliance: planCompliance(77),
            upcomingRaces: [{ id: "r1", date: "2026-09-22", isGoal: false }] // 12 días, no urgente
        }, REFERENCE);

        expect(result).toBe("Tu Z2 mejora poco a poco últimamente.");

    });

});
