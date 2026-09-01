import { describe, it, expect } from "vitest";
import { parse } from "./garmin-parser.js";
import { merge } from "./fusion.js";

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
    // el mismo primer split hijo (ritmo "6:10") que REAL_INTERVALS_ROAD --
    // para probar la integración real que faltaba: esta era la vista que de
    // verdad usó el usuario para importar este entreno (RIGHT sin
    // distancia, ver el fix de más arriba), y sin extraer su FC por km,
    // workout.splits se quedaba sin FC pese a que la captura sí la traía.
    const REAL_LEFT_VIEW_PARTIAL = [
        "Seleccionar tipo de paso",
        "Todos Carrera",
        "Int. Tipo Tiempo Dist. Ritmo medio",
        "1 Carrera 1:05:44.6 11,00 5:59",
        "Carrera 6:10.0 1,00 6:10",
        "2 Carrera 11:17.6 2,02 5:35"
    ].join("\n");

    it("integración real: la vista izquierda (distancia/ritmo) + la vista derecha sin distancia (ritmo/FC) fusionan en el mismo split -- no en dos independientes", () => {

        const leftResult = parse(REAL_LEFT_VIEW_PARTIAL);
        const rightResult = parse(REAL_INTERVALS_ROAD);

        const { laps, blocks } = merge([leftResult, rightResult]);

        expect(laps).toEqual([
            { lap: 1, distance_km: 1, pace_min_km: "6:10", avg_heart_rate_bpm: 154, max_heart_rate_bpm: 157 }
        ]);

        expect(blocks).toEqual([
            { lap: 1, type: "Carrera", duration: "1:05:44", distance_km: 11, pace_min_km: "5:59" },
            { lap: 2, type: "Carrera", duration: "11:17", distance_km: 2.02, pace_min_km: "5:35", avg_heart_rate_bpm: 159, max_heart_rate_bpm: 165 }
        ]);

    });

});
