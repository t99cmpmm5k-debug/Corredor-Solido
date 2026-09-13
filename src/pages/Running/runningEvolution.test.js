import { describe, it, expect } from "vitest";
import { buildZ2Evolution, buildTypeEvolution } from "./runningEvolution.js";

function workout(id, date, type, avgPaceSecPerKm, avgHr = null) {
    return { id, date, type, avgPaceSecPerKm, avgHr };
}

describe("buildZ2Evolution", () => {

    it("sin entrenos del tipo, o solo 1, no disponible (nada con qué comparar)", () => {

        expect(buildZ2Evolution([])).toEqual({ available: false, count: 0 });

        const oneWorkout = [workout("w1", "2026-08-01", "easy", 353)];
        expect(buildZ2Evolution(oneWorkout)).toEqual({ available: false, count: 1 });

    });

    it("ignora entrenos de otros tipos (Series, Tempo...) -- nunca los mezcla", () => {

        const workouts = [
            workout("w1", "2026-08-01", "series", 300),
            workout("w2", "2026-08-03", "easy", 353),
            workout("w3", "2026-08-05", "tempo", 280),
            workout("w4", "2026-08-07", "easy", 342)
        ];

        const result = buildZ2Evolution(workouts);

        expect(result.available).toBe(true);
        expect(result.count).toBe(2);
        expect(result.first.date).toBe("2026-08-03");
        expect(result.last.date).toBe("2026-08-07");

    });

    it("ignora entrenos de Rodaje (Z2) sin ritmo real -- no cuentan como parte de 'los últimos N'", () => {

        const workouts = [
            workout("w1", "2026-08-01", "easy", 360),
            { id: "w2", date: "2026-08-03", type: "easy", avgPaceSecPerKm: null, avgHr: 150 },
            workout("w3", "2026-08-05", "easy", 340)
        ];

        const result = buildZ2Evolution(workouts);

        expect(result.count).toBe(2);
        expect(result.first.date).toBe("2026-08-01");
        expect(result.last.date).toBe("2026-08-05");

    });

    it("con 5 o más, usa SOLO los últimos 5 por fecha, ordenados correctamente aunque lleguen desordenados", () => {

        const workouts = [
            workout("w6", "2026-08-13", "easy", 320),
            workout("w1", "2026-08-01", "easy", 353), // fuera de los últimos 5
            workout("w4", "2026-08-07", "easy", 340),
            workout("w2", "2026-08-03", "easy", 350), // fuera de los últimos 5
            workout("w5", "2026-08-09", "easy", 335),
            workout("w3", "2026-08-05", "easy", 345)
        ];

        const result = buildZ2Evolution(workouts);

        expect(result.available).toBe(true);
        expect(result.count).toBe(5);
        expect(result.groupSize).toBe(5);
        expect(result.first.date).toBe("2026-08-03");
        expect(result.last.date).toBe("2026-08-13");

    });

    it("calcula el delta de ritmo (primero - último, positivo = más rápido ahora) y de FC (último - primero)", () => {

        const workouts = [
            workout("w1", "2026-08-01", "easy", 353, 153), // 5:53/km
            workout("w2", "2026-08-08", "easy", 342, 147)  // 5:42/km
        ];

        const result = buildZ2Evolution(workouts);

        expect(result.paceDeltaSecPerKm).toBe(11); // 353 - 342
        expect(result.hrDeltaBpm).toBe(-6); // 147 - 153

    });

    it("hrDeltaBpm es null si a cualquiera de los dos extremos le falta FC real -- nunca inventado", () => {

        const workouts = [
            workout("w1", "2026-08-01", "easy", 353, null),
            workout("w2", "2026-08-08", "easy", 342, 147)
        ];

        const result = buildZ2Evolution(workouts);

        expect(result.hrDeltaBpm).toBeNull();
        expect(result.first.avgHr).toBeNull();
        expect(result.last.avgHr).toBe(147);

    });

});

describe("buildTypeEvolution -- motor generalizado (Series/Tempo, Capa 3), buildZ2Evolution es un alias del mismo", () => {

    it("buildZ2Evolution y buildTypeEvolution son literalmente la misma función", () => {

        expect(buildZ2Evolution).toBe(buildTypeEvolution);

    });

    it("Series con groupSize:3 -- usa SOLO los últimos 3, no los 5 de Z2", () => {

        const workouts = [
            workout("s1", "2026-08-01", "series", 330),
            workout("s2", "2026-08-05", "series", 325),
            workout("s3", "2026-08-09", "series", 320),
            workout("s4", "2026-08-13", "series", 315)
        ];

        const result = buildTypeEvolution(workouts, { type: "series", groupSize: 3 });

        expect(result.available).toBe(true);
        expect(result.count).toBe(3);
        expect(result.groupSize).toBe(3);
        expect(result.first.date).toBe("2026-08-05"); // s1 queda fuera de los últimos 3
        expect(result.last.date).toBe("2026-08-13");

    });

    it("Tempo con groupSize:3 y solo 2 reales -- disponible igual (mínimo sigue siendo 2, no 3)", () => {

        const workouts = [
            workout("t1", "2026-08-01", "tempo", 300),
            workout("t2", "2026-08-10", "tempo", 290)
        ];

        const result = buildTypeEvolution(workouts, { type: "tempo", groupSize: 3 });

        expect(result.available).toBe(true);
        expect(result.count).toBe(2);

    });

    it("Tempo con 1 solo entreno real -- no disponible, igual que Z2", () => {

        const workouts = [workout("t1", "2026-08-01", "tempo", 300)];
        const result = buildTypeEvolution(workouts, { type: "tempo", groupSize: 3 });

        expect(result).toEqual({ available: false, count: 1 });

    });

    it("distintos tipos no se mezclan entre sí -- Series no ve entrenos de Tempo ni de Z2", () => {

        const workouts = [
            workout("e1", "2026-08-01", "easy", 340),
            workout("t1", "2026-08-02", "tempo", 300),
            workout("s1", "2026-08-03", "series", 320),
            workout("s2", "2026-08-04", "series", 315)
        ];

        const seriesEvolution = buildTypeEvolution(workouts, { type: "series", groupSize: 3 });

        expect(seriesEvolution.count).toBe(2);
        expect(seriesEvolution.first.date).toBe("2026-08-03");
        expect(seriesEvolution.last.date).toBe("2026-08-04");

    });

});
