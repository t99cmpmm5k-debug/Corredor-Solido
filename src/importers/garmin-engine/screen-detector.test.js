import { describe, it, expect } from "vitest";
import { detect } from "./screen-detector.js";

// Texto transcrito a mano a partir de 4 capturas reales aportadas por el
// usuario (no se corrió tesseract.js real sobre los píxeles en este
// entorno, pero la forma de la tabla -- cabecera, chips de filtro,
// columnas -- es la real). Pantalla "Intervalos" de una Carrera normal
// (no en pista): filtro "Seleccionar tipo de paso" con chips "Todos" /
// "Carrera" (sin "Recuperación", a diferencia de la vista de pista), y
// columna "Int." con número solo en algunas filas -- el resto quedan en
// blanco, agrupadas bajo el bloque anterior. Esta posición de scroll
// concreta (desplazada del todo a la derecha) no llega a ver la columna
// Distancia -- otra posición sí la trae, ver REAL_LEFT_VIEW_TEXT en
// parser-intervals-road.test.js.
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

// Transcrito a mano a partir de una captura real (ver
// parser-intervals-road.test.js, REAL_LEFT_VIEW_TEXT): vista Int./Tipo/
// Tiempo/Distancia/Ritmo medio, desplazada hacia abajo lo bastante para que
// "Seleccionar tipo de paso" y los chips ya no estén visibles -- solo queda
// la barra de pestañas fija de la app ("...Intervalos...") como señal.
const REAL_LEFT_VIEW_SCROLLED_TEXT = [
    "Resumen Estadísticas Intervalos Gráficos Equipo",
    "Int. Tipo Tiempo Dist. Ritmo medio",
    "1 Carrera 1:05:44.6 11,00 5:59",
    "Carrera 5:16.9 1,00 5:17"
].join("\n");

// Misma barra de pestañas ("...Intervalos...", fija en toda la actividad),
// pero body real de la pantalla Estadísticas -- el fallback final por sola
// la palabra "intervalos" no debe robarle esta captura: sus propias
// etiquetas (más arriba en el orden de detect()) tienen que ganar antes de
// llegar a ese fallback.
const REAL_STATISTICS_WITH_INTERVALOS_TAB_TEXT = [
    "Resumen Estadísticas Intervalos Gráficos Equipo",
    "Distancia recorrida 13,02 km",
    "Tiempo total 1:17:02",
    "Frecuencia cardiaca media 155 ppm"
].join("\n");

describe("screen-detector — Intervalos de una Carrera normal (sin tramos de Recuperación)", () => {

    it("la identifica como 'intervals-road', no como 'splits'", () => {

        expect(detect(REAL_INTERVALS_ROAD_TEXT).type).toBe("intervals-road");

    });

    it("también la identifica cuando la tabla viene desplazada y solo se ve la barra de pestañas fija de la app", () => {

        expect(detect(REAL_LEFT_VIEW_SCROLLED_TEXT).type).toBe("intervals-road");

    });

    it("no roba la variante de pista, que sigue siendo 'intervals'", () => {

        expect(detect(REAL_TRACK_INTERVALS_TEXT).type).toBe("intervals");

    });

    it("no afecta a la vista real de Vueltas con FC, que sigue siendo 'splits'", () => {

        expect(detect(REAL_HR_SPLITS_TEXT).type).toBe("splits");

    });

    it("no le roba una captura real de Estadísticas solo porque su barra de pestañas fija diga 'Intervalos'", () => {

        expect(detect(REAL_STATISTICS_WITH_INTERVALOS_TAB_TEXT).type).toBe("statistics");

    });

});
