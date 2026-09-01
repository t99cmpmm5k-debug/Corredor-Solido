import { describe, it, expect } from "vitest";
import { parseGarminWorkout } from "./garmin.js";

function merged({ data = {}, laps = [], warnings = [], blocks = [] } = {}) {
    return { data: { date: "20 ago", ...data }, laps, warnings, blocks };
}

describe("parseGarminWorkout — FC media/máxima general cuando solo hay vueltas con FC", () => {

    // Caso real: el usuario captura Resumen/Estadísticas + la tabla de
    // Vueltas desplazada (GAP medio/FC media/FC máx.), pero no la vista
    // estándar de Vueltas — ningún split trae ritmo, pero todos traen FC.
    it("deriva avgHr como media y maxHr como el pico real de las vueltas, cuando no hay lectura directa", () => {

        const workout = parseGarminWorkout(merged({
            laps: [
                { lap: 1, avg_heart_rate_bpm: 140, max_heart_rate_bpm: 152 },
                { lap: 2, avg_heart_rate_bpm: 153, max_heart_rate_bpm: 157 },
                { lap: 3, avg_heart_rate_bpm: 154, max_heart_rate_bpm: 158 }
            ]
        }));

        // Media de 140,153,154 = 149 (redondeado). Máximo real = 158, no
        // la media de los máximos por vuelta.
        expect(workout.avgHr).toBe(149);
        expect(workout.maxHr).toBe(158);

    });

    it("avisa de que la FC media es una estimación, no una lectura directa", () => {

        const workout = parseGarminWorkout(merged({
            laps: [{ lap: 1, avg_heart_rate_bpm: 140, max_heart_rate_bpm: 152 }]
        }));

        expect(workout.importWarnings.some(w => /estimada a partir de las vueltas/.test(w))).toBe(true);

    });

    it("prefiere la lectura directa de Resumen/Estadísticas sobre la media de las vueltas", () => {

        const workout = parseGarminWorkout(merged({
            data: { avg_heart_rate_bpm: "163", max_heart_rate_bpm: "170" },
            laps: [
                { lap: 1, avg_heart_rate_bpm: 140, max_heart_rate_bpm: 152 },
                { lap: 2, avg_heart_rate_bpm: 153, max_heart_rate_bpm: 157 }
            ]
        }));

        expect(workout.avgHr).toBe(163);
        expect(workout.maxHr).toBe(170);
        expect(workout.importWarnings.some(w => /estimada a partir de las vueltas/.test(w))).toBe(false);

    });

    it("sin lectura directa ni FC en ninguna vuelta: se queda en null, no inventa nada", () => {

        const workout = parseGarminWorkout(merged({
            laps: [{ lap: 1, distance_km: 1, pace_min_km: "5:30" }]
        }));

        expect(workout.avgHr).toBeNull();
        expect(workout.maxHr).toBeNull();
        expect(workout.importWarnings.some(w => /estimada a partir de las vueltas/.test(w))).toBe(false);

    });

    it("sin vueltas en absoluto: se queda en null como siempre", () => {

        const workout = parseGarminWorkout(merged());

        expect(workout.avgHr).toBeNull();
        expect(workout.maxHr).toBeNull();

    });

});

describe("parseGarminWorkout — Training Effect (bloque real dentro de Estadísticas)", () => {

    // Valores reales de una captura real (verificados 2026-08-27): antes
    // este bloque se leía (parser-training-effect.js) pero nunca llegaba a
    // ningún campo del workout -- ni el detector de pantalla lo reconocía
    // como algo distinto de "statistics" (no hacía falta, ya cae ahí bien),
    // ni parser-statistics.js lo extraía, ni garmin.js lo mapeaba.
    it("mapea aerobic/anaerobic/carga cuando la fusión los trae reales", () => {

        const workout = parseGarminWorkout(merged({
            data: {
                training_effect_aerobic: "3,6",
                training_effect_anaerobic: "0,0",
                exercise_load: "117"
            }
        }));

        expect(workout.trainingEffectAerobic).toBe(3.6);
        expect(workout.trainingEffectAnaerobic).toBe(0);
        expect(workout.exerciseLoad).toBe(117);

    });

    it("sin ese bloque en la captura (p. ej. TCX/Amazfit, o el usuario no lo capturó), se queda en null -- nunca inventado", () => {

        const workout = parseGarminWorkout(merged());

        expect(workout.trainingEffectAerobic).toBeNull();
        expect(workout.trainingEffectAnaerobic).toBeNull();
        expect(workout.exerciseLoad).toBeNull();

    });

});

// Valores reales (5 capturas de un mismo entreno, 13,02 km: 11 km + 2,02
// km) -- ver parser-intervals-road.test.js para el texto OCR transcrito.
// La card "RITMO POR INTERVALO" (que consumía merged.blocks como
// workout.intervals) se eliminó por completo -- garmin.js ya no mapea
// merged.blocks a nada; el único dato de Intervalos que llega a
// workout.splits son sus filas hijas, vía merged.laps, y solo cuando no
// hay ninguna captura real de Vueltas (ver mergeLaps() en fusion.js).
describe("parseGarminWorkout — filas hijas de Intervalos entran en workout.splits igual que cualquier vuelta normal", () => {

    it("merged.laps (ya fusionado, familia Vueltas o familia Intervalos según corresponda) entra en workout.splits por el mismo mapeo de siempre -- ninguna rama nueva, ningún campo distinto", () => {

        const workout = parseGarminWorkout(merged({
            laps: [
                { lap: 1, distance_km: 1, pace_min_km: "5:17" },
                { lap: 2, distance_km: 1, pace_min_km: "5:25" }
            ]
        }));

        expect(workout.splits).toEqual([
            { lap: 1, distanceKm: 1, paceSecPerKm: 317, avgHr: null, maxHr: null, segmentType: null },
            { lap: 2, distanceKm: 1, paceSecPerKm: 325, avgHr: null, maxHr: null, segmentType: null }
        ]);

    });

    it("workout.intervals ya no existe -- la funcionalidad se eliminó por completo", () => {

        const workout = parseGarminWorkout(merged({
            blocks: [{ lap: 1, type: "Carrera", duration: "1:05:44", distance_km: 11, pace_min_km: "5:59" }]
        }));

        expect(workout.intervals).toBeUndefined();

    });

});
