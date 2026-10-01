import { describe, it, expect, vi } from "vitest";

vi.mock("../../../theme/themeManager.js", () => ({
    themeManager: { getTheme: () => ({ id: "day" }) }
}));

vi.mock("../../../assets/plan", () => ({
    PLAN_IMAGES: { day: "plan-day.jpg" }
}));

const { PlanHeader, buildWeekSummary } = await import("./PlanHeader.js");

function session(volume, status = "pending") {
    return { volume, status };
}

describe("PlanHeader -- cabecera compacta (fase 2 del pulido de Plan)", () => {

    it("\"SEMANA N\" es el título y el rango de fechas va en su propia línea debajo (pulido final)", () => {

        const html = PlanHeader("2026-09-28", [], "", { viewMode: "week" });

        expect(html).toMatch(/class="week-label">\s*SEMANA 40\s*</);
        expect(html).toMatch(/class="week-dates">\s*28 SEPT — 4 OCT\s*</);

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

describe("buildWeekSummary -- línea de resumen bajo el timeline (pulido final)", () => {

    const s = (type, volume) => ({ type, volume, status: "pending" });

    it("sesiones · km · categorías presentes, en orden fijo", () => {
        const summary = buildWeekSummary([s("intervals", 10), s("z2", 8), s("longRun", 5)]);
        expect(summary).toBe("3 sesiones · 23 km · 1 calidad · 1 rodaje · 1 tirada larga");
    });

    it("omite cualquier categoría sin sesiones esa semana", () => {
        const summary = buildWeekSummary([s("z2", 8), s("recovery", 5)]);
        expect(summary).toBe("2 sesiones · 13 km · 2 rodajes");
        expect(summary).not.toContain("calidad");
        expect(summary).not.toContain("carrera");
    });

    it("tempo cuenta como calidad y la carrera va aparte de la tirada larga", () => {
        const summary = buildWeekSummary([s("tempo", 10), s("intervals", 9), s("race", 21.1), s("longRun", 18)]);
        expect(summary).toContain("2 calidad");
        expect(summary).toContain("1 tirada larga");
        expect(summary).toContain("1 carrera");
    });

    it("un tipo sin categoría (fuerza) cuenta en sesiones pero no inventa etiqueta", () => {
        expect(buildWeekSummary([s("strength", 0)])).toBe("1 sesión · 0 km");
    });

    it("sin sesiones no hay línea (null)", () => {
        expect(buildWeekSummary([])).toBeNull();
    });

});
