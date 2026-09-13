import { describe, it, expect } from "vitest";
import { RunnerStatusWidget } from "./RunnerStatusWidget.js";

describe("RunnerStatusWidget", () => {

    it("sin ningún indicador disponible, no renderiza nada", () => {

        expect(RunnerStatusWidget([])).toBe("");

    });

    it("con los 4 indicadores, los pinta todos con su icono/valor/etiqueta", () => {

        const html = RunnerStatusWidget([
            { key: "acwr", icon: "solar:chart-2-bold-duotone", label: "Carga", value: "Óptima" },
            { key: "z2", icon: "solar:graph-new-up-bold-duotone", label: "Z2", value: "-11s/km" },
            { key: "week", icon: "solar:calendar-mark-bold-duotone", label: "Semana", value: "77%" },
            { key: "race", icon: "solar:flag-2-bold-duotone", label: "Próx. carrera", value: "12 días" }
        ]);

        expect(html).toContain("ESTADO DEL CORREDOR");
        expect(html).toContain("Óptima");
        expect(html).toContain("-11s/km");
        expect(html).toContain("77%");
        expect(html).toContain("12 días");
        expect((html.match(/runner-status-item"/g) ?? []).length).toBe(4);

    });

    it("con solo 1 indicador disponible, lo pinta sin romper el grid (no deja huecos vacíos)", () => {

        const html = RunnerStatusWidget([
            { key: "race", icon: "solar:flag-2-bold-duotone", label: "Próx. carrera", value: "Mañana" }
        ]);

        expect(html).toContain("ESTADO DEL CORREDOR");
        expect(html).toContain("Mañana");
        expect((html.match(/runner-status-item"/g) ?? []).length).toBe(1);

    });

    it("con frase-resumen, la pinta debajo de los indicadores", () => {

        const html = RunnerStatusWidget(
            [{ key: "acwr", icon: "solar:chart-2-bold-duotone", label: "Carga", value: "Óptima" }],
            "Carrera en 2 días — llega descansado."
        );

        expect(html).toContain('<p class="runner-status-summary">Carrera en 2 días — llega descansado.</p>');

    });

    it("sin frase-resumen (null), no pinta el párrafo", () => {

        const html = RunnerStatusWidget(
            [{ key: "acwr", icon: "solar:chart-2-bold-duotone", label: "Carga", value: "Óptima" }],
            null
        );

        expect(html).not.toContain("runner-status-summary");

    });

    it("sin ningún indicador, no pinta nada aunque llegue una frase-resumen", () => {

        expect(RunnerStatusWidget([], "Esto no debería aparecer nunca.")).toBe("");

    });

});
