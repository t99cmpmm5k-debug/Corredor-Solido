import { describe, it, expect } from "vitest";
import { buildTypeProgressInsight, buildProgressMessage } from "./runningProgress.js";

// pace en seg/km, hr en ppm — solo los campos que usa buildTypeProgressInsight.
function w(date, avgPaceSecPerKm, avgHr, type = "easy") {
    return { date, avgPaceSecPerKm, avgHr, type };
}

describe("buildTypeProgressInsight", () => {

    it("devuelve null si no hay ningún entreno de ese tipo", () => {

        const workouts = [w("2026-01-01", 300, 140, "series")];
        expect(buildTypeProgressInsight(workouts, { type: "easy" })).toBeNull();

    });

    it("insufficient-data con menos de 6 entrenos del tipo", () => {

        const workouts = [
            w("2026-01-01", 300, 140),
            w("2026-01-03", 298, 140),
            w("2026-01-05", 296, 140)
        ];

        const result = buildTypeProgressInsight(workouts, { type: "easy" });
        expect(result.status).toBe("insufficient-data");
        expect(result.paceDeltaSecPerKm).toBeNull();

    });

    it("mejora limpia con FC estable (dentro de 3 ppm)", () => {

        const workouts = [
            w("2026-01-01", 320, 140),
            w("2026-01-03", 318, 141),
            w("2026-01-05", 316, 139),
            w("2026-01-08", 300, 140),
            w("2026-01-10", 298, 142),
            w("2026-01-12", 296, 138)
        ];

        // previous avg pace = 318, recent avg pace = 298 → delta = 20 (mejora)
        // previous avg hr = 140, recent avg hr = 140 → estable
        const result = buildTypeProgressInsight(workouts, { type: "easy" });
        expect(result.status).toBe("improved");
        expect(result.paceDeltaSecPerKm).toBe(20);
        expect(result.hrTrend).toBe("stable");

    });

    it("mejora limpia con FC más baja", () => {

        const workouts = [
            w("2026-01-01", 320, 150),
            w("2026-01-03", 318, 150),
            w("2026-01-05", 316, 150),
            w("2026-01-08", 300, 130),
            w("2026-01-10", 298, 130),
            w("2026-01-12", 296, 130)
        ];

        const result = buildTypeProgressInsight(workouts, { type: "easy" });
        expect(result.status).toBe("improved");
        expect(result.hrTrend).toBe("lower");

    });

    it("mejora sin datos de FC en alguno de los grupos: no se inventa un hrTrend", () => {

        const workouts = [
            w("2026-01-01", 320, null),
            w("2026-01-03", 318, null),
            w("2026-01-05", 316, null),
            w("2026-01-08", 300, 140),
            w("2026-01-10", 298, 142),
            w("2026-01-12", 296, 138)
        ];

        const result = buildTypeProgressInsight(workouts, { type: "easy" });
        expect(result.status).toBe("improved");
        expect(result.hrTrend).toBeNull();

    });

    it("mejora parcial: FC sube pero menos, en proporción, que lo que baja el ritmo", () => {

        const workouts = [
            w("2026-01-01", 320, 140),
            w("2026-01-03", 320, 140),
            w("2026-01-05", 320, 140),
            // ritmo mejora un 10% (320 -> 288); FC sube menos de un 10% (140 -> 145, ~3.6%)
            w("2026-01-08", 288, 145),
            w("2026-01-10", 288, 145),
            w("2026-01-12", 288, 145)
        ];

        const result = buildTypeProgressInsight(workouts, { type: "easy" });
        expect(result.status).toBe("improved");
        expect(result.hrTrend).toBe("higher-partial");

    });

    it('mejora "no real": la FC sube en proporción igual o mayor que el ritmo — no se reclama mejora', () => {

        const workouts = [
            w("2026-01-01", 320, 140),
            w("2026-01-03", 320, 140),
            w("2026-01-05", 320, 140),
            // ritmo mejora un 10% (320 -> 288); FC sube un 15% (140 -> 161)
            w("2026-01-08", 288, 161),
            w("2026-01-10", 288, 161),
            w("2026-01-12", 288, 161)
        ];

        const result = buildTypeProgressInsight(workouts, { type: "easy" });
        expect(result.status).toBe("improved");
        expect(result.hrTrend).toBe("higher-proportional");

    });

    it("empeora: el ritmo sube (más lento) respecto al bloque anterior", () => {

        const workouts = [
            w("2026-01-01", 290, 140),
            w("2026-01-03", 290, 140),
            w("2026-01-05", 290, 140),
            w("2026-01-08", 310, 140),
            w("2026-01-10", 310, 140),
            w("2026-01-12", 310, 140)
        ];

        const result = buildTypeProgressInsight(workouts, { type: "easy" });
        expect(result.status).toBe("worse");
        expect(result.paceDeltaSecPerKm).toBe(-20);

    });

    it("ritmo estable: diferencia por debajo del umbral de 2 s/km no cuenta como tendencia", () => {

        const workouts = [
            w("2026-01-01", 300, 140),
            w("2026-01-03", 300, 140),
            w("2026-01-05", 300, 140),
            w("2026-01-08", 299, 140),
            w("2026-01-10", 299, 140),
            w("2026-01-12", 299, 140)
        ];

        const result = buildTypeProgressInsight(workouts, { type: "easy" });
        expect(result.status).toBe("pace-stable");

    });

    it("ignora entrenos de otro tipo al agrupar", () => {

        const workouts = [
            w("2026-01-01", 320, 140, "easy"),
            w("2026-01-02", 200, 170, "series"),
            w("2026-01-03", 318, 140, "easy"),
            w("2026-01-04", 200, 170, "series"),
            w("2026-01-05", 316, 140, "easy"),
            w("2026-01-08", 300, 140, "easy"),
            w("2026-01-10", 298, 140, "easy"),
            w("2026-01-12", 296, 140, "easy")
        ];

        const result = buildTypeProgressInsight(workouts, { type: "easy" });
        expect(result.status).toBe("improved");

    });

});

describe("buildProgressMessage -- segunda línea de insight de RunningTypeSummary (ver Running.js)", () => {

    it("insufficient-data: pide más entrenos, sin ninguna cifra inventada", () => {

        const message = buildProgressMessage({ status: "insufficient-data", type: "easy", groupSize: 3 });

        expect(message.trend).toBe("flat");
        expect(message.html).toContain("Necesitas más entrenos");
        expect(message.html).not.toContain("s/km");

    });

    it("improved con FC estable: cifra real de mejora + cláusula de FC", () => {

        const message = buildProgressMessage({ status: "improved", type: "easy", groupSize: 3, paceDeltaSecPerKm: 20, hrTrend: "stable" });

        expect(message.trend).toBe("up");
        expect(message.html).toContain("20 s/km");
        expect(message.html).toContain("FC media estable");

    });

    it("improved pero con FC subiendo en proporción igual o mayor: no reclama mejora real (trend flat)", () => {

        const message = buildProgressMessage({ status: "improved", type: "easy", groupSize: 3, paceDeltaSecPerKm: 32, hrTrend: "higher-proportional" });

        expect(message.trend).toBe("flat");
        expect(message.html).toContain("no parece una mejora real");

    });

    it("worse: usa el valor absoluto del delta (nunca un negativo feo en el texto)", () => {

        const message = buildProgressMessage({ status: "worse", type: "easy", groupSize: 3, paceDeltaSecPerKm: -20, hrTrend: null });

        expect(message.trend).toBe("down");
        expect(message.html).toContain("20 s/km");
        expect(message.html).not.toContain("-20");

    });

});
