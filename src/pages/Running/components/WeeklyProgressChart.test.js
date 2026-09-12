import { describe, it, expect } from "vitest";
import { WeeklyProgressChart } from "./WeeklyProgressChart.js";

describe("WeeklyProgressChart", () => {

    it("sin historial suficiente, muestra el mensaje de 'necesitas más historial', no un gráfico vacío", () => {

        const html = WeeklyProgressChart({ available: false, weeksWithData: 1 });

        expect(html).toContain("PROGRESO");
        expect(html).toContain("Necesitas entrenos reales en al menos 2 semanas");
        expect(html).not.toContain("weekly-progress-bar\"");

    });

    it("con las 4 semanas disponibles, pinta una columna por semana en el mismo orden recibido", () => {

        const html = WeeklyProgressChart({
            available: true,
            weeks: [
                { weekStart: "2026-08-10", weekEnd: "2026-08-16", totalKm: 20, avgPaceSecPerKm: 330, hasWorkouts: true },
                { weekStart: "2026-08-17", weekEnd: "2026-08-23", totalKm: 0, avgPaceSecPerKm: null, hasWorkouts: false },
                { weekStart: "2026-08-24", weekEnd: "2026-08-30", totalKm: 15, avgPaceSecPerKm: 320, hasWorkouts: true },
                { weekStart: "2026-08-31", weekEnd: "2026-09-06", totalKm: 25, avgPaceSecPerKm: 310, hasWorkouts: true }
            ]
        });

        expect((html.match(/weekly-progress-column/g) ?? []).length).toBe(4);
        expect(html).toContain("20 km");
        expect(html).toContain("15 km");
        expect(html).toContain("25 km");
        expect(html).toContain("Últimas 4 semanas");

    });

    it("una semana sin entrenos se pinta con guion y estilo 'vacío', sin romper el resto de columnas", () => {

        const html = WeeklyProgressChart({
            available: true,
            weeks: [
                { weekStart: "2026-08-10", weekEnd: "2026-08-16", totalKm: 20, avgPaceSecPerKm: 330, hasWorkouts: true },
                { weekStart: "2026-08-17", weekEnd: "2026-08-23", totalKm: 0, avgPaceSecPerKm: null, hasWorkouts: false }
            ]
        });

        expect(html).toContain("weekly-progress-bar--empty");
        expect((html.match(/weekly-progress-column/g) ?? []).length).toBe(2);

    });

    it("sin ninguna semana con ritmo real, no pinta la línea/leyenda de ritmo", () => {

        const html = WeeklyProgressChart({
            available: true,
            weeks: [
                { weekStart: "2026-08-10", weekEnd: "2026-08-16", totalKm: 0, avgPaceSecPerKm: null, hasWorkouts: true },
                { weekStart: "2026-08-17", weekEnd: "2026-08-23", totalKm: 0, avgPaceSecPerKm: null, hasWorkouts: true }
            ]
        });

        expect(html).not.toContain("weekly-progress-pace-overlay");
        expect(html).not.toContain("Ritmo medio");

    });

});
