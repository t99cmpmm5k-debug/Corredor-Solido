import { describe, it, expect } from "vitest";
import { parse } from "./garmin-parser.js";
import { merge } from "./fusion.js";
import { parseGarminWorkout } from "../garmin.js";

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

// Transcrito a mano a partir de 5 capturas reales aportadas por el usuario
// (pantalla "Intervalos" de una Carrera normal, entreno de 13,02 km: 11 km
// + 2,02 km -- ver screen-detector.test.js y parser-intervals-road.test.js).
// Recortada justo a la tabla, sin barra de estado real por encima -- la
// primera línea es ya el filtro "Seleccionar tipo de paso".
const REAL_INTERVALS_ROAD = [
    "Seleccionar tipo de paso",
    "Todos Carrera",
    "Int. Ritmo medio GAP medio Frecuencia cardiaca media Frec. cardiaca max. Ascenso total Descenso total",
    "min/km min/km ppm ppm m m",
    "6:10 6:14 154 157 1",
    "2 5:35 5:35 159 165 7"
].join("\n");

// Misma pantalla, pero capturada sin recortar -- con la barra de estado
// real del móvil por encima de la barra de pestañas de la app.
const REAL_INTERVALS_ROAD_WITH_STATUS_BAR = [
    "1:13 ▲ 74% wifi",
    "Resumen Estadísticas Intervalos Gráficos Equipo",
    "Int. Tipo Tiempo Dist. Ritmo medio",
    "1 Carrera 1:05:44.6 11,00 5:59",
    "2 Carrera 11:17.6 2,02 5:35"
].join("\n");

