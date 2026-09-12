import { describe, it, expect } from "vitest";
import { PlanComplianceWidget } from "./PlanComplianceWidget.js";

describe("PlanComplianceWidget", () => {

    it("sin plan de running esta semana, no renderiza nada", () => {

        const html = PlanComplianceWidget({ hasPlan: false, sessionsPlanned: 0, sessionsCompleted: 0, plannedKm: 0, actualKm: 0, kmPercent: null });

        expect(html).toBe("");

    });

    it("muestra planificado/realizado, el % y las sesiones por separado (nunca mezclados)", () => {

        const html = PlanComplianceWidget({
            hasPlan: true,
            sessionsPlanned: 3,
            sessionsCompleted: 2,
            plannedKm: 22,
            actualKm: 17,
            kmPercent: 77
        });

        expect(html).toContain("CUMPLIMIENTO DEL PLAN");
        expect(html).toContain("Planificado:");
        expect(html).toContain("22 km");
        expect(html).toContain("Realizado:");
        expect(html).toContain("17 km");
        expect(html).toContain("77%");
        expect(html).toContain("2/3 sesiones");

    });

    it("sin ningún km objetivo esta semana, omite el % en vez de mostrar 0% o dividir entre cero", () => {

        const html = PlanComplianceWidget({
            hasPlan: true,
            sessionsPlanned: 2,
            sessionsCompleted: 0,
            plannedKm: 0,
            actualKm: 0,
            kmPercent: null
        });

        expect(html).not.toContain("%");
        expect(html).toContain("0/2 sesiones");

    });

});
