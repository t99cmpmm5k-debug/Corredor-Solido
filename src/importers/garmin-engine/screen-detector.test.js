import { describe, it, expect } from "vitest";
import { detect } from "./screen-detector.js";

// Texto transcrito a mano a partir de 4 capturas reales aportadas por el
// usuario (no se corrió tesseract.js real sobre los píxeles en este
// entorno, pero la forma de la tabla -- cabecera, chips de filtro,
// columnas -- es la real). Pantalla "Intervalos" de una Carrera normal
// (no en pista): filtro "Seleccionar tipo de paso" con chips "Todos" /
// "Carrera" (sin "Recuperación", a diferencia de la vista de pista), y
// columna "Int." con número solo en algunas filas -- el resto quedan en
// blanco, agrupadas bajo el intervalo anterior. Sin columna de distancia.
const REAL_INTERVALS_ROAD_TEXT = [
    "Seleccionar tipo de paso",
    "Todos Carrera",
    "Int. Ritmo medio GAP medio Frecuencia cardiaca media Frec. cardiaca max. Ascenso total Descenso total",
    "min/km min/km ppm ppm m m",
    "6:10 6:14 154 157 1",
    "6:23 6:18 154 157 6",
    "6:29 6:29 153 156 9",
    "2 5:35 5:35 159 165 7",
    "5:50 5:50 153 157 9",
    "5:52 5:52 153 156 4",
    "6:09 6:06 154 159 15",
    "6:08 6:10 154 159 6",
    "6:13 6:14 154 159 3",
    "5:33 5:34 159 161 2",
    "5:33 5:33 160 165 3",
    "8:26 7:12 158 160 1",
    "5:55 5:55 153 165 73"
].join("\n");

// Misma familia de pantalla ("Seleccionar tipo de paso"), pero la variante
// de pista real ya soportada -- ver parser-intervals.test.js. No debe
// perderse contra la nueva rama "intervals-road": el intento de
// "recuperacion" + fila con forma de Carrera tiene que seguir ganando.
const REAL_TRACK_INTERVALS_TEXT = [
    "< Entrenamiento en pista :",
    "resumen Estadísticas Intervalos Gráficos Equipo",
    "Seleccionar tipo de paso",
    "Todos | Carrera Recuperación",
    "Int. Tipo Tiempo Dist. Ritmo",
    "m medio",
    "1 Carrera 4:21.6 1000 4:22",
    "Recuperación 2:00.0 290 6:54",
    "Total 25:45.6 4770 5:24"
].join("\n");

// La vista real de Vueltas desplazada a la FC (parser-splits.js) comparte
// las mismas columnas (GAP medio/FC media/FC máx./Ascenso total) pero
// nunca trae el filtro "Seleccionar tipo de paso" -- tiene que seguir
// cayendo en "splits", no en la nueva rama.
const REAL_HR_SPLITS_TEXT = [
    "Vuelta GAP medio Frecuencia cardiaca media Frec. cardiaca max. Ascenso total",
    "",
    "min/km ppm ppm m",
    "1 5:30 140 152 16",
    "2 5:34 153 157 1"
].join("\n");

describe("screen-detector — Intervalos de una Carrera normal (sin tramos de Recuperación)", () => {

    it("la identifica como 'intervals-road', no como 'splits'", () => {

        expect(detect(REAL_INTERVALS_ROAD_TEXT).type).toBe("intervals-road");

    });

    it("no roba la variante de pista, que sigue siendo 'intervals'", () => {

        expect(detect(REAL_TRACK_INTERVALS_TEXT).type).toBe("intervals");

    });

    it("no afecta a la vista real de Vueltas con FC, que sigue siendo 'splits'", () => {

        expect(detect(REAL_HR_SPLITS_TEXT).type).toBe("splits");

    });

});
