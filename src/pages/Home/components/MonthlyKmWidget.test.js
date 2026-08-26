import { describe, it, expect } from "vitest";
import { MonthlyKmWidget } from "./MonthlyKmWidget.js";

function stats({ chartMonths = null } = {}) {
    return {
        currentMonthKey: "2026-08",
        currentMonthKm: 52.7,
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

    it("sin selección, no muestra ninguna línea de detalle", () => {

        const html = MonthlyKmWidget(stats({ chartMonths: CHART_MONTHS }));
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

        const html = MonthlyKmWidget(stats({ chartMonths: CHART_MONTHS }), "2026-05");
        // 2026-05 no tiene count 1 en este fixture -- se comprueba el
        // singular con un fixture dedicado en vez de reusar CHART_MONTHS.
        const singularStats = stats({
            chartMonths: CHART_MONTHS.map(m => m.key === "2026-05" ? { ...m, count: 1 } : m)
        });
        const singularHtml = MonthlyKmWidget(singularStats, "2026-05");

        expect(singularHtml).toContain("1 entrenamiento");
        expect(singularHtml).not.toContain("1 entrenamientos");
        expect(html).toContain("monthly-km-detail");

    });

    it("seleccionar el mes actual no añade ningún detalle (ya se ve arriba)", () => {

        const html = MonthlyKmWidget(stats({ chartMonths: CHART_MONTHS }), "2026-08");
        expect(html).not.toContain("monthly-km-detail");

    });

    it("sin chartMonths (usuario nuevo), no hay gráfico ni intenta leer una selección", () => {

        const html = MonthlyKmWidget(stats({ chartMonths: null }), "2026-07");

        expect(html).not.toContain("monthly-km-chart");
        expect(html).not.toContain("monthly-km-detail");

    });

});
