import { describe, it, expect } from "vitest";
import { hrPointPercent, hrSegments, RunningDetailView } from "./RunningDetailView.js";

function workout(overrides) {
    return {
        id: "w1",
        date: "2026-08-20",
        distanceKm: 5,
        durationSec: 1500,
        avgPaceSecPerKm: 300,
        splits: [
            { lap: 1, paceSecPerKm: 295 },
            { lap: 2, paceSecPerKm: 305 },
            { lap: 3, paceSecPerKm: 300 }
        ],
        ...overrides
    };
}

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

describe("RunningDetailView — FC en el gráfico de ritmo", () => {

    it("caso Garmin (OCR): muestra el chip de FC media pero no la línea por km cuando los splits no traen FC", () => {

        const html = RunningDetailView(workout({ avgHr: 160 }));

        expect(html).toContain("pace-chart-avg-badge--hr");
        expect(html).toContain("160 ppm medio");
        expect(html).not.toContain("pace-chart-hr-overlay");
        expect(html).not.toContain("pace-chart-hr-value");

    });

    it("caso Amazfit (TCX): muestra el chip y la línea con el valor numérico de FC por km", () => {

        const html = RunningDetailView(workout({
            avgHr: 145,
            splits: [
                { lap: 1, paceSecPerKm: 295, avgHr: 140 },
                { lap: 2, paceSecPerKm: 305, avgHr: 148 },
                { lap: 3, paceSecPerKm: 300, avgHr: 150 }
            ]
        }));

        expect(html).toContain("pace-chart-avg-badge--hr");
        expect(html).toContain("pace-chart-hr-overlay");
        expect(html).toContain("pace-chart-hr-value");
        expect(html).toContain(">140<");
        expect(html).toContain(">148<");
        expect(html).toContain(">150<");

    });

    it("sin FC en absoluto (ni media ni por km): no muestra ningún elemento de FC", () => {

        const html = RunningDetailView(workout());

        expect(html).not.toContain("pace-chart-avg-badge--hr");
        expect(html).not.toContain("pace-chart-hr-overlay");
        expect(html).not.toContain("pace-chart-hr-value");

    });

});
