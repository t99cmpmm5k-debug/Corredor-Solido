import { describe, it, expect } from "vitest";
import { parse } from "./parser-intervals-road.js";

// Transcrito a mano a partir de 2 capturas reales aportadas por el usuario
// (mismo entreno de 13,02 km: bloque 1 de 11 km Z2 + bloque 2 de 2,02 km
// rápido), vista "izquierda" de la tabla -- Int./Tipo/Tiempo/Distancia/
// Ritmo medio. La fila de bloque 1 trae horas en el tiempo (dura más de
// una), la de bloque 2 no.
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

// Misma pareja de bloques, vista "derecha" -- Int./Distancia/Ritmo medio/
// GAP medio/Frecuencia cardiaca media/Frec. cardiaca máx.
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

describe("parser-intervals-road — vista izquierda (Int./Tipo/Tiempo/Distancia/Ritmo medio)", () => {

    it("extrae los 2 bloques reales (11 km y 2,02 km), no las filas hijas de 1 km ni el Total", () => {

        const { extras } = parse(REAL_LEFT_VIEW_TEXT);

        expect(extras.blocks).toEqual([
            { lap: 1, type: "Carrera", duration: "1:05:44", distance_km: 11, pace_min_km: "5:59" },
            { lap: 2, type: "Carrera", duration: "11:17", distance_km: 2.02, pace_min_km: "5:35" }
        ]);

    });

});

describe("parser-intervals-road — vista derecha (Int./Distancia/Ritmo medio/GAP medio/FC media/FC máx.)", () => {

    it("extrae los 2 bloques reales con su FC media/máxima, no las filas hijas ni el Total", () => {

        const { extras } = parse(REAL_RIGHT_VIEW_TEXT);

        expect(extras.blocks).toEqual([
            { lap: 1, distance_km: 11, pace_min_km: "5:59", avg_heart_rate_bpm: 152, max_heart_rate_bpm: 159 },
            { lap: 2, distance_km: 2.02, pace_min_km: "5:35", avg_heart_rate_bpm: 159, max_heart_rate_bpm: 165 }
        ]);

    });

});

// Transcrito a mano a partir de 4 capturas reales aportadas por el usuario
// en una conversación anterior (mismo entreno, pero desplazado un paso más
// a la derecha que REAL_RIGHT_VIEW_TEXT -- sin columna de Distancia). Este
// fue el caso que originalmente se detectaba mal como "splits" (commit
// b752969); aquí solo se verifica la extracción de bloques sin distancia.
const REAL_RIGHT_VIEW_NO_DIST_TEXT = [
    "Seleccionar tipo de paso",
    "Todos Carrera",
    "Int. Ritmo medio GAP medio Frecuencia cardiaca media Frec. cardiaca max. Ascenso total Descenso total",
    "min/km min/km ppm ppm m m",
    "6:10 6:14 154 157 1",
    "6:23 6:18 154 157 6",
    "6:29 6:29 153 156 9",
    "2 5:35 5:35 159 165 7"
].join("\n");

describe("parser-intervals-road — vista derecha sin columna de Distancia (desplazada un paso más)", () => {

    it("extrae el bloque real (Int.=2) sin distancia, ignora las filas hijas sin número", () => {

        const { extras } = parse(REAL_RIGHT_VIEW_NO_DIST_TEXT);

        expect(extras.blocks).toEqual([
            { lap: 2, pace_min_km: "5:35", avg_heart_rate_bpm: 159, max_heart_rate_bpm: 165 }
        ]);

    });

});

describe("parser-intervals-road — identifica la pantalla como 'intervals-road'", () => {

    it("en fields.screen_type", () => {

        const { fields } = parse(REAL_LEFT_VIEW_TEXT);

        expect(fields.screen_type.value).toBe("intervals-road");

    });

});

describe("parser-intervals-road — sin ninguna fila reconocible", () => {

    it("no rompe y devuelve una lista de bloques vacía", () => {

        const { extras } = parse("Resumen\nAñadir notas\n5 km en 25:00");

        expect(extras.blocks).toEqual([]);

    });

});
