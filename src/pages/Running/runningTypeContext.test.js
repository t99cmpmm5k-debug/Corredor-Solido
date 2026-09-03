import { describe, it, expect } from "vitest";
import { buildWorkoutTypeContext } from "./runningTypeContext.js";

function workout(id, type, avgPaceSecPerKm, avgHr = null) {
    return { id, type, avgPaceSecPerKm, avgHr };
}

describe("buildWorkoutTypeContext", () => {

    it("sin tipo, no hay contexto", () => {
        expect(buildWorkoutTypeContext({ id: "w1", type: null, avgPaceSecPerKm: 350 }, [])).toBeNull();
    });

    it("con menos de 3 OTROS entrenos reales del mismo tipo, no hay contexto (ni ritmo ni FC)", () => {

        const target = workout("w1", "easy", 340, 150);
        const others = [
            workout("w2", "easy", 400, 160),
            workout("w3", "easy", 400, 160)
        ];

        expect(buildWorkoutTypeContext(target, [target, ...others])).toBeNull();

    });

    it("ignora entrenos de otros tipos al calcular la media -- Rodaje (Z2) nunca se compara con Series", () => {

        const target = workout("w1", "easy", 340, 150);
        const others = [
            workout("w2", "easy", 340, 150),
            workout("w3", "easy", 340, 150),
            workout("w4", "easy", 340, 150),
            // Series muchísimo más rápidas -- si se colaran en la media,
            // "w1" parecería mucho más lento de lo que es.
            workout("w5", "series", 200, 175),
            workout("w6", "series", 200, 175),
            workout("w7", "series", 200, 175)
        ];

        // Media real de Rodaje (Z2) = 340 (los w2-w4), igual que target ->
        // sin diferencia significativa -> sin contexto.
        expect(buildWorkoutTypeContext(target, [target, ...others])).toBeNull();

    });

    it("diferencia de ritmo significativa: muestra el ritmo, con el label del tipo y la dirección correcta", () => {

        const target = workout("w1", "easy", 328, 150); // 5:28/km, bastante más rápido
        const others = [
            workout("w2", "easy", 350, 150),
            workout("w3", "easy", 350, 150),
            workout("w4", "easy", 350, 150)
        ];

        const result = buildWorkoutTypeContext(target, [target, ...others]);

        expect(result).toEqual({ kind: "pace", text: "Rodaje (Z2) · +22 s/km más rápido que tu media" });

    });

    it("entreno más lento que su media: dirección 'más lento'", () => {

        const target = workout("w1", "easy", 370, 150);
        const others = [
            workout("w2", "easy", 350, 150),
            workout("w3", "easy", 350, 150),
            workout("w4", "easy", 350, 150)
        ];

        const result = buildWorkoutTypeContext(target, [target, ...others]);

        expect(result).toEqual({ kind: "pace", text: "Rodaje (Z2) · +20 s/km más lento que tu media" });

    });

    it("ritmo dentro del margen de ruido, FC significativa: cae a la FC", () => {

        const target = workout("w1", "easy", 351, 165); // ritmo casi igual, FC bastante más alta
        const others = [
            workout("w2", "easy", 350, 150),
            workout("w3", "easy", 350, 150),
            workout("w4", "easy", 350, 150)
        ];

        const result = buildWorkoutTypeContext(target, [target, ...others]);

        expect(result).toEqual({ kind: "hr", text: "Rodaje (Z2) · FC +15 ppm respecto a tu media" });

    });

    it("FC más baja que la media: signo negativo, sin '+'", () => {

        const target = workout("w1", "easy", 350, 135);
        const others = [
            workout("w2", "easy", 350, 150),
            workout("w3", "easy", 350, 150),
            workout("w4", "easy", 350, 150)
        ];

        const result = buildWorkoutTypeContext(target, [target, ...others]);

        expect(result).toEqual({ kind: "hr", text: "Rodaje (Z2) · FC -15 ppm respecto a tu media" });

    });

    it("ambas métricas dentro del margen de ruido: sin contexto (no es un fallo, es un entreno normal)", () => {

        const target = workout("w1", "easy", 351, 151);
        const others = [
            workout("w2", "easy", 350, 150),
            workout("w3", "easy", 350, 150),
            workout("w4", "easy", 350, 150)
        ];

        expect(buildWorkoutTypeContext(target, [target, ...others])).toBeNull();

    });

    it("con ritmo real pero FC ausente en el entreno o en el histórico, no revienta -- usa lo que hay", () => {

        const target = workout("w1", "easy", 328, null); // sin FC, ritmo sí notable
        const others = [
            workout("w2", "easy", 350, null),
            workout("w3", "easy", 350, null),
            workout("w4", "easy", 350, null)
        ];

        const result = buildWorkoutTypeContext(target, [target, ...others]);

        expect(result.kind).toBe("pace");

    });

});
