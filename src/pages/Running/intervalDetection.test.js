import { describe, it, expect } from "vitest";
import { detectIntervalRange, filterToIntervalRange } from "./intervalDetection.js";

function split(paceSecPerKm, segmentType = null) {
    return { paceSecPerKm, segmentType };
}

describe("detectIntervalRange() -- vía real (segmentType de la pantalla Intervalos de Garmin)", () => {

    it("recorta al primer/último split marcado work/rest, ignorando null (calentamiento/enfriamiento) en los extremos", () => {

        const splits = [
            split(360), // calentamiento, sin segmentType
            split(300, "work"),
            split(480, "rest"),
            split(295, "work"),
            split(370), // enfriamiento, sin segmentType
        ];

        const range = detectIntervalRange(splits);

        expect(range).toEqual({ startIndex: 1, endIndex: 3, isHeuristic: false });

    });

    it("no marca isHeuristic aunque solo haya un split work/rest", () => {

        const splits = [split(360), split(300, "work"), split(370)];
        const range = detectIntervalRange(splits);

        expect(range).toEqual({ startIndex: 1, endIndex: 1, isHeuristic: false });

    });

});

describe("detectIntervalRange() -- vía heurística (sin segmentType, GPX/TCX o Vueltas)", () => {

    it("recorta un calentamiento y enfriamiento claramente más lentos que el resto", () => {

        // calentamiento 6:40, 4 series a ~5:00, enfriamiento 6:50
        const splits = [400, 300, 305, 298, 302, 410].map(p => split(p));

        const range = detectIntervalRange(splits);

        expect(range).toEqual({ startIndex: 1, endIndex: 4, isHeuristic: true });

    });

    it("un rodaje continuo sin calentamiento/enfriamiento marcado no recorta nada (devuelve null)", () => {

        const splits = [300, 298, 302, 305, 299, 301].map(p => split(p));

        expect(detectIntervalRange(splits)).toBeNull();

    });

    it("con menos de 5 splits no aplica la heurística (demasiado poco de lo que fiarse)", () => {

        const splits = [360, 300, 305, 370].map(p => split(p));

        expect(detectIntervalRange(splits)).toBeNull();

    });

    it("nunca recorta por debajo del tramo central mínimo (3 splits)", () => {

        // Calentamiento y enfriamiento extremos a ambos lados -- sin el
        // límite mínimo, el recorte iterativo seguiría comiéndose el
        // tramo central hasta dejarlo en 1 solo split.
        const splits = [1000, 300, 305, 298, 1000].map(p => split(p));

        const range = detectIntervalRange(splits);

        expect(range).toEqual({ startIndex: 1, endIndex: 3, isHeuristic: true });

    });

    it("splits sin ritmo real (paceSecPerKm null) no activan la heurística", () => {

        const splits = [split(360), split(null), split(305), split(298), split(370)];

        expect(detectIntervalRange(splits)).toBeNull();

    });

});

describe("filterToIntervalRange()", () => {

    it("sin rango, devuelve los splits tal cual", () => {

        const splits = [split(300), split(305)];
        expect(filterToIntervalRange(splits, null)).toBe(splits);

    });

    it("con rango, recorta a startIndex..endIndex inclusive", () => {

        const splits = [split(360), split(300), split(305), split(370)];
        const result = filterToIntervalRange(splits, { startIndex: 1, endIndex: 2 });

        expect(result).toEqual([split(300), split(305)]);

    });

});