describe("garmin-parser.parse — Intervalos de una Carrera normal (bloques reales, no splits de 1 km)", () => {

    it("la reconoce como 'intervals-road' y extrae el bloque real (Int.=2), sin tocar las filas hijas sin número", () => {

        const result = parse(REAL_INTERVALS_ROAD);

        expect(result.screen.type).toBe("intervals-road");
        expect(result.extras.blocks).toEqual([
            { lap: 2, pace_min_km: "5:35", avg_heart_rate_bpm: 159, max_heart_rate_bpm: 165 }
        ]);

    });

    it("con barra de estado real por encima, quita solo esa línea y extrae los 2 bloques (11 km y 2,02 km)", () => {

        const result = parse(REAL_INTERVALS_ROAD_WITH_STATUS_BAR);

        expect(result.screen.type).toBe("intervals-road");
        expect(result.extras.blocks).toEqual([
            { lap: 1, type: "Carrera", duration: "1:05:44", distance_km: 11, pace_min_km: "5:59" },
            { lap: 2, type: "Carrera", duration: "11:17", distance_km: 2.02, pace_min_km: "5:35" }
        ]);

    });

    // Vista izquierda (Tipo/Tiempo/Distancia/Ritmo) del MISMO entreno, con
    // el mismo primer split hijo (ritmo "6:10") que REAL_INTERVALS_ROAD.
    const REAL_LEFT_VIEW_PARTIAL = [
        "Seleccionar tipo de paso",
        "Todos Carrera",
        "Int. Tipo Tiempo Dist. Ritmo medio",
        "1 Carrera 1:05:44.6 11,00 5:59",
        "Carrera 6:10.0 1,00 6:10",
        "2 Carrera 11:17.6 2,02 5:35"
    ].join("\n");

    // Corrección posterior (bug real "km 17"/"km 19" en producción, ver
    // fusion.test.js "mergeSingleIntervalsRoadCapture"): combinar varias
    // capturas de Intervalos por número de vuelta relativo -- lo que este
    // test comprobaba originalmente -- generaba splits duplicados/fuera de
    // rango en el entreno real de 13,02 km. Ahora NUNCA se combinan: se usa
    // una sola captura de Intervalos (la más completa; a igualdad, la que
    // trae FC), y las demás se descartan enteras para `laps` -- aquí las
    // dos capturas tienen 1 fila hija cada una (empate), así que gana la
    // que trae FC (REAL_INTERVALS_ROAD) y la distancia de la otra captura
    // se pierde -- correcto: menos dato disponible es preferible a un dato
    // fusionado con la vuelta equivocada. Los bloques (mergeBlocks) SÍ
    // siguen fusionando con normalidad -- su número ya es absoluto, ese
    // mecanismo nunca tuvo este problema.
    it("con dos capturas de Intervalos (empate en filas hijas), gana la que trae FC -- nunca se combinan por número de vuelta relativo", () => {

        const leftResult = parse(REAL_LEFT_VIEW_PARTIAL);
        const rightResult = parse(REAL_INTERVALS_ROAD);

        const { laps, blocks } = merge([leftResult, rightResult]);

        expect(laps).toEqual([
            { lap: 1, pace_min_km: "6:10", avg_heart_rate_bpm: 154, max_heart_rate_bpm: 157 }
        ]);

        expect(blocks).toEqual([
            { lap: 1, type: "Carrera", duration: "1:05:44", distance_km: 11, pace_min_km: "5:59" },
            { lap: 2, type: "Carrera", duration: "11:17", distance_km: 2.02, pace_min_km: "5:35", avg_heart_rate_bpm: 159, max_heart_rate_bpm: 165 }
        ]);

    });

    // Verificación pedida por el usuario tras el bug real de splits
    // duplicados/fuera de rango (km 17, luego km 19): pipeline COMPLETO
    // (texto OCR real -> garmin-parser.parse -> fusion.merge ->
    // garmin.parseGarminWorkout), con las 3 capturas reales de este mismo
    // entreno de 13,02 km (sábado 29 ago) ya transcritas en el repo --
    // vista izquierda completa (REAL_LEFT_VIEW_TEXT, parser-intervals-
    // road.test.js), vista derecha con distancia parcial (REAL_RIGHT_VIEW_
    // TEXT, misma fuente) y vista derecha sin distancia parcial
    // (REAL_INTERVALS_ROAD, arriba en este archivo). Confirma que
    // workout.splits.length es exactamente 14 (los 13,02 km reales,
    // último de 0,02 km) pase lo que pase con el orden de subida de las
    // capturas, sin duplicados de ritmo ni ningún "lap" fuera de 1-14.
    const REAL_LEFT_VIEW_TEXT = [
        "Resumen Estadísticas Intervalos Gráficos Equipo",
        "Int. Tipo Tiempo Dist. Ritmo medio",
        "km",
        "1 Carrera 1:05:44.6 11,00 5:59",
        "Carrera 5:16.9 1,00 5:17",
        "Carrera 5:24.8 1,00 5:25",
        "Carrera 5:48.9 1,00 5:49",
        "Carrera 5:50.2 1,00 5:50",
        "Carrera 5:52.4 1,00 5:52",
        "Carrera 6:09.1 1,00 6:09",
        "Carrera 6:08.0 1,00 6:08",
        "Carrera 6:12.9 1,00 6:13",
        "Carrera 6:09.9 1,00 6:10",
        "Carrera 6:22.7 1,00 6:23",
        "Carrera 6:28.5 1,00 6:29",
        "2 Carrera 11:17.6 2,02 5:35",
        "Carrera 5:33.0 1,00 5:33",
        "Carrera 5:32.7 1,00 5:33",
        "Carrera 0:11.9 0,02 8:26",
        "Total 1:17:02.2 13,02 5:55"
    ].join("\n");

    const REAL_RIGHT_VIEW_TEXT = [
        "Seleccionar tipo de paso",
        "Todos Carrera",
        "Int. Distancia Ritmo medio GAP medio Frecuencia cardiaca media Frec. cardiaca max.",
        "km min/km min/km ppm ppm",
        "1 11,00 5:59 5:59 152 159",
        "1,00 5:17 5:22 140 149",
        "1,00 5:25 5:25 151 155",
        "1,00 5:49 5:44 154 157",
        "1,00 5:50 5:50 153 157",
        "2 2,02 5:35 5:35 159 165",
        "1,00 5:33 5:34 159 161",
        "1,00 5:33 5:33 160 165",
        "0,02 8:26 7:12 158 160",
        "Total 13,02 5:55 5:55 153 165"
    ].join("\n");

    const EXPECTED_14_PACES = ["5:17", "5:25", "5:49", "5:50", "5:52", "6:09", "6:08", "6:13", "6:10", "6:23", "6:29", "5:33", "5:33", "8:26"];

    it.each([
        ["izquierda, derecha-con-dist, derecha-sin-dist", () => [REAL_LEFT_VIEW_TEXT, REAL_RIGHT_VIEW_TEXT, REAL_INTERVALS_ROAD]],
        ["derecha-con-dist, derecha-sin-dist, izquierda", () => [REAL_RIGHT_VIEW_TEXT, REAL_INTERVALS_ROAD, REAL_LEFT_VIEW_TEXT]],
        ["derecha-sin-dist, izquierda, derecha-con-dist", () => [REAL_INTERVALS_ROAD, REAL_LEFT_VIEW_TEXT, REAL_RIGHT_VIEW_TEXT]]
    ])("orden de subida %s: workout.splits tiene exactamente 14 splits reales, sin duplicados ni fuera de rango", (_label, getTexts) => {

        const results = getTexts().map(parse);
        const merged = merge(results);
        const workout = parseGarminWorkout(merged);

        expect(workout.splits).toHaveLength(14);
        expect(workout.splits.map(s => s.lap)).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
        expect(workout.splits.map(s => s.distanceKm).reduce((sum, d) => sum + d, 0)).toBeCloseTo(13.02, 5);

        const paces = workout.splits.map(s => {
            const sec = s.paceSecPerKm;
            return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
        });
        expect(paces).toEqual(EXPECTED_14_PACES);

    });

});
