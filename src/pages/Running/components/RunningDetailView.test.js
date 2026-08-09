import { describe, it, expect } from "vitest";
import { hrPointPercent, hrSegments } from "./RunningDetailView.js";

describe("hrPointPercent", () => {

    it("FC igual a la referencia cae en el centro (50%)", () => {

        expect(hrPointPercent(150, 150)).toBe(50);

    });

    it("FC por encima de la referencia sube (más cerca de 100%)", () => {

        expect(hrPointPercent(160, 150)).toBeGreaterThan(50);

    });

    it("FC por debajo de la referencia baja (más cerca de 0%)", () => {

        expect(hrPointPercent(140, 150)).toBeLessThan(50);

    });

    it("se recorta a los extremos de la ventana en vez de salirse", () => {

        // Ventana de ±15 ppm — muy por encima/debajo se queda en 100/0.
        expect(hrPointPercent(300, 150)).toBe(100);
        expect(hrPointPercent(0, 150)).toBe(0);

    });

});

describe("hrSegments", () => {

    it("agrupa splits con FC contigua en un único tramo", () => {

        const splits = [
            { avgHr: 140 }, { avgHr: 145 }, { avgHr: 150 }
        ];

        const segments = hrSegments(splits);

        expect(segments.length).toBe(1);
        expect(segments[0].map(p => p.index)).toEqual([0, 1, 2]);

    });

    it("corta el tramo en vez de interpolar cuando falta la FC de un split", () => {

        const splits = [
            { avgHr: 140 }, { avgHr: null }, { avgHr: 150 }, { avgHr: 155 }
        ];

        const segments = hrSegments(splits);

        // Dos tramos: [0] antes del hueco, [2,3] después — nunca uno solo
        // que una el 0 con el 2 saltándose el hueco.
        expect(segments.length).toBe(2);
        expect(segments[0].map(p => p.index)).toEqual([0]);
        expect(segments[1].map(p => p.index)).toEqual([2, 3]);

    });

    it("splits sin avgHr (caso Garmin, el campo ni existe) no generan ningún tramo", () => {

        const splits = [
            { paceSecPerKm: 300 }, { paceSecPerKm: 310 }
        ];

        expect(hrSegments(splits)).toEqual([]);

    });

    it("un único split con FC válida entre dos huecos forma su propio tramo de 1 punto", () => {

        const splits = [
            { avgHr: null }, { avgHr: 148 }, { avgHr: null }
        ];

        const segments = hrSegments(splits);

        expect(segments.length).toBe(1);
        expect(segments[0].map(p => p.index)).toEqual([1]);

    });

});
