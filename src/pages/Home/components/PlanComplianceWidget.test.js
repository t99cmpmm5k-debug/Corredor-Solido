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

    // Distinguir cumplimiento de carga (Capa 3, punto 4): un % por encima
    // del 100% no debe leerse implícitamente como "mejor cuanto más alto".
    describe("exceso por encima del 100% -- nota de contexto, nunca un veredicto", () => {

        it("por debajo o exactamente en el 100%, no muestra ninguna nota de exceso", () => {

            const under = PlanComplianceWidget({ hasPlan: true, sessionsPlanned: 3, sessionsCompleted: 2, plannedKm: 22, actualKm: 17, kmPercent: 77 });
            expect(under).not.toContain("plan-compliance-overage-note");

            const exact = PlanComplianceWidget({ hasPlan: true, sessionsPlanned: 3, sessionsCompleted: 3, plannedKm: 20, actualKm: 20, kmPercent: 100 });
            expect(exact).not.toContain("plan-compliance-overage-note");

        });

        it("exceso moderado (ej. 114%): nota informativa sin alarmismo", () => {

            const html = PlanComplianceWidget({ hasPlan: true, sessionsPlanned: 3, sessionsCompleted: 3, plannedKm: 22, actualKm: 25, kmPercent: 114 });

            expect(html).toContain("plan-compliance-overage-note");
            expect(html).toContain("Dentro de un margen razonable.");
            expect(html).toContain("22 km"); // el desglose real sigue ahí, no se sustituye

        });

        it("exceso alto (ej. 145%): nota distinta, tampoco alarmista", () => {

            const html = PlanComplianceWidget({ hasPlan: true, sessionsPlanned: 3, sessionsCompleted: 3, plannedKm: 20, actualKm: 29, kmPercent: 145 });

            expect(html).toContain("Volumen por encima de lo previsto.");
            expect(html).not.toContain("Dentro de un margen razonable.");

        });

    });

});
