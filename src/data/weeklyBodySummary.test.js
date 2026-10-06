import { describe, it, expect } from "vitest";
import { buildWeeklyBodySummary } from "./weeklyBodySummary.js";

let seq = 0;

function entry(date, weightKg, waistCm = null) {

    seq += 1;
    return { id: `e${seq}`, date, weightKg, bodyFatPercent: null, waterPercent: null, musclePercent: null, waistCm, createdAt: `${date}T08:00:${String(seq).padStart(2, "0")}.000Z` };

}

// Hoy: miércoles 2026-10-07 (semana 41, lunes 5 oct). Semanas mostradas:
// 41 (5-11 oct), 40 (28 sep-4 oct, a caballo entre dos meses), 39, 38.
const TODAY = "2026-10-07";

describe("buildWeeklyBodySummary", () => {

    it("peso medio solo con 2 o más pesajes; con 0 o 1, null", () => {

        const rows = buildWeeklyBodySummary({
            today: TODAY,
            entries: [
                entry("2026-10-05", 80.8), entry("2026-10-07", 81.0),   // semana 41: 2 pesajes
                entry("2026-09-29", 81.5)                                 // semana 40: 1 pesaje
                                                                          // semana 39: 0 pesajes
            ]
        });

        expect(rows.map(r => [r.weekNumber, r.weightKg])).toEqual([[41, 80.9]]);
        // La 40 solo tenía un pesaje y ningún otro dato: no sale.

    });

    it("semana a caballo entre dos meses (28 sep-4 oct): cuenta como una sola semana, con su número de Plan", () => {

        const rows = buildWeeklyBodySummary({
            today: TODAY,
            entries: [entry("2026-09-28", 81.6), entry("2026-10-04", 81.2)]
        });

        expect(rows).toEqual([{
            weekStart: "2026-09-28",
            weekNumber: 40,
            weightKg: 81.4,
            weightDelta: null,
            waistCm: null,
            waistDelta: null,
            dietPercent: null
        }]);

    });

    it("cambio de peso solo si la semana anterior también tiene media válida, sobre las medias ya redondeadas", () => {

        const rows = buildWeeklyBodySummary({
            today: TODAY,
            entries: [
                entry("2026-10-05", 80.8), entry("2026-10-06", 81.0),   // 41: 80,9
                entry("2026-09-29", 81.2), entry("2026-10-02", 81.4),   // 40: 81,3
                entry("2026-09-22", 82.0)                                 // 39: un pesaje -> sin media
            ]
        });

        expect(rows.map(r => [r.weekNumber, r.weightKg, r.weightDelta])).toEqual([
            [41, 80.9, -0.4],
            [40, 81.3, null]
        ]);

    });

    it("cintura: el ÚLTIMO registro con cintura de la semana (no una media), con 1 basta; cambio solo si la anterior la tiene", () => {

        const rows = buildWeeklyBodySummary({
            today: TODAY,
            entries: [
                entry("2026-10-05", 80.8, 85), entry("2026-10-06", 81.0, 84),  // 41: última = 84
                entry("2026-09-30", 81.2, 85.5),                                // 40: 85,5 (un pesaje, sin media)
                entry("2026-09-15", 82.0), entry("2026-09-17", 82.2)           // 38: peso, sin cintura
            ]
        });

        expect(rows.map(r => [r.weekNumber, r.waistCm, r.waistDelta])).toEqual([
            [41, 84, -1.5],
            [40, 85.5, null],
            [38, null, null]
        ]);
        expect(rows.find(r => r.weekNumber === 40).weightKg).toBeNull();

    });

    it("dieta: el % que dé dietForWeek; sin dieta esa semana, null (nunca 0); semana solo con dieta también sale", () => {

        const rows = buildWeeklyBodySummary({
            today: TODAY,
            entries: [],
            dietForWeek: weekStart => (weekStart === "2026-10-05" ? { percent: 71 } : null)
        });

        expect(rows).toEqual([expect.objectContaining({ weekNumber: 41, weightKg: null, waistCm: null, dietPercent: 71 })]);

    });

    it("semana actual con días futuros: no inventa nada de los días que faltan (la media es de lo registrado)", () => {

        const asked = [];
        const rows = buildWeeklyBodySummary({
            today: TODAY,
            entries: [entry("2026-10-05", 80.8), entry("2026-10-06", 81.0)],
            dietForWeek: weekStart => { asked.push(weekStart); return null; }
        });

        expect(rows[0].weightKg).toBe(80.9);
        // La dieta se pide por semana; el corte en "hoy" lo hace
        // getWeekDietCompliance (ver dietStore.test.js).
        expect(asked).toContain("2026-10-05");

    });

    it("sin ningún dato en ninguna semana: lista vacía (el bloque no se pinta)", () => {

        expect(buildWeeklyBodySummary({ today: TODAY, entries: [] })).toEqual([]);

    });

    it("registros de hace más de 4 semanas no aparecen, pero la semana justo anterior sí sirve para el cambio", () => {

        const rows = buildWeeklyBodySummary({
            today: TODAY,
            entries: [
                entry("2026-09-14", 82.4), entry("2026-09-16", 82.2),   // 38 (la más antigua mostrada): 82,3
                entry("2026-09-08", 82.6), entry("2026-09-10", 82.8)    // 37 (no se muestra): 82,7
            ]
        });

        expect(rows.map(r => [r.weekNumber, r.weightKg, r.weightDelta])).toEqual([[38, 82.3, -0.4]]);

    });

    it("cambio de año: la semana del lunes 29 dic 2025 es la semana 1 (ISO, igual que Plan) y se compara con la 52", () => {

        const rows = buildWeeklyBodySummary({
            today: "2026-01-02",
            entries: [
                entry("2025-12-29", 80.0), entry("2026-01-01", 80.2),   // semana 1 de 2026
                entry("2025-12-22", 80.6), entry("2025-12-24", 80.8)    // semana 52 de 2025
            ]
        });

        expect(rows.map(r => [r.weekStart, r.weekNumber, r.weightKg, r.weightDelta])).toEqual([
            ["2025-12-29", 1, 80.1, -0.6],
            ["2025-12-22", 52, 80.7, null]
        ]);

    });

});
