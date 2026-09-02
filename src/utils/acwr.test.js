import { describe, it, expect } from "vitest";
import { addDays, formatISODate } from "./date.js";
import {
    ACWR_ACUTE_DAYS,
    ACWR_CHRONIC_DAYS,
    classifyAcwrZone,
    resolveReferenceMaxHr,
    computeRunningWorkoutLoad,
    buildRunningLoadEntries,
    buildAcwrInsight
} from "./acwr.js";

const TODAY = new Date(2026, 8, 2); // 2026-09-02
const TODAY_ISO = formatISODate(TODAY);

function workout({ date, avgHr = null, maxHr = null, durationSec = null }) {
    return { date, avgHr, maxHr, durationSec };
}

describe("classifyAcwrZone", () => {

    it("clasifica en las 4 franjas, con los cortes 0.8/1.3/1.5 inclusive en la franja de abajo", () => {

        expect(classifyAcwrZone(0.79).id).toBe("detrained");
        expect(classifyAcwrZone(0.8).id).toBe("optimal");
        expect(classifyAcwrZone(1.3).id).toBe("optimal");
        expect(classifyAcwrZone(1.31).id).toBe("moderateRisk");
        expect(classifyAcwrZone(1.5).id).toBe("moderateRisk");
        expect(classifyAcwrZone(1.51).id).toBe("highRisk");

    });

});

describe("resolveReferenceMaxHr", () => {

    it("sin workouts, o sin ninguno con maxHr real, devuelve null (nunca inventa un valor)", () => {

        expect(resolveReferenceMaxHr([])).toBeNull();
        expect(resolveReferenceMaxHr([workout({ date: "2026-08-01" })])).toBeNull();

    });

    it("devuelve el maxHr más alto REAL entre todos los entrenos, ignorando los que no lo tienen", () => {

        const workouts = [
            workout({ date: "2026-08-01", maxHr: 172 }),
            workout({ date: "2026-08-02" }),
            workout({ date: "2026-08-03", maxHr: 186 }),
            workout({ date: "2026-08-04", maxHr: 158 })
        ];

        expect(resolveReferenceMaxHr(workouts)).toBe(186);

    });

});

describe("computeRunningWorkoutLoad", () => {

    it("null si falta avgHr, durationSec, o no hay FC máx de referencia -- nunca 0 por defecto", () => {

        expect(computeRunningWorkoutLoad(workout({ date: "d", avgHr: 150, durationSec: 1800 }), null)).toBeNull();
        expect(computeRunningWorkoutLoad(workout({ date: "d", durationSec: 1800 }), 190)).toBeNull();
        expect(computeRunningWorkoutLoad(workout({ date: "d", avgHr: 150 }), 190)).toBeNull();

    });

    it("duración (min) x FC media / FC máx de referencia", () => {

        // 30 min x (150/190) = 23.68...
        const load = computeRunningWorkoutLoad(workout({ date: "d", avgHr: 150, durationSec: 1800 }), 190);
        expect(load).toBeCloseTo(30 * (150 / 190), 6);

    });

});

describe("buildRunningLoadEntries", () => {

    it("sin ningún maxHr real en todo el histórico, no hay referencia -- lista vacía", () => {

        const workouts = [workout({ date: "2026-08-01", avgHr: 150, durationSec: 1800 })];
        expect(buildRunningLoadEntries(workouts)).toEqual([]);

    });

    it("descarta entrenos sin FC media aunque sí haya referencia real, conserva el resto", () => {

        const workouts = [
            workout({ date: "2026-08-01", avgHr: 150, maxHr: 172, durationSec: 1800 }),
            workout({ date: "2026-08-02", durationSec: 1200, maxHr: 160 }) // sin avgHr
        ];

        const entries = buildRunningLoadEntries(workouts);

        expect(entries).toHaveLength(1);
        expect(entries[0].date).toBe("2026-08-01");
        expect(entries[0].load).toBeCloseTo(30 * (150 / 172), 6);

    });

});

describe("buildAcwrInsight", () => {

    it("sin ninguna carga real, no disponible por falta total de datos", () => {

        const result = buildAcwrInsight([], { referenceDate: TODAY });

        expect(result).toEqual({ available: false, reason: "no-data", daysOfHistory: 0, missingDays: ACWR_CHRONIC_DAYS });

    });

    it("con menos de ACWR_CHRONIC_DAYS de historial real, no disponible -- dice cuántos días faltan", () => {

        const entries = [
            { date: addDays(TODAY_ISO, -10), load: 20 },
            { date: addDays(TODAY_ISO, -2), load: 15 }
        ];

        const result = buildAcwrInsight(entries, { referenceDate: TODAY });

        expect(result.available).toBe(false);
        expect(result.reason).toBe("insufficient-history");
        expect(result.daysOfHistory).toBe(11); // desde hace 10 días hasta hoy, ambos incluidos
        expect(result.missingDays).toBe(ACWR_CHRONIC_DAYS - 11);

    });

    it("con historial de sobra pero sin ninguna carga en los últimos ACWR_CHRONIC_DAYS, no disponible (0/0, no un ratio de 0)", () => {

        const entries = [{ date: addDays(TODAY_ISO, -35), load: 100 }];

        const result = buildAcwrInsight(entries, { referenceDate: TODAY });

        expect(result.available).toBe(false);
        expect(result.reason).toBe("no-recent-load");

    });

    it("con historial suficiente, calcula carga aguda/crónica como MEDIA DIARIA de la ventana y el ratio entre ambas", () => {

        const entries = [
            { date: TODAY_ISO, load: 10 },
            { date: addDays(TODAY_ISO, -3), load: 20 },
            { date: addDays(TODAY_ISO, -10), load: 15 },
            { date: addDays(TODAY_ISO, -20), load: 25 },
            { date: addDays(TODAY_ISO, -27), load: 5 },
            { date: addDays(TODAY_ISO, -35), load: 100 } // fuera de la ventana crónica, no debe contar
        ];

        const result = buildAcwrInsight(entries, { referenceDate: TODAY });

        expect(result.available).toBe(true);
        expect(result.daysOfHistory).toBe(36);

        const expectedAcute = (10 + 20) / ACWR_ACUTE_DAYS;
        const expectedChronic = (10 + 20 + 15 + 25 + 5) / ACWR_CHRONIC_DAYS;

        expect(result.acuteLoad).toBeCloseTo(expectedAcute, 6);
        expect(result.chronicLoad).toBeCloseTo(expectedChronic, 6);
        expect(result.ratio).toBeCloseTo(expectedAcute / expectedChronic, 6);
        expect(result.ratio).toBeCloseTo(1.6, 6);
        expect(result.zone.id).toBe("highRisk");

    });

    it("caso real aproximado (17 entrenos, 60 días, sin picos): ratio cae en zona óptima", () => {

        // Un entreno cada ~3-4 días con carga similar -- ni un pico reciente
        // ni una racha larga sin correr, así que aguda y crónica deberían
        // salir parecidas (ratio cerca de 1).
        const entries = [];
        for (let offset = 0; offset <= 56; offset += 3.5) {
            entries.push({ date: addDays(TODAY_ISO, -Math.round(offset)), load: 40 });
        }

        const result = buildAcwrInsight(entries, { referenceDate: TODAY });

        expect(result.available).toBe(true);
        expect(result.zone.id).toBe("optimal");
        expect(result.ratio).toBeGreaterThan(0.8);
        expect(result.ratio).toBeLessThanOrEqual(1.3);

    });

});
