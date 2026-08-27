import { describe, it, expect } from "vitest";
import { buildTypeProgressInsight, buildProgressMessage, buildPaceComparison, buildComparisonMessage, buildWorkoutComparison, buildWorkoutComparisonMessage } from "./runningProgress.js";

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

describe("buildPaceComparison -- comparación real por calendario (fase 3 del pulido de Running)", () => {

    const NOW = new Date("2026-08-15T12:00:00");

    it("sin ritmo medio actual, no hay nada que comparar", () => {

        expect(buildPaceComparison([], null, NOW)).toBeNull();

    });

    it("sin ningún entreno real en la ventana de hace ~30 días, devuelve null -- nunca inventa el dato pasado", () => {

        const workouts = [w("2026-08-01", 300, 140), w("2026-01-01", 300, 140)];
        expect(buildPaceComparison(workouts, 300, NOW)).toBeNull();

    });

    it("con un solo entreno en la ventana (por debajo del mínimo de 2), devuelve null", () => {

        const workouts = [w("2026-07-15", 320)]; // dentro de la ventana 9-23 jul
        expect(buildPaceComparison(workouts, 300, NOW)).toBeNull();

    });

    it("con al menos 2 entrenos reales en la ventana, calcula la comparación real", () => {

        const workouts = [
            w("2026-07-14", 320),
            w("2026-07-18", 316),
            w("2026-08-10", 999) // fuera de la ventana, no debe contar
        ];

        const result = buildPaceComparison(workouts, 300, NOW);

        expect(result).not.toBeNull();
        expect(result.pastPaceSecPerKm).toBe(318); // media de 320 y 316
        expect(result.currentPaceSecPerKm).toBe(300);
        expect(result.deltaSecPerKm).toBe(-18); // 300 - 318

    });

});

describe("buildComparisonMessage -- texto real de la comparación de calendario", () => {

    it("ritmo actual más rápido: etiqueta 'Mejora' con el delta negativo tal cual", () => {

        const text = buildComparisonMessage({ currentPaceSecPerKm: 352, pastPaceSecPerKm: 372, deltaSecPerKm: -20 });

        expect(text).toBe("Ritmo medio: 5:52/km · Hace 30 días: 6:12/km · Mejora: -20 s/km");

    });

    it("ritmo actual más lento: nunca reclama 'Mejora' -- usa 'Cambio' con el signo +", () => {

        const text = buildComparisonMessage({ currentPaceSecPerKm: 320, pastPaceSecPerKm: 300, deltaSecPerKm: 20 });

        expect(text).toContain("Cambio: +20 s/km");
        expect(text).not.toContain("Mejora");

    });

});

// id explícito en cada entreno -- buildWorkoutComparison excluye al propio
// entreno de su línea base por id, así que reusar w() (sin id, todos
// "undefined") los excluiría a todos por accidente.
function wi(id, date, avgPaceSecPerKm, avgHr, type = "easy") {
    return { id, date, avgPaceSecPerKm, avgHr, type };
}

describe("buildWorkoutComparison -- comparación histórica de un entreno concreto (retoque de cierre, punto 10)", () => {

    it("null sin ritmo, tipo o fecha propios", () => {

        expect(buildWorkoutComparison({ id: "w1", type: "easy", date: "2026-08-20" }, [])).toBeNull();
        expect(buildWorkoutComparison({ id: "w1", avgPaceSecPerKm: 300, date: "2026-08-20" }, [])).toBeNull();
        expect(buildWorkoutComparison({ id: "w1", avgPaceSecPerKm: 300, type: "easy" }, [])).toBeNull();

    });

    it("null con menos de 3 entrenos anteriores reales del mismo tipo", () => {

        const workout = wi("w1", "2026-08-20", 280, 140, "easy");
        const allWorkouts = [
            workout,
            wi("w2", "2026-08-10", 300, 140, "easy"),
            wi("w3", "2026-08-05", 300, 140, "easy"),
            wi("w4", "2026-08-01", 300, 140, "series")
        ];

        expect(buildWorkoutComparison(workout, allWorkouts)).toBeNull();

    });

    it("ignora entrenos de otro tipo y entrenos posteriores a este mismo", () => {

        const workout = wi("w1", "2026-08-20", 280, 140, "easy");
        const allWorkouts = [
            workout,
            wi("w2", "2026-08-10", 300, 140, "easy"),
            wi("w3", "2026-08-05", 300, 140, "easy"),
            wi("w4", "2026-08-01", 300, 140, "easy"),
            wi("w5", "2026-08-15", 999, 140, "series"),
            wi("w6", "2026-08-25", 100, 140, "easy")
        ];

        const result = buildWorkoutComparison(workout, allWorkouts);

        expect(result).toEqual({ type: "easy", groupSize: 3, paceDeltaSecPerKm: 20, hrTrend: "stable" });

    });

    it("toma solo los 3 entrenos previos más recientes del mismo tipo como línea base", () => {

        const workout = wi("w1", "2026-08-20", 280, 140, "easy");
        const allWorkouts = [
            workout,
            wi("w2", "2026-08-10", 300, 140, "easy"),
            wi("w3", "2026-08-05", 300, 140, "easy"),
            wi("w4", "2026-08-01", 300, 140, "easy"),
            wi("w5", "2026-07-01", 100, 140, "easy")
        ];

        const result = buildWorkoutComparison(workout, allWorkouts);

        expect(result.paceDeltaSecPerKm).toBe(20);

    });

});

describe("buildWorkoutComparisonMessage -- texto real de la comparación histórica de un entreno", () => {

    it("ritmo similar (delta por debajo del umbral de ruido)", () => {

        const text = buildWorkoutComparisonMessage({ type: "easy", groupSize: 3, paceDeltaSecPerKm: 1, hrTrend: "stable" });

        expect(text).toBe("Ritmo similar a tus últimos 3 Rodaje (Z2) con una FC media estable.");

    });

    it("más rápido con FC estable: reclama la mejora sin reservas", () => {

        const text = buildWorkoutComparisonMessage({ type: "easy", groupSize: 3, paceDeltaSecPerKm: 20, hrTrend: "stable" });

        expect(text).toBe("Respecto a tus últimos 3 Rodaje (Z2): 20 s/km más rápido con una FC media estable.");

    });

    it("más rápido pero con la FC subiendo en igual o mayor proporción: no lo llama mejora real", () => {

        const text = buildWorkoutComparisonMessage({ type: "easy", groupSize: 3, paceDeltaSecPerKm: 20, hrTrend: "higher-proportional" });

        expect(text).toContain("no parece una mejora real");
        expect(text).not.toContain("mejorado");

    });

    it("más lento que la línea base: lo dice tal cual, sin suavizarlo", () => {

        const text = buildWorkoutComparisonMessage({ type: "easy", groupSize: 3, paceDeltaSecPerKm: -20, hrTrend: "stable" });

        expect(text).toBe("Respecto a tus últimos 3 Rodaje (Z2): 20 s/km más lento con una FC media estable.");

    });

    it("nunca compara tipos distintos -- el label sale siempre del tipo del propio entreno", () => {

        const text = buildWorkoutComparisonMessage({ type: "series", groupSize: 3, paceDeltaSecPerKm: 10, hrTrend: null });

        expect(text).toContain("Series");
        expect(text).not.toContain("Rodaje");

    });

});
