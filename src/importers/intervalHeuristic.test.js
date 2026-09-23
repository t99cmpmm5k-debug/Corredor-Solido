import { describe, it, expect } from "vitest";
import { detectHeuristicIntervals } from "./intervalHeuristic.js";

// Señal sintética de 1 punto/s con la misma forma que la sesión real de
// Zepp del 17-09 (calentamiento 10', 4×3' con 2' de recuperación,
// enfriamiento) -- velocidades redondas para poder comprobar duraciones
// y ritmos exactos. La verificación contra los archivos reales se hizo
// aparte (ver el commit); esto fija el comportamiento.
const T0 = Date.parse("2026-09-17T16:52:47Z");
const WARM = 2.0, FAST = 2.65, REST = 1.8;

function profile(blocks) {

    const points = [];
    let t = 0;

    blocks.forEach(([seconds, speed]) => {
        for (let i = 0; i < seconds; i++, t++) {
            points.push({ time: new Date(T0 + t * 1000), speed, hr: 140, lat: null, lon: null });
        }
    });

    return points;

}

const SERIES_4X3 = [[600, WARM], [180, FAST], [120, REST], [180, FAST], [120, REST], [180, FAST], [120, REST], [180, FAST], [720, WARM]];

describe("detectHeuristicIntervals", () => {

    it("detecta 4 series y 3 recuperaciones, dejando fuera calentamiento y enfriamiento", () => {

        const result = detectHeuristicIntervals(profile(SERIES_4X3));

        expect(result.speedSource).toBe("sensor");
        expect(result.splits.map(s => s.segmentType)).toEqual(["work", "rest", "work", "rest", "work", "rest", "work"]);
        expect(result.splits.map(s => s.lap)).toEqual([1, 2, 3, 4, 5, 6, 7]);
        // El umbral cae entre los dos niveles de ritmo de la sesión, no
        // exactamente a mitad de cada transición -- ±2 s en los cortes.
        expect(Math.abs(result.splits[0].startSec - 600)).toBeLessThanOrEqual(2);

        result.splits.forEach(split => {
            expect(split.isHeuristic).toBe(true);
            expect(Math.abs(split.durationSec - (split.segmentType === "work" ? 180 : 120))).toBeLessThanOrEqual(2);
        });

        // 180 s a 2,65 m/s = 477 m -> 377 s/km (6:17)
        expect(Math.abs(result.splits[0].paceSecPerKm - 377)).toBeLessThanOrEqual(3);

    });

    it("un tramo rápido de menos de 60 s (un cambio de ritmo suelto) no cuenta como serie", () => {

        const result = detectHeuristicIntervals(profile([[300, WARM], [40, FAST], [300, WARM], [180, FAST], [120, REST], [180, FAST], [300, WARM]]));

        expect(result.splits.filter(s => s.segmentType === "work")).toHaveLength(2);

    });

    it("sin dos niveles de ritmo claros (rodaje continuo) no inventa intervalos", () => {

        expect(detectHeuristicIntervals(profile([[1800, WARM]]))).toBeNull();
        expect(detectHeuristicIntervals(profile([[600, 2.0], [600, 2.1], [600, 2.0]]))).toBeNull();

    });

    it("con una sola serie no hay patrón de series", () => {

        expect(detectHeuristicIntervals(profile([[600, WARM], [180, FAST], [600, WARM]]))).toBeNull();

    });

    it("sin velocidad de sensor la deriva del GPS, tolerando timestamps repetidos como en los archivos reales de Zepp", () => {

        // Recta hacia el norte: 1 m ≈ 1/111320 grados de latitud.
        const points = [];
        let t = 0, lat = 37.58;

        SERIES_4X3.forEach(([seconds, speed]) => {
            for (let i = 0; i < seconds; i++, t++) {
                lat += speed / 111320;
                // Cada 8 s, un punto con el timestamp del anterior (y un hueco después).
                const stamp = t % 8 === 0 && t > 0 ? t - 1 : t;
                points.push({ time: new Date(T0 + stamp * 1000), speed: null, hr: 140, lat, lon: -1.73 });
            }
        });

        const result = detectHeuristicIntervals(points);

        expect(result.speedSource).toBe("gps");
        expect(result.splits.map(s => s.segmentType)).toEqual(["work", "rest", "work", "rest", "work", "rest", "work"]);

        const work = result.splits[0];
        expect(Math.abs(work.durationSec - 180)).toBeLessThanOrEqual(3);
        expect(Math.abs(work.paceSecPerKm - 377)).toBeLessThanOrEqual(8);

    });

});
