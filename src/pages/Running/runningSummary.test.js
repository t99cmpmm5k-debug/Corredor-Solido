import { describe, it, expect } from "vitest";
import { buildTypeSummary } from "./runningSummary.js";

function w({ distanceKm, durationSec, avgPaceSecPerKm, avgHr }) {
    return { distanceKm, durationSec, avgPaceSecPerKm, avgHr };
}

describe("buildTypeSummary", () => {

    it("devuelve null con 0 entrenos — nada de resumen con guiones", () => {

        expect(buildTypeSummary([])).toBeNull();
        expect(buildTypeSummary(null)).toBeNull();

    });

    it("con 1 entrenamiento, la 'media' es ese mismo valor — exacta, no falsa", () => {

        const summary = buildTypeSummary([
            w({ distanceKm: 5, durationSec: 1500, avgPaceSecPerKm: 300, avgHr: 140 })
        ]);

        expect(summary.count).toBe(1);
        expect(summary.avgPaceSecPerKm).toBe(300);
        expect(summary.avgHr).toBe(140);
        expect(summary.bestPaceSecPerKm).toBe(300);

    });

    it("el ritmo medio pondera por distancia, no promedia los ritmos por entreno", () => {

        // Tirada larga (10km a 300 s/km = 3000s) + corta (2km a 200 s/km = 400s).
        // Promedio simple de ritmos: (300+200)/2 = 250 s/km — INCORRECTO.
        // Ponderado real: (3000+400) / (10+2) = 283.33 s/km.
        const summary = buildTypeSummary([
            w({ distanceKm: 10, durationSec: 3000, avgPaceSecPerKm: 300, avgHr: null }),
            w({ distanceKm: 2, durationSec: 400, avgPaceSecPerKm: 200, avgHr: null })
        ]);

        expect(summary.avgPaceSecPerKm).toBe(Math.round((3000 + 400) / (10 + 2)));
        expect(summary.avgPaceSecPerKm).not.toBe(250);

    });

    it("entrenos sin FC no rompen el cálculo ni cuentan como 0", () => {

        const summary = buildTypeSummary([
            w({ distanceKm: 5, durationSec: 1500, avgPaceSecPerKm: 300, avgHr: 140 }),
            w({ distanceKm: 5, durationSec: 1500, avgPaceSecPerKm: 300, avgHr: null })
        ]);

        // Media de solo el que sí tiene FC — no (140+0)/2.
        expect(summary.avgHr).toBe(140);

    });

    it("FC media es null si ningún entreno filtrado tiene FC", () => {

        const summary = buildTypeSummary([
            w({ distanceKm: 5, durationSec: 1500, avgPaceSecPerKm: 300, avgHr: null })
        ]);

        expect(summary.avgHr).toBeNull();
        // El resto de campos sigue calculándose con normalidad.
        expect(summary.avgPaceSecPerKm).toBe(300);

    });

    it("mejor ritmo es el mínimo real entre los entrenos con ritmo válido", () => {

        const summary = buildTypeSummary([
            w({ distanceKm: 5, durationSec: 1650, avgPaceSecPerKm: 330, avgHr: 140 }),
            w({ distanceKm: 5, durationSec: 1400, avgPaceSecPerKm: 280, avgHr: 145 }),
            w({ distanceKm: 5, durationSec: 1500, avgPaceSecPerKm: 300, avgHr: null })
        ]);

        expect(summary.bestPaceSecPerKm).toBe(280);

    });

});
