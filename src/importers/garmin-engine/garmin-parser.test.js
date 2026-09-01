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
    // fusion.test.js): combinar varias capturas de Intervalos por número de
    // vuelta relativo -- lo que este test comprobaba originalmente --
    // generaba splits duplicados/fuera de rango en el entreno real de
    // 13,02 km. Después de eso (bug real reportado tras el fix: la FC
    // desaparecía al 100% porque la vista izquierda, sin FC, siempre "ganaba
    // entera"), mergeIntervalsRoadLaps() combina en su lugar por posición
    // real: leftResult (con distancia) forma la columna vertebral, y
    // rightResult aporta FC a esa misma posición real una vez verificado
    // que su ritmo coincide ("6:10" en ambas) -- distancia y FC conviven en
    // la misma fila en vez de que una se pierda por completo. Los bloques
    // (mergeBlocks) siguen fusionando con normalidad -- su número ya es
    // absoluto, ese mecanismo nunca tuvo este problema.
    it("con dos capturas de Intervalos (empate en filas hijas), la que trae distancia forma la columna vertebral y la otra le aporta la FC verificada por ritmo", () => {

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

    // Bug real reportado por el usuario tras el fix del "km 17"/"km 19"
    // (commits 816c120/540d26c): el orden y count de splits ya eran
    // correctos, pero la FC real (verificada a mano por el usuario contra
    // Garmin Connect: split 3 → 154/157, entre otros) desaparecía por
    // completo -- REAL_RIGHT_VIEW_TEXT (la única de las 3 capturas con FC)
    // se descartaba entera porque REAL_LEFT_VIEW_TEXT (sin FC) tiene más
    // filas. null en las posiciones 5-11 es correcto y esperado: ninguna de
    // las 3 capturas de este fixture aporta FC verificable para esas
    // posiciones concretas (no se inventa).
    const EXPECTED_14_HR = [
        "140/149", "151/155", "154/157", "153/157",
        "null/null", "null/null", "null/null", "null/null", "null/null", "null/null", "null/null",
        "159/161", "160/165", "158/160"
    ];

    it.each([
        ["izquierda, derecha-con-dist, derecha-sin-dist", () => [REAL_LEFT_VIEW_TEXT, REAL_RIGHT_VIEW_TEXT, REAL_INTERVALS_ROAD]],
        ["derecha-con-dist, derecha-sin-dist, izquierda", () => [REAL_RIGHT_VIEW_TEXT, REAL_INTERVALS_ROAD, REAL_LEFT_VIEW_TEXT]],
        ["derecha-sin-dist, izquierda, derecha-con-dist", () => [REAL_INTERVALS_ROAD, REAL_LEFT_VIEW_TEXT, REAL_RIGHT_VIEW_TEXT]]
    ])("orden de subida %s: workout.splits tiene exactamente 14 splits reales, sin duplicados ni fuera de rango, y conserva la FC real de la vista derecha", (_label, getTexts) => {

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

        expect(workout.splits.map(s => `${s.avgHr}/${s.maxHr}`)).toEqual(EXPECTED_14_HR);

    });

});

