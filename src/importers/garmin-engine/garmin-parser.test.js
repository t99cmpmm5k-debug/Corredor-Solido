import { describe, it, expect } from "vitest";
import { parse } from "./garmin-parser.js";

// Mismos dos textos OCR reales que parser-splits.test.js (dos posiciones de
// scroll distintas de la tabla de Vueltas desplazada), pero aquí probados a
// través de garmin-parser.parse() completo — que es el que decide si quitar
// la primera línea como barra de estado del móvil. Ninguna de las dos
// capturas trae barra de estado real (llegan recortadas justo a la tabla),
// así que quitar la primera línea a ciegas dejaría la cabecera sin
// identificar — ver el fallback en parse().
const REAL_HR_TABLE_SCROLL1 = [
    "Vuelta GAP medio Frecuencia cardiaca media Frec. cardiaca max. Ascenso total",
    "",
    "min/km ppm ppm m",
    "1 5:30 140 152 16",
    "2 5:34 153 157 1",
    "& 5:38 154 158 9",
    "4 5:40 154 158 o)",
    "5 5:44 154 158 0",
    "o) 5:46 156 158 3"
].join("\n");

const REAL_HR_TABLE_SCROLL2 = [
    "Vuelta dio GAP medio Frecuencia cardiaca media Frec. cardiaca max. Ascenso ti]",
    "/km min/km ppm ppm",
    "440 5:40 154 158",
    "540 5:44 154 158",
    "644 5:46 156 158",
    "7 46 5:52 154 157",
    "8:11 6:00 155 157",
    "Total 40 5:41 152 158 |"
].join("\n");

describe("garmin-parser.parse — captura sin barra de estado (recortada justo a la tabla)", () => {

    it("identifica y extrae la tabla con FC (posición de scroll 1) aunque la primera línea sea la cabecera real, no una barra de estado", () => {

        const result = parse(REAL_HR_TABLE_SCROLL1);

        expect(result.screen.type).toBe("splits");
        expect(result.extras.laps).toHaveLength(6);

    });

    it("identifica y extrae la tabla con FC (posición de scroll 2, cabecera mezclada) igual", () => {

        const result = parse(REAL_HR_TABLE_SCROLL2);

        expect(result.screen.type).toBe("splits");
        expect(result.extras.laps).toHaveLength(5);

    });

});

describe("garmin-parser.parse — captura normal, con barra de estado real", () => {

    it("sigue quitando la primera línea cuando sí es la barra de estado del móvil", () => {

        const withStatusBar = [
            "9:41 ▲ 74% wifi",
            "Resumen Estadísticas Vueltas Gráficos Equipo",
            "Vuelta Tiempo Distancia Ritmo medio",
            "1 5:48.3 1,00 5:48",
            "Total 5:48.3 1,00 5:48"
        ].join("\n");

        const result = parse(withStatusBar);

        expect(result.screen.type).toBe("splits");
        expect(result.extras.laps).toEqual([{ lap: 1, distance_km: 1, pace_min_km: "5:48" }]);

    });

});

// Transcrito a mano a partir de 4 capturas reales aportadas por el usuario
// (pantalla "Intervalos" de una Carrera normal, sin tramos de Recuperación
// -- ver screen-detector.test.js). Recortada justo a la tabla, sin barra de
// estado real por encima.
const REAL_INTERVALS_ROAD = [
    "Seleccionar tipo de paso",
    "Todos Carrera",
    "Int. Ritmo medio GAP medio Frecuencia cardiaca media Frec. cardiaca max. Ascenso total Descenso total",
    "min/km min/km ppm ppm m m",
    "6:10 6:14 154 157 1",
    "2 5:35 5:35 159 165 7"
].join("\n");

describe("garmin-parser.parse — Intervalos de una Carrera normal (sin columna de distancia)", () => {

    it("la reconoce como 'intervals-road' y no extrae ninguna vuelta -- no hay forma fiable de saber cuánto mide cada fila", () => {

        const result = parse(REAL_INTERVALS_ROAD);

        expect(result.screen.type).toBe("intervals-road");
        expect(result.extras.laps).toEqual([]);

    });

});
