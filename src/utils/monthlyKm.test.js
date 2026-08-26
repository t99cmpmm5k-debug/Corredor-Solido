import { describe, it, expect } from "vitest";
import { buildMonthlyKmStats } from "./monthlyKm.js";

const REFERENCE = new Date(2026, 7, 26); // 26 agosto 2026

function workout(date, distanceKm) {
    return { date, distanceKm };
}

describe("buildMonthlyKmStats", () => {

    it("sin ningún entreno, el mes actual es 0 y no hay comparación ni gráfico", () => {

        const stats = buildMonthlyKmStats([], REFERENCE);

        expect(stats.currentMonthKey).toBe("2026-08");
        expect(stats.currentMonthKm).toBe(0);
        expect(stats.currentMonthCount).toBe(0);
        expect(stats.comparisonPercent).toBeNull();
        expect(stats.chartMonths).toBeNull();

    });

    it("currentMonthCount cuenta los entrenos reales del mes en curso, con o sin historial suficiente para gráfico", () => {

        const withoutHistory = buildMonthlyKmStats([
            workout("2026-08-05", 10),
            workout("2026-08-12", 8)
        ], REFERENCE);
        expect(withoutHistory.currentMonthCount).toBe(2);
        expect(withoutHistory.chartMonths).toBeNull();

        const withHistory = buildMonthlyKmStats([
            workout("2026-07-01", 50),
            workout("2026-08-01", 20),
            workout("2026-08-10", 36)
        ], REFERENCE);
        expect(withHistory.currentMonthCount).toBe(2);
        expect(withHistory.chartMonths).not.toBeNull();

    });

    it("con menos de 2 meses distintos de historial (usuario nuevo), no hay comparación ni gráfico aunque el mes actual sí tenga km reales", () => {

        const workouts = [
            workout("2026-08-05", 10),
            workout("2026-08-12", 8)
        ];

        const stats = buildMonthlyKmStats(workouts, REFERENCE);

        expect(stats.currentMonthKm).toBe(18);
        expect(stats.comparisonPercent).toBeNull();
        expect(stats.chartMonths).toBeNull();

    });

    it("con el mes anterior inmediato con datos, calcula el % de variación real", () => {

        const workouts = [
            workout("2026-07-01", 50), // julio: 50 km
            workout("2026-08-01", 56)  // agosto: 56 km -- +12%
        ];

        const stats = buildMonthlyKmStats(workouts, REFERENCE);

        expect(stats.currentMonthKm).toBe(56);
        expect(stats.comparisonPercent).toBe(12);

    });

    it("una bajada frente al mes anterior da un porcentaje negativo", () => {

        const workouts = [
            workout("2026-07-01", 100),
            workout("2026-08-01", 80) // -20%
        ];

        const stats = buildMonthlyKmStats(workouts, REFERENCE);

        expect(stats.comparisonPercent).toBe(-20);

    });

    it("sin ningún entreno en el mes anterior INMEDIATO (aunque haya historial más atrás), no inventa una comparación", () => {

        const workouts = [
            workout("2026-04-01", 40), // abril -- hay historial (2 meses distintos)
            workout("2026-08-01", 60)  // agosto, mes actual
        ];

        const stats = buildMonthlyKmStats(workouts, REFERENCE);

        // Historial suficiente (2 meses distintos) -> sí hay gráfico...
        expect(stats.chartMonths).not.toBeNull();
        // ...pero julio (el mes anterior inmediato) no tiene ningún dato,
        // así que la comparación se omite en vez de comparar contra 0.
        expect(stats.comparisonPercent).toBeNull();

    });

    it("el gráfico cubre los últimos 6 meses (actual incluido), con 0 real en los que no tuvieron ningún entreno", () => {

        const workouts = [
            workout("2026-03-15", 30),
            workout("2026-08-10", 40)
        ];

        const stats = buildMonthlyKmStats(workouts, REFERENCE);

        expect(stats.chartMonths.map(m => m.key)).toEqual([
            "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08"
        ]);

        expect(stats.chartMonths.find(m => m.key === "2026-03").km).toBe(30);
        expect(stats.chartMonths.find(m => m.key === "2026-04").km).toBe(0);
        expect(stats.chartMonths.find(m => m.key === "2026-08").km).toBe(40);

    });

    it("marca isCurrent solo en el mes en curso", () => {

        const workouts = [workout("2026-07-01", 10), workout("2026-08-01", 10)];
        const stats = buildMonthlyKmStats(workouts, REFERENCE);

        const flagged = stats.chartMonths.filter(m => m.isCurrent);
        expect(flagged).toHaveLength(1);
        expect(flagged[0].key).toBe("2026-08");

    });

    it("suma varios entrenos del mismo mes", () => {

        const workouts = [
            workout("2026-08-01", 10),
            workout("2026-08-15", 5.5),
            workout("2026-08-20", 4.5)
        ];

        const stats = buildMonthlyKmStats(workouts, REFERENCE);
        expect(stats.currentMonthKm).toBe(20);

    });

    it("un entreno sin distanceKm no rompe la suma (cuenta como 0, no NaN)", () => {

        const workouts = [
            workout("2026-08-01", null),
            workout("2026-08-02", 10)
        ];

        const stats = buildMonthlyKmStats(workouts, REFERENCE);
        expect(stats.currentMonthKm).toBe(10);

    });

    // Gráfico interactivo (fase 3, 2026-08-26): al tocar una barra hace
    // falta también el nº de entrenos reales de ese mes, no solo los km.
    describe("count por mes (detalle interactivo del gráfico)", () => {

        it("cuenta los entrenos reales de cada mes, junto al km ya existente", () => {

            const workouts = [
                workout("2026-07-01", 20),
                workout("2026-07-15", 15),
                workout("2026-08-01", 40)
            ];

            const stats = buildMonthlyKmStats(workouts, REFERENCE);

            expect(stats.chartMonths.find(m => m.key === "2026-07")).toMatchObject({ km: 35, count: 2 });
            expect(stats.chartMonths.find(m => m.key === "2026-08")).toMatchObject({ km: 40, count: 1 });

        });

        it("un mes sin ningún entreno tiene count 0, no inventado", () => {

            const workouts = [workout("2026-03-01", 10), workout("2026-08-01", 10)];
            const stats = buildMonthlyKmStats(workouts, REFERENCE);

            expect(stats.chartMonths.find(m => m.key === "2026-04").count).toBe(0);

        });

        it("un entreno sin distanceKm SÍ cuenta como entreno real, aunque no sume km", () => {

            const workouts = [
                workout("2026-07-01", null),
                workout("2026-08-01", 10)
            ];

            const stats = buildMonthlyKmStats(workouts, REFERENCE);

            expect(stats.chartMonths.find(m => m.key === "2026-07")).toMatchObject({ km: 0, count: 1 });

        });

    });

});
