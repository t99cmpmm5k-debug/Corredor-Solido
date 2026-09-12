import { describe, it, expect } from "vitest";
import { buildPlanCompliance } from "./planCompliance.js";

// Lunes 7 sept 2026 -- domingo 13 sept 2026 es la semana ISO de esta
// fecha (ver getWeekStartDate() en utils/date.js).
const REFERENCE = new Date(2026, 8, 10); // jueves 10 sept 2026

function session(overrides) {
    return { id: "s1", date: "2026-09-08", type: "z2", status: "pending", volume: 0, ...overrides };
}

function workout(date, distanceKm) {
    return { date, distanceKm };
}

describe("buildPlanCompliance", () => {

    it("sin ninguna sesión de running planificada esta semana, hasPlan es false y no calcula nada", () => {

        const result = buildPlanCompliance([], [], REFERENCE);

        expect(result.hasPlan).toBe(false);
        expect(result.sessionsPlanned).toBe(0);
        expect(result.kmPercent).toBeNull();

    });

    it("con solo sesiones de gimnasio (type strength), hasPlan sigue siendo false -- gimnasio no cuenta", () => {

        const week = [
            session({ id: "g1", type: "strength", status: "completed", volume: 0 })
        ];

        const result = buildPlanCompliance(week, [], REFERENCE);

        expect(result.hasPlan).toBe(false);

    });

    it("cuenta sesiones planificadas/completadas y suma km planificado vs. realizado", () => {

        const week = [
            session({ id: "s1", date: "2026-09-08", status: "completed", volume: 8 }),
            session({ id: "s2", date: "2026-09-10", status: "completed", volume: 6 }),
            session({ id: "s3", date: "2026-09-12", status: "upcoming", volume: 8 })
        ];

        const workouts = [
            workout("2026-09-08", 8.2), // enlazado a s1, distancia real algo distinta
            workout("2026-09-10", 5.9), // enlazado a s2
            workout("2026-09-09", 3)    // carrera suelta, sin sesión planificada -- cuenta igual
        ];

        const result = buildPlanCompliance(week, workouts, REFERENCE);

        expect(result.hasPlan).toBe(true);
        expect(result.sessionsPlanned).toBe(3);
        expect(result.sessionsCompleted).toBe(2);
        expect(result.plannedKm).toBe(22);
        expect(result.actualKm).toBeCloseTo(17.1);
        expect(result.kmPercent).toBe(Math.round((17.1 / 22) * 100));

    });

    it("excluye del cálculo las sesiones de gimnasio (type strength) mezcladas con running real", () => {

        const week = [
            session({ id: "run", date: "2026-09-08", status: "completed", volume: 10 }),
            session({ id: "gym", date: "2026-09-09", type: "strength", status: "completed", volume: 0 })
        ];

        const result = buildPlanCompliance(week, [workout("2026-09-08", 10)], REFERENCE);

        expect(result.sessionsPlanned).toBe(1);
        expect(result.sessionsCompleted).toBe(1);
        expect(result.plannedKm).toBe(10);

    });

    it("solo cuenta entrenos reales dentro del rango lunes-domingo de esta semana, no de otras semanas", () => {

        const week = [session({ id: "s1", date: "2026-09-08", status: "completed", volume: 8 })];

        const workouts = [
            workout("2026-09-08", 8),
            workout("2026-09-06", 12), // domingo de la semana ANTERIOR -- no cuenta
            workout("2026-09-14", 5)   // lunes de la semana SIGUIENTE -- no cuenta
        ];

        const result = buildPlanCompliance(week, workouts, REFERENCE);

        expect(result.actualKm).toBe(8);

    });

    it("con sesiones planificadas pero ningún km objetivo (p. ej. solo series sin distancia), kmPercent es null, nunca una división por cero", () => {

        const week = [session({ id: "s1", date: "2026-09-08", type: "intervals", status: "pending", volume: 0 })];

        const result = buildPlanCompliance(week, [], REFERENCE);

        expect(result.hasPlan).toBe(true);
        expect(result.plannedKm).toBe(0);
        expect(result.kmPercent).toBeNull();

    });

});
