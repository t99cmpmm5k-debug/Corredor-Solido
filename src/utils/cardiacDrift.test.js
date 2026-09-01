import { describe, it, expect } from "vitest";
import { buildCardiacDrift } from "./cardiacDrift.js";

function split(avgHr, overrides = {}) {
    return { avgHr, segmentType: null, ...overrides };
}

describe("buildCardiacDrift — extraída de RunningDetailView.js para reutilizarla en Recorridos de referencia", () => {

    it("null fuera de Rodaje/Z2 (workout.type !== 'easy')", () => {

        const splits = Array.from({ length: 6 }, () => split(150));
        expect(buildCardiacDrift({ type: "series" }, splits)).toBeNull();

    });

    it("null con menos de 4 splits con FC real", () => {

        const splits = [split(150), split(151), split(149)];
        expect(buildCardiacDrift({ type: "easy" }, splits)).toBeNull();

    });

    it("calcula el % real (2ª mitad vs. 1ª mitad) y clasifica 'Muy bueno' por debajo del 5%", () => {

        // 1ª mitad: 150,150,150 (avg 150) -- 2ª mitad: 153,153,153 (avg 153) -> +2%
        const splits = [split(150), split(150), split(150), split(153), split(153), split(153)];
        const drift = buildCardiacDrift({ type: "easy" }, splits);

        expect(drift.percent).toBeCloseTo(2, 5);
        expect(drift.label).toBe("Muy bueno");
        expect(drift.trend).toBe("up");

    });

    it("clasifica 'Bueno' entre 5% y 10%", () => {

        // avg 150 -> avg 165 = +10%
        const splits = [split(150), split(150), split(150), split(165), split(165), split(165)];
        const drift = buildCardiacDrift({ type: "easy" }, splits);

        expect(drift.percent).toBeCloseTo(10, 5);
        expect(drift.label).toBe("Bueno");

    });

    it("clasifica 'Mejorable' por encima del 10%", () => {

        // avg 150 -> avg 180 = +20%
        const splits = [split(150), split(150), split(150), split(180), split(180), split(180)];
        const drift = buildCardiacDrift({ type: "easy" }, splits);

        expect(drift.percent).toBeCloseTo(20, 5);
        expect(drift.label).toBe("Mejorable");
        expect(drift.trend).toBe("down");

    });

    it("ignora splits de descanso (segmentType 'rest') y sin FC real", () => {

        const splits = [
            split(150), split(150), split(null, { segmentType: "rest" }), split(150),
            split(153), split(153), split(153)
        ];

        const drift = buildCardiacDrift({ type: "easy" }, splits);
        expect(drift).not.toBeNull();

    });

});
