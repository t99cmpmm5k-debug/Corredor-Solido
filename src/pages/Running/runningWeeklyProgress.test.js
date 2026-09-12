import { describe, it, expect } from "vitest";
import { buildWeeklyProgress } from "./runningWeeklyProgress.js";

function workout(id, date, distanceKm, avgPaceSecPerKm = null) {
    return { id, date, distanceKm, avgPaceSecPerKm };
}

// Jueves -- semana actual lunes-domingo es 2026-08-31..2026-09-06.
const REFERENCE_DATE = new Date(2026, 8, 3);

describe("buildWeeklyProgress", () => {

    it("sin entrenos, o con menos de 2 semanas con datos, no disponible", () => {

        expect(buildWeeklyProgress([], REFERENCE_DATE)).toEqual({ available: false, weeksWithData: 0 });

        const onlyThisWeek = [workout("w1", "2026-09-02", 10)];
        expect(buildWeeklyProgress(onlyThisWeek, REFERENCE_DATE)).toEqual({ available: false, weeksWithData: 1 });

    });

    it("con datos en 2+ semanas, disponible con las 4 semanas siempre presentes", () => {

        const workouts = [
            workout("w1", "2026-08-11", 10, 330), // hace 3 semanas
            workout("w2", "2026-09-02", 8, 300)   // semana actual
        ];

        const result = buildWeeklyProgress(workouts, REFERENCE_DATE);

        expect(result.available).toBe(true);
        expect(result.weeks).toHaveLength(4);
        expect(result.weeks.map(w => w.weekStart)).toEqual([
            "2026-08-10", "2026-08-17", "2026-08-24", "2026-08-31"
        ]);

    });

    it("una semana sin entrenos dentro del rango se representa con 0 km, no se omite", () => {

        const workouts = [
            workout("w1", "2026-08-11", 10, 330), // semana del 10 ago
            // semana del 17 ago: sin entrenos
            workout("w2", "2026-08-25", 12, 320), // semana del 24 ago
            workout("w3", "2026-09-02", 8, 300)   // semana actual
        ];

        const result = buildWeeklyProgress(workouts, REFERENCE_DATE);

        const emptyWeek = result.weeks.find(w => w.weekStart === "2026-08-17");
        expect(emptyWeek.totalKm).toBe(0);
        expect(emptyWeek.avgPaceSecPerKm).toBeNull();
        expect(emptyWeek.hasWorkouts).toBe(false);

    });

    it("suma km reales y pondera el ritmo medio por distancia (no media simple)", () => {

        const workouts = [
            workout("w0", "2026-08-11", 10, 330), // otra semana con datos, para que el conjunto sea "disponible"
            workout("w1", "2026-08-31", 5, 300),  // 5km a 5:00/km
            workout("w2", "2026-09-02", 20, 360)  // 20km a 6:00/km
        ];

        const result = buildWeeklyProgress(workouts, REFERENCE_DATE);
        const thisWeek = result.weeks.find(w => w.weekStart === "2026-08-31");

        expect(thisWeek.totalKm).toBe(25);
        // (5*300 + 20*360) / 25 = 348
        expect(thisWeek.avgPaceSecPerKm).toBe(348);

    });

    it("ignora entrenos sin ritmo real al calcular el ritmo medio de la semana, pero sí suman al km", () => {

        const workouts = [
            workout("w0", "2026-08-11", 10, 330), // otra semana con datos, para que el conjunto sea "disponible"
            workout("w1", "2026-08-31", 5, null),
            workout("w2", "2026-09-02", 10, 330)
        ];

        const result = buildWeeklyProgress(workouts, REFERENCE_DATE);
        const thisWeek = result.weeks.find(w => w.weekStart === "2026-08-31");

        expect(thisWeek.totalKm).toBe(15);
        expect(thisWeek.avgPaceSecPerKm).toBe(330);

    });

});
