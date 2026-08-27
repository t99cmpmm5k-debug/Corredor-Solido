import { describe, it, expect, vi } from "vitest";

vi.mock("../../../theme/themeManager.js", () => ({
    themeManager: { getTheme: () => ({ id: "day" }) }
}));

vi.mock("../../../assets/plan", () => ({
    PLAN_IMAGES: { day: "plan-day.jpg" }
}));

const { PlanHeader } = await import("./PlanHeader.js");

function session(volume, status = "pending") {
    return { volume, status };
}

describe("PlanHeader -- cabecera compacta (fase 2 del pulido de Plan)", () => {

    it("semana y rango de fechas van en una sola línea (.week-label)", () => {

        const html = PlanHeader("2026-08-24", [], "", { viewMode: "week" });

        expect(html).toContain("SEMANA");
        expect(html).toContain("24 AGO");
        expect(html).not.toContain("week-date");

    });

    it("la línea de stats muestra sesiones Y km reales, no solo el porcentaje", () => {

        const sessions = [
            session(8, "completed"),
            session(13, "pending"),
            session(5, "completed"),
            session(3, "pending")
        ];

        const html = PlanHeader("2026-08-24", sessions, "", { viewMode: "week" });

        // 2 de 4 completadas, 13 km de 29 km totales
        expect(html).toContain("2/4 sesiones");
        expect(html).toContain("13/29 km");

    });

    it("una sesión sin volumen real (null) cuenta como 0 km, nunca rompe la suma", () => {

        const sessions = [session(null, "completed"), session(10, "pending")];

        const html = PlanHeader("2026-08-24", sessions, "", { viewMode: "week" });

        expect(html).toContain("0/10 km");

    });

    it("sin ninguna sesión, el porcentaje es 0 y las sumas quedan en 0/0", () => {

        const html = PlanHeader("2026-08-24", [], "", { viewMode: "week" });

        expect(html).toContain("0/0 sesiones");
        expect(html).toContain("0/0 km");
        expect(html).toContain("--ring-percent:0");

    });

    it("en vista mensual no pinta las stats de la semana", () => {

        const html = PlanHeader("2026-08-24", [session(8, "completed")], "", { viewMode: "month" });

        expect(html).not.toContain("plan-stats");
        expect(html).not.toContain("sesiones");

    });

});
