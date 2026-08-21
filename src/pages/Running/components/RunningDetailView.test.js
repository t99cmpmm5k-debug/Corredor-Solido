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

    it("splits sin avgHr (p. ej. Garmin sin la captura de FC por vuelta) no generan ningún tramo", () => {

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

// Extrae left/bottom/clase de cada <span class="pace-chart-hr-value...">
// del HTML renderizado, en el mismo orden que aparecen los splits.
function hrValueSpans(html) {
    return [...html.matchAll(/<span class="(pace-chart-hr-value[^"]*)" style="left:([\d.]+)%;bottom:(-?[\d.]+)%">(\d+)<\/span>/g)]
        .map(m => ({ cls: m[1], left: Number(m[2]), bottom: Number(m[3]), value: Number(m[4]) }));
}

describe("RunningDetailView — posición del número de FC frente al de ritmo (evita el solape)", () => {

    // avgPaceRef=300 (ventana 255-345), avgHrRef=150 (ventana 135-165) —
    // números redondos para poder predecir a mano el % de altura exacto
    // de cada barra/punto.
    function hrPlacementWorkout(splits) {
        return workout({ avgPaceSecPerKm: 300, avgHr: 150, splits });
    }

    it("punto muy por encima de su propia barra (caso real de 21 km): se ancla debajo, recortado a la altura de la barra, no a una distancia fija del punto", () => {

        // pace=300 -> barra al 50%. avgHr=165 (máximo de ventana) -> punto al 100%.
        // Un desplazamiento fijo (~18%) desde el punto (100-18=82%) seguía
        // quedando muy por encima de la barra (50%) y tapaba el número de
        // ritmo -- por eso se recorta al 50% exacto, no a 82%.
        const html = RunningDetailView(hrPlacementWorkout([
            { lap: 1, paceSecPerKm: 300, avgHr: 165 },
            { lap: 2, paceSecPerKm: 300, avgHr: 165 }
        ]));

        const [first] = hrValueSpans(html);
        expect(first.cls).toContain("pace-chart-hr-value--below");
        expect(first.bottom).toBeCloseTo(50, 5);

    });

    it("punto algo por encima de su barra pero cerca: se ancla justo debajo del punto, no se aleja de más", () => {

        // pace=270 -> barra al 83.3%. avgHr=160 -> punto al 83.3% también
        // (mismo nivel). El hueco es pequeño, así que basta el
        // desplazamiento normal desde el punto, sin necesidad de recortar.
        const html = RunningDetailView(hrPlacementWorkout([
            { lap: 1, paceSecPerKm: 270, avgHr: 160 },
            { lap: 2, paceSecPerKm: 270, avgHr: 160 }
        ]));

        const [first] = hrValueSpans(html);
        expect(first.cls).toContain("pace-chart-hr-value--below");
        // 83.33 - (22/120*100 ≈ 18.33) ≈ 65 -- por encima del recorte a
        // la barra (83.33), así que no debería haberse recortado.
        expect(first.bottom).toBeCloseTo(65, 0);
        expect(first.bottom).toBeGreaterThan(50);

    });

    it("punto claramente por debajo de su barra: no hace falta volcarlo, se queda encima como siempre", () => {

        // pace=300 -> barra al 50%. avgHr=135 (mínimo de ventana) -> punto al 0%.
        const html = RunningDetailView(hrPlacementWorkout([
            { lap: 1, paceSecPerKm: 300, avgHr: 135 },
            { lap: 2, paceSecPerKm: 300, avgHr: 135 }
        ]));

        const [first] = hrValueSpans(html);
        expect(first.cls).not.toContain("pace-chart-hr-value--below");
        expect(first.bottom).toBe(0);

    });

    it("barra muy corta con un punto algo por encima: el recorte no se va a un 'bottom' negativo (fuera del gráfico)", () => {

        // pace=345 (el más lento de la ventana) -> barra prácticamente al 0%.
        // avgHr=140 -> punto a un 16.7% bajo, lo bastante cerca de la barra
        // como para volcarse, pero y - HR_VALUE_DROP_PCT (~16.7-18.3) sale
        // negativo -- debe recortarse a 0, no quedarse en negativo.
        const html = RunningDetailView(hrPlacementWorkout([
            { lap: 1, paceSecPerKm: 345, avgHr: 140 },
            { lap: 2, paceSecPerKm: 345, avgHr: 140 }
        ]));

        const [first] = hrValueSpans(html);
        expect(first.bottom).toBeGreaterThanOrEqual(0);

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
