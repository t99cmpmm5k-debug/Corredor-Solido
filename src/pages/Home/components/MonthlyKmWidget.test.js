import { describe, it, expect } from "vitest";
import { MonthlyKmWidget } from "./MonthlyKmWidget.js";

function stats({ chartMonths = null, currentMonthCount = 9 } = {}) {
    return {
        currentMonthKey: "2026-08",
        currentMonthKm: 52.7,
        currentMonthCount,
        previousMonthKey: "2026-07",
        comparisonPercent: 12,
        chartMonths
    };
}

const CHART_MONTHS = [
    { key: "2026-05", km: 20, count: 4, isCurrent: false },
    { key: "2026-06", km: 30, count: 6, isCurrent: false },
    { key: "2026-07", km: 35.1, count: 7, isCurrent: false },
    { key: "2026-08", km: 52.7, count: 9, isCurrent: true }
];

describe("MonthlyKmWidget", () => {

    it("sin selección, muestra el resumen real del mes en curso (entrenos + km/sesión)", () => {

        const html = MonthlyKmWidget(stats({ chartMonths: CHART_MONTHS }));

        expect(html).toContain("monthly-km-detail");
        expect(html).toContain("9 entrenamientos");
        expect(html).toContain("5,9 km/sesión"); // 52,7 / 9

    });

    it("sin ningún entreno este mes, no inventa un resumen ni una media", () => {

        const html = MonthlyKmWidget(stats({ chartMonths: CHART_MONTHS, currentMonthCount: 0 }));
        expect(html).not.toContain("monthly-km-detail");

    });

    it("cada barra lleva data-action y data-month-key para el tap", () => {

        const html = MonthlyKmWidget(stats({ chartMonths: CHART_MONTHS }));

        expect(html).toContain('data-action="select-month"');
        expect(html).toContain('data-month-key="2026-07"');

    });

    it("tocar un mes distinto al actual muestra su detalle real (km y nº de entrenos)", () => {

        const html = MonthlyKmWidget(stats({ chartMonths: CHART_MONTHS }), "2026-07");

        expect(html).toContain("monthly-km-detail");
        expect(html).toContain("Julio");
        expect(html).toContain("35,1 km");
        expect(html).toContain("7 entrenamientos");

    });

    it("un mes con un solo entreno usa el singular", () => {

        const singularStats = stats({
            chartMonths: CHART_MONTHS.map(m => m.key === "2026-05" ? { ...m, count: 1 } : m)
        });
        const singularHtml = MonthlyKmWidget(singularStats, "2026-05");

        expect(singularHtml).toContain("1 entrenamiento");
        expect(singularHtml).not.toContain("1 entrenamientos");

    });

    it("seleccionar el mes actual no cambia nada (ya es lo que se ve por defecto)", () => {

        const html = MonthlyKmWidget(stats({ chartMonths: CHART_MONTHS }), "2026-08");

        expect(html).toContain("9 entrenamientos");
        expect(html).toContain("5,9 km/sesión");

    });

    it("sin chartMonths (usuario nuevo), no hay gráfico pero sí puede haber resumen del mes actual", () => {

        const html = MonthlyKmWidget(stats({ chartMonths: null }), "2026-07");

        expect(html).not.toContain("monthly-km-chart");
        expect(html).toContain("9 entrenamientos");

    });

    // Barras grandes (ronda final, 2026-08-26): cada mes lleva ahora su
    // abreviatura visible debajo de la barra, no solo el aria-label de
    // antes.
    it("cada barra lleva su etiqueta de mes visible debajo (MAY, JUN, JUL, AGO)", () => {

        const html = MonthlyKmWidget(stats({ chartMonths: CHART_MONTHS }));

        expect(html).toContain("monthly-km-bar-label");
        expect(html).toContain(">MAY<");
        expect(html).toContain(">JUN<");
        expect(html).toContain(">JUL<");
        expect(html).toContain(">AGO<");

    });

    it("la altura de cada barra es proporcional al mes más alto de la ventana", () => {

        const html = MonthlyKmWidget(stats({ chartMonths: CHART_MONTHS }));

        // 52.7 (agosto, el más alto) -> altura máxima; 20 (mayo) ->
        // proporcional; nunca todas iguales aunque los km sean distintos.
        const heightOf = key => {
            const idx = html.indexOf(`data-month-key="${key}"`);
            const barHtml = html.slice(idx - 200, idx);
            return Number(barHtml.match(/height:(\d+)px/)[1]);
        };

        const mayHeight = heightOf("2026-05");
        const augHeight = heightOf("2026-08");

        expect(augHeight).toBeGreaterThan(mayHeight);

    });

    // Ajuste B3 (ajustes finales de cierre): el mínimo visible solo debe
    // aplicarse a meses realmente cercanos a 0 -- dos meses bajos pero
    // genuinamente distintos (5 km y 15 km, con agosto en 52,7 km) deben
    // seguir viéndose distintos entre sí, no igualados al mismo mínimo.
    it("dos meses bajos pero distintos entre sí muestran alturas distintas, no ambos igualados al mínimo", () => {

        const months = [
            { key: "2026-05", km: 5, count: 2, isCurrent: false },
            { key: "2026-06", km: 15, count: 3, isCurrent: false },
            { key: "2026-07", km: 35.1, count: 7, isCurrent: false },
            { key: "2026-08", km: 52.7, count: 9, isCurrent: true }
        ];

        const html = MonthlyKmWidget(stats({ chartMonths: months }));

        const heightOf = key => {
            const idx = html.indexOf(`data-month-key="${key}"`);
            return Number(html.slice(idx - 200, idx).match(/height:(\d+)px/)[1]);
        };

        expect(heightOf("2026-06")).toBeGreaterThan(heightOf("2026-05"));

    });

    // Un mes en 0 km real (o muy cerca) sigue dibujando una barra visible
    // -- nunca desaparece del todo -- pero ya no se traga la diferencia
    // con otro mes bajo real (ver test de arriba).
    it("un mes en 0 km real sigue dibujando una barra visible (nunca 0px)", () => {

        const months = [
            { key: "2026-04", km: 0, count: 0, isCurrent: false },
            { key: "2026-08", km: 52.7, count: 9, isCurrent: true }
        ];

        const html = MonthlyKmWidget(stats({ chartMonths: months }));

        const idx = html.indexOf('data-month-key="2026-04"');
        const height = Number(html.slice(idx - 200, idx).match(/height:(\d+)px/)[1]);

        expect(height).toBeGreaterThan(0);

    });

});