// Transcrito a mano de las 7 capturas REALES del dispositivo (no las de
// arriba, que son una reconstrucción mínima) para este mismo entreno de
// 13,02 km, aportadas por el usuario tras reportar que, incluso con el fix
// de mergeIntervalsRoadLaps ya desplegado, la importación real seguía
// cortando a 10 km sin FC. Causa real encontrada con estas 7 capturas
// concretas: ninguna vista izquierda individual cabe entera (63f2745f llega
// hasta la posición 10, d57bb0c1 solo cubre 6-14) -- el esqueleto necesita
// combinar VARIAS capturas con distancia por solape de ritmo antes de que
// las capturas de FC (todas parciales, una de ellas -- f9aa31df -- sin ver
// ningún bloque en absoluto) puedan aportar nada. Cubre además el caso de
// la fila "Total" de Garmin colándose sin ninguna etiqueta que la distinga
// de un km real cuando la vista de FC está desplazada del todo a la derecha
// (99475cee, ritmo "5:55" que no es de ningún km real de este entreno).
//
// El texto de las 7 capturas se corrigió después (ver el bug real reportado
// tras 3f8ff00: FC ausente en los km 9-11) para que sea el que de verdad
// produce Tesseract, no una transcripción idealizada -- reproducido a mano
// con el mismo pipeline enhance()+two-pass de recognize.js (gris, sin
// reintento en binario porque ninguna de las 7 mejora el recuento de campos)
// contra los 7 JPG reales. La transcripción anterior "limpiaba" sin querer
// la basura OCR que Tesseract prepone real y sistemáticamente a la fila de
// bloque ("7N 1 Carrera...", "NV 2 Carrera...") cuando lee el icono de
// "EXPANDIR"/scroll justo encima -- con eso limpio, el número de bloque SÍ
// se reconocía y el test pasaba aunque el bug real (ver más abajo) seguía
// vivo. Con la basura real delante, NINGUNA fila de bloque de las 3 vistas
// izquierda logra reconocerse (LEFT_BLOCK_ROW exige que la línea EMPIECE
// por el número), así que ningún bloque llega a saber su distancia real y
// retagSequenceWithBlocks() nunca llega a etiquetar el esqueleto -- el bug
// real no estaba ahí (el esqueleto de distancia/ritmo se arma igual por
// solape de ritmo, ver mergeIntervalsRoadLaps), sino en que matchByKey()
// daba por resuelta la fila huérfana de RIGHT_3 (posiciones 9-11) contra la
// posición 1-3 (la única cuenta de "childIndex por bloque" que
// resolveOrphanRun podía ver en ese momento, la que ya había dejado
// RIGHT_1 en el esqueleto) aunque el ritmo no coincidiera -- applyFieldMerge
// rechazaba la fusión por el ritmo contradictorio, pero matchByKey no
// miraba ese resultado y la daba igualmente por "ya resuelta", perdiendo su
// FC real en vez de dejarla caer al solape de ritmo (que sí la sitúa bien).
describe("garmin-parser — 7 capturas reales del dispositivo (entreno 13,02 km, 29 ago), ninguna vista cabe entera", () => {

    const LEFT_1 = [ // 63f2745f -- bloque 1 completo hasta la posición 10 (falta la 11); "7N " delante del número de bloque es basura OCR real (icono de scroll/EXPANDIR), no un error de transcripción
        "20:21 N sl 56 0 >",
        "< Carrera :",
        "lesumen Estadísticas Intervalos Gráficos Equipo",
        "- EXPANDIR",
        "Int. Tipo Tiempo Dist. Ritmo",
        "km medio",
        "7N 1 Carrera 1:05:44.6 11,00 5:59",
        "Carrera 5:16.9 1,00 5:17",
        "Carrera 5:24.8 1,00 5:25",
        "Carrera 5:48.9 1,00 5:49",
        "Carrera 5:50.2 1,00 5:50",
        "Carrera 5:52.4 1,00 5:52",
        "Carrera 6:09.1 1,00 6:09",
        "Carrera 6:08.0 1,00 6:08",
        "Carrera 6:12.9 1,00 6:13",
        "Carrera 6:09.9 1,00 6:10",
        "Carrera 6:22.7 1,00 6:23"
    ].join("\n");

    const LEFT_2 = [ // 12f756cf -- posiciones 3-11, bloque 2 colapsado (sin sus hijas); "T5489" (posición 3) y "NV 2 Carrera..." (bloque 2) son basura OCR real, no un error de transcripción
        "20:21 A wl 5G @",
        "< Carrera :",
        "lesumen Estadísticas Intervalos Gráficos Equipo",
        "Carrera T5489 1,00 5:49",
        "Carrera 5:50.2 1,00 5:50",
        "Carrera 5:52.4 1,00 5:52",
        "Carrera 6:09.1 1,00 6:09",
        "Carrera 6:08.0 1,00 6:08",
        "Carrera 6:12.9 1,00 6:13",
        "Carrera 6:09.9 1,00 6:10",
        "Carrera 6:22.7 1,00 6:23",
        "Carrera 6:28.5 1,00 6:29",
        "NV 2 Carrera 11:17.6 2,02 5:35",
        "Total 1:17:02.2 13,02 5:55"
    ].join("\n");

    const LEFT_3 = [ // d57bb0c1 -- posiciones 6-11 + bloque 2 con sus 3 hijas + Total; "©" (posición 6) y "7N 2 Carrera..." (bloque 2) son basura OCR real, no un error de transcripción
        "20:21 A wl 5G @",
        "< Carrera :",
        "lesumen Estadísticas Intervalos Gráficos Equipo",
        "Carrera © 6:091 1,00 6:09",
        "Carrera 6:08.0 1,00 6:08",
        "Carrera 6:12.9 1,00 6:13",
        "Carrera 6:09.9 1,00 6:10",
        "Carrera 6:22.7 1,00 6:23",
        "Carrera 6:28.5 1,00 6:29",
        "7N 2 Carrera 11:17.6 2,02 5:35",
        "Carrera 5:33.0 1,00 5:33",
        "Carrera 5:32.7 1,00 5:33",
        "Carrera 0:11.9 0,02 8:26",
        "Total 1:17:02.2 13,02 5:55"
    ].join("\n");

    const RIGHT_1 = [ // 0e4dd1d0 -- bloque 1 + posiciones 1-4 (FC)
        "Seleccionar tipo de paso",
        "Todos Carrera",
        "Int. Ritmo medio GAP medio Frecuencia cardiaca media Frec. cardiaca max. Ascenso total Desce",
        "min/km ppm ppm m",
        "1 5:59 5:59 152 159 66",
        "5:17 5:22 140 149 5",
        "5:25 5:25 151 155 3",
        "5:49 5:44 154 157 7"
    ].join("\n");

    const RIGHT_2 = [ // f9aa31df -- posiciones 4-8 (FC), sin ver ningún bloque en absoluto
        "Seleccionar tipo de paso",
        "Todos Carrera",
        "Int. Ritmo medio GAP medio Frecuencia cardiaca media Frec. cardiaca max. Ascenso total Desce",
        "min/km ppm ppm m",
        "5:50 5:50 153 157 9",
        "5:52 5:52 153 156 4",
        "6:09 6:06 154 159 15",
        "6:08 6:10 154 159 6",
        "6:13 6:14 154 159 3"
    ].join("\n");

    const RIGHT_3 = [ // 1a66469c -- cola del bloque 1 (posiciones 9-11, sin ver el bloque 1) + bloque 2. Esta es la captura cuya FC real se perdía (bug real reportado tras 3f8ff00): sin ver ningún bloque antes de sus 3 filas, quedaban huérfanas y resolveOrphanRun las anclaba mal contra un recuento de bloque todavía incompleto (ver el comentario del describe)
        "Seleccionar tipo de paso",
        "Todos Carrera",
        "Int. Ritmo medio GAP medio Frecuencia cardiaca media Frec. cardiaca max. Ascenso total Desce",
        "min/km ppm ppm m",
        "6:10 6:14 154 157 1",
        "6:23 6:18 154 157 6",
        "6:29 6:29 153 156 9",
        "2 5:35 5:35 159 165 7"
    ].join("\n");

    const RIGHT_4 = [ // 99475cee -- bloque 2 + sus 3 hijas (FC) + fila "Total" espuria (ritmo "5:55", ningún km real)
        "Seleccionar tipo de paso",
        "Todos Carrera",
        "Int. Ritmo medio GAP medio Frecuencia cardiaca media Frec. cardiaca max. Ascenso total Desce",
        "min/km ppm ppm m",
        "2 5:35 5:35 159 165 7",
        "5:33 5:34 159 161 2",
        "5:33 5:33 160 165 3",
        "8:26 7:12 158 160 1",
        "5:55 5:55 153 165 73"
    ].join("\n");

    const ALL_7 = [LEFT_1, LEFT_2, LEFT_3, RIGHT_1, RIGHT_2, RIGHT_3, RIGHT_4];

    const EXPECTED_PACES = ["5:17", "5:25", "5:49", "5:50", "5:52", "6:09", "6:08", "6:13", "6:10", "6:23", "6:29", "5:33", "5:33", "8:26"];

    const EXPECTED_HR = [
        "140/149", "151/155", "154/157", "153/157", "153/156",
        "154/159", "154/159", "154/159", "154/157", "154/157", "153/156",
        "159/161", "160/165", "158/160"
    ];

    it.each([
        ["orden real de subida", () => ALL_7],
        ["orden inverso", () => [...ALL_7].reverse()],
        ["orden mezclado", () => [RIGHT_4, LEFT_3, RIGHT_1, RIGHT_3, LEFT_1, RIGHT_2, LEFT_2]]
    ])("%s: 14 splits reales, sin la fila 'Total' espuria, con FC completa en las 14 posiciones", (_label, getTexts) => {

        const workout = parseGarminWorkout(merge(getTexts().map(parse)));

        expect(workout.splits).toHaveLength(14);
        expect(workout.splits.map(s => s.lap)).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
        expect(workout.splits.reduce((sum, s) => sum + s.distanceKm, 0)).toBeCloseTo(13.02, 5);
        expect(workout.splits.map(s => s.paceSecPerKm)).toEqual(EXPECTED_PACES.map(pace => {
            const [m, s] = pace.split(":").map(Number);
            return m * 60 + s;
        }));

        // Ninguna fila con ritmo "5:55" (la fila "Total" espuria de 99475cee)
        // -- su ritmo no coincide con ningún km real, así que no encaja en
        // ninguna posición del esqueleto y se descarta.
        expect(workout.splits.some(s => s.paceSecPerKm === 5 * 60 + 55)).toBe(false);

        expect(workout.splits.map(s => `${s.avgHr}/${s.maxHr}`)).toEqual(EXPECTED_HR);

    });

});
