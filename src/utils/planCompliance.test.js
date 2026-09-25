import { describe, it, expect } from "vitest";
import { buildPlanCompliance, classifyPlanOverage, PLAN_OVER_TARGET_MODERATE_MAX_PERCENT } from "./planCompliance.js";

function session(overrides) {
    return { id: "s1", date: "2026-09-08", type: "z2", status: "pending", volume: 0, ...overrides };
}

describe("buildPlanCompliance", () => {

    it("sin ninguna sesión de running planificada esta semana, hasPlan es false y no calcula nada", () => {

        const result = buildPlanCompliance([]);

        expect(result.hasPlan).toBe(false);
        expect(result.sessionsPlanned).toBe(0);
        expect(result.kmPercent).toBeNull();

    });

    it("con solo sesiones de gimnasio (type strength), hasPlan sigue siendo false -- gimnasio no cuenta", () => {

        const week = [
            session({ id: "g1", type: "strength", status: "completed", volume: 0 })
        ];

        const result = buildPlanCompliance(week);

        expect(result.hasPlan).toBe(false);

    });

    // Fuente única (rediseño de Inicio, 2026-09-25): actualKm sale SOLO de
    // sesiones del plan completadas/enlazadas -- mismo volume ya derivado
    // por withDerivedFields() (workoutStore.js), nunca de un rango de
    // fechas sobre workouts sueltos. Antes esto podía dar un km
    // "realizado" mayor que getWeekVolume().completed para la misma
    // semana (bug real: 8 km en un sitio, 12,3 km en otro) -- ahora, con
    // la misma entrada (weekSessions), los dos coinciden siempre.
    it("cuenta sesiones planificadas/completadas y suma el volume YA derivado de las sesiones completadas, no de workouts sueltos", () => {

        const week = [
            session({ id: "s1", date: "2026-09-08", status: "completed", volume: 8.2 }),
            session({ id: "s2", date: "2026-09-10", status: "completed", volume: 5.9 }),
            session({ id: "s3", date: "2026-09-12", status: "upcoming", volume: 8 })
        ];

        const result = buildPlanCompliance(week);

        expect(result.hasPlan).toBe(true);
        expect(result.sessionsPlanned).toBe(3);
        expect(result.sessionsCompleted).toBe(2);
        expect(result.plannedKm).toBe(22.1);
        expect(result.actualKm).toBeCloseTo(14.1);
        expect(result.kmPercent).toBe(Math.round((14.1 / 22.1) * 100));

    });

    // Una carrera real suelta, sin sesión planificada enlazada, sigue
    // corriéndose y viéndose entera en Running -- pero no debe alterar
    // este % (a diferencia del bug anterior, que la sumaba aquí también).
    it("una actividad real NO enlazada a ninguna sesión del plan no altera el % de cumplimiento", () => {

        const week = [
            session({ id: "s1", date: "2026-09-08", status: "completed", volume: 8 })
        ];

        const result = buildPlanCompliance(week);

        // Sin workouts sueltos de por medio en absoluto -- el resultado
        // depende solo de weekSessions, ni siquiera necesita el parámetro.
        expect(result.actualKm).toBe(8);
        expect(result.kmPercent).toBe(100);

    });

    it("excluye del cálculo las sesiones de gimnasio (type strength) mezcladas con running real", () => {

        const week = [
            session({ id: "run", date: "2026-09-08", status: "completed", volume: 10 }),
            session({ id: "gym", date: "2026-09-09", type: "strength", status: "completed", volume: 0 })
        ];

        const result = buildPlanCompliance(week);

        expect(result.sessionsPlanned).toBe(1);
        expect(result.sessionsCompleted).toBe(1);
        expect(result.plannedKm).toBe(10);
        expect(result.actualKm).toBe(10);

    });

    it("con sesiones planificadas pero ningún km objetivo (p. ej. solo series sin distancia), kmPercent es null, nunca una división por cero", () => {

        const week = [session({ id: "s1", date: "2026-09-08", type: "intervals", status: "pending", volume: 0 })];

        const result = buildPlanCompliance(week);

        expect(result.hasPlan).toBe(true);
        expect(result.plannedKm).toBe(0);
        expect(result.kmPercent).toBeNull();

    });

});

// Distinguir cumplimiento de carga (Capa 3, punto 4 del documento de
// mejoras): cumplir de más no es automáticamente "mejor" cuanto más alto
// sea el %, mismo criterio que ya se aplica en ACWR -- nunca un veredicto
// de "bueno"/"malo", solo clasifica el dato real.
describe("classifyPlanOverage", () => {

    it("sin exceso (kmPercent nulo o <=100%), no hay nada que clasificar", () => {

        expect(classifyPlanOverage(null)).toBeNull();
        expect(classifyPlanOverage(0)).toBeNull();
        expect(classifyPlanOverage(77)).toBeNull();
        expect(classifyPlanOverage(100)).toBeNull();

    });

    it(`exceso moderado hasta ${PLAN_OVER_TARGET_MODERATE_MAX_PERCENT}% inclusive`, () => {

        expect(classifyPlanOverage(101)).toBe("moderate");
        expect(classifyPlanOverage(114)).toBe("moderate");
        expect(classifyPlanOverage(PLAN_OVER_TARGET_MODERATE_MAX_PERCENT)).toBe("moderate");

    });

    it(`exceso alto por encima de ${PLAN_OVER_TARGET_MODERATE_MAX_PERCENT}%`, () => {

        expect(classifyPlanOverage(PLAN_OVER_TARGET_MODERATE_MAX_PERCENT + 1)).toBe("high");
        expect(classifyPlanOverage(145)).toBe("high");

    });

});
