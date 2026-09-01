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

    // Ampliación del fix anterior: las filas hijas ya NO se ignoran -- son
    // splits reales de 1 km, con la misma forma que usa parser-splits.js
    // (lap/distance_km/pace_min_km), para que fusion.js/garmin.js las
    // fusionen en workout.splits por el mismo camino que cualquier otro
    // entreno (RITMO POR KILÓMETRO no distingue el origen del split).
    it("extrae las 14 filas hijas (11 del bloque 1 + 3 del bloque 2) como splits de 1 km, ancladas a su bloque real y su posición dentro de él", () => {

        const { extras } = parse(REAL_LEFT_VIEW_TEXT);

        expect(extras.laps).toHaveLength(14);

        expect(extras.laps[0]).toEqual({ blockLap: 1, childIndex: 1, distance_km: 1, pace_min_km: "5:17" });
        expect(extras.laps[10]).toEqual({ blockLap: 1, childIndex: 11, distance_km: 1, pace_min_km: "6:29" });
        expect(extras.laps[11]).toEqual({ blockLap: 2, childIndex: 1, distance_km: 1, pace_min_km: "5:33" });
        expect(extras.laps[13]).toEqual({ blockLap: 2, childIndex: 3, distance_km: 0.02, pace_min_km: "8:26" });

        const totalKm = extras.laps.reduce((sum, l) => sum + l.distance_km, 0);
        expect(totalKm).toBeCloseTo(13.02, 5);

    });

    it("la suma de las filas hijas de cada bloque cuadra con la distancia del bloque -- sin avisos", () => {

        const { extras } = parse(REAL_LEFT_VIEW_TEXT);
        expect(extras.warnings).toEqual([]);

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

    it("extrae también las filas hijas de esta vista, con distancia/ritmo/FC media/FC máx. propias", () => {

        const { extras } = parse(REAL_RIGHT_VIEW_TEXT);

        expect(extras.laps).toEqual([
            { blockLap: 1, childIndex: 1, distance_km: 1, pace_min_km: "5:17", avg_heart_rate_bpm: 140, max_heart_rate_bpm: 149 },
            { blockLap: 1, childIndex: 2, distance_km: 1, pace_min_km: "5:25", avg_heart_rate_bpm: 151, max_heart_rate_bpm: 155 },
            { blockLap: 1, childIndex: 3, distance_km: 1, pace_min_km: "5:49", avg_heart_rate_bpm: 154, max_heart_rate_bpm: 157 },
            { blockLap: 1, childIndex: 4, distance_km: 1, pace_min_km: "5:50", avg_heart_rate_bpm: 153, max_heart_rate_bpm: 157 },
            { blockLap: 2, childIndex: 1, distance_km: 1, pace_min_km: "5:33", avg_heart_rate_bpm: 159, max_heart_rate_bpm: 161 },
            { blockLap: 2, childIndex: 2, distance_km: 1, pace_min_km: "5:33", avg_heart_rate_bpm: 160, max_heart_rate_bpm: 165 },
            { blockLap: 2, childIndex: 3, distance_km: 0.02, pace_min_km: "8:26", avg_heart_rate_bpm: 158, max_heart_rate_bpm: 160 }
        ]);

    });

    // Este fragmento de captura (transcrito a mano, no la tabla completa)
    // solo trae 4 de las 11 filas hijas reales del bloque 1 -- a propósito,
    // para verificar que un desajuste real entre la distancia del bloque y
    // la suma de sus filas hijas se señala en vez de forzarse. El bloque 2
    // sí trae sus 3 filas completas y cuadra, así que solo debe avisar del 1.
    it("si la suma de las filas hijas de un bloque no cuadra con la distancia del bloque, avisa en vez de forzar el dato", () => {

        const { extras } = parse(REAL_RIGHT_VIEW_TEXT);

        expect(extras.warnings).toEqual([
            "El bloque 1 de Intervalos mide 11 km pero sus filas de 1 km suman 4.00 km -- revisar la captura."
        ]);

    });

});

// Transcrito a mano a partir de 4 capturas reales aportadas por el usuario
// en una conversación anterior (mismo entreno, pero desplazado un paso más
// a la derecha que REAL_RIGHT_VIEW_TEXT -- sin columna de Distancia). Este
// fue el caso que originalmente se detectaba mal como "splits" (commit
// b752969) -- y, según confirmó el usuario más tarde, la vista que de
// verdad usó para importar este entreno (ver REAL_INTERVALS_ROAD en
// garmin-parser.test.js), así que sus filas hijas SÍ deben aportar FC por
// km a workout.splits aunque no traigan distancia.
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

    // Sin columna de Distancia no hay con qué formar la distancia del
    // split (a diferencia de las otras dos vistas), pero el ritmo y la FC
    // por km SÍ son datos reales -- se extraen igual, sin distance_km. Las
    // 3 filas aparecen ANTES de ver ningún bloque en esta captura concreta
    // (el bloque 1, al que en realidad pertenecen, quedó recortado por
    // encima del encuadre) -- blockLap queda null aquí; es fusion.js
    // (mergeIntervalsRoadLaps) quien la resuelve después usando el primer
    // bloque que SÍ aparece en esta misma captura (extras.blocks[0]) y
    // cuántas filas hijas tiene ese bloque según otra captura más completa.
    // Sin esto, workout.splits se quedaba sin FC por km pese a que la
    // captura sí la traía, y RITMO POR KILÓMETRO perdía el toggle/la línea
    // de FC/el bloque de análisis.
    it("extrae las 3 filas hijas con ritmo y FC, sin distance_km ni blockLap (bloque recortado por encima) -- y no genera avisos de descuadre (no hay distancia que comprobar)", () => {

        const { extras } = parse(REAL_RIGHT_VIEW_NO_DIST_TEXT);

        expect(extras.laps).toEqual([
            { blockLap: null, childIndex: 1, pace_min_km: "6:10", avg_heart_rate_bpm: 154, max_heart_rate_bpm: 157 },
            { blockLap: null, childIndex: 2, pace_min_km: "6:23", avg_heart_rate_bpm: 154, max_heart_rate_bpm: 157 },
            { blockLap: null, childIndex: 3, pace_min_km: "6:29", avg_heart_rate_bpm: 153, max_heart_rate_bpm: 156 }
        ]);

        expect(extras.warnings).toEqual([]);

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
        expect(extras.laps).toEqual([]);
        expect(extras.warnings).toEqual([]);

    });

});
