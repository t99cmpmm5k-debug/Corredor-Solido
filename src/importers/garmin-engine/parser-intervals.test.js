import { describe, it, expect } from "vitest";
import { parse } from "./parser-intervals.js";

// Texto OCR real (confianza 89%) de la pantalla "Intervalos" de un
// Entrenamiento en pista, captura "Puerto Lumbreras - Series" — ya sin la
// barra de estado del sistema (garmin-parser.js la quita antes de despachar
// a este parser, igual que hace con el resto).
const REAL_INTERVALS_TEXT = [
    "< Entrenamiento en pista :",
    "resumen Estadísticas Intervalos Gráficos Equipo",
    "Seleccionar tipo de paso",
    "Todos | Carrera Recuperación",
    "Int. Tipo Tiempo Dist. Ritmo",
    "m medio",
    "1 Carrera 4:21.6 1000 4:22",
    "Recuperación 2:00.0 290 6:54",
    "2 Carrera 4:20.6 1000 4:21",
    "Recuperación 2:00.0 280 7:09",
    "3 Carrera 4:25.4 1000 4:25",
    "Recuperación 2:00.0 100 20:00",
    "4 Carrera 4:38.1 1000 4:38",
    "Recuperación 2:00.0 100 20:00",
    "Total 25:45.6 4770 5:24",
    "[13"
].join("\n");

describe("parser-intervals", () => {

    it("lee las 4 Carreras y las 4 Recuperaciones como tramos reales, nunca descarta la recuperación", () => {

        const { extras } = parse(REAL_INTERVALS_TEXT);

        expect(extras.laps).toHaveLength(8);

    });

    it("numera Carrera=N y Recuperación=N+0.5, para reutilizar la fusión por lap existente", () => {

        const { extras } = parse(REAL_INTERVALS_TEXT);
        const laps = extras.laps.map(l => l.lap);

        expect(laps).toEqual([1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5]);

    });

    it("convierte la distancia de Carrera de metros a km y marca segmentType 'work'", () => {

        const { extras } = parse(REAL_INTERVALS_TEXT);
        const first = extras.laps.find(l => l.lap === 1);

        expect(first).toEqual({ lap: 1, distance_km: 1, pace_min_km: "4:22", segmentType: "work" });

    });

    it("convierte la distancia de Recuperación de metros a km y marca segmentType 'rest', incluso con ritmo absurdo (2:00 sobre 100 m)", () => {

        const { extras } = parse(REAL_INTERVALS_TEXT);
        const thirdRest = extras.laps.find(l => l.lap === 3.5);

        expect(thirdRest).toEqual({ lap: 3.5, distance_km: 0.1, pace_min_km: "20:00", segmentType: "rest" });

    });

    it("descarta la fila 'Total' — no es un intervalo real", () => {

        const { extras } = parse(REAL_INTERVALS_TEXT);

        expect(extras.laps.some(l => l.lap === 25 || l.distance_km === 4.77)).toBe(false);

    });

    it("identifica la pantalla como 'intervals'", () => {

        const { fields } = parse(REAL_INTERVALS_TEXT);

        expect(fields.screen_type.value).toBe("intervals");

    });

});
