import { describe, it, expect } from "vitest";
import { merge } from "./fusion.js";
import { parse as parseSplits } from "./parser-splits.js";

function splitsResult(laps) {
    return { parser: "splits-v4.3", screen: { type: "splits" }, found: 0, data: {}, fields: {}, extras: { laps } };
}

function intervalsRoadResult(blocks, laps = [], warnings = []) {
    return { parser: "intervals-road-v2", screen: { type: "intervals-road" }, found: 0, data: {}, fields: {}, extras: { blocks, laps, warnings } };
}

// Bloques reales de "Intervalos" de una Carrera normal (ver
// parser-intervals-road.js) -- a diferencia de las vueltas con FC de más
// abajo, aquí el número de bloque ("Int.") ya es el real, así que no hace
// falta ningún realineamiento por solape entre capturas.
describe("fusion.merge — combinación de bloques entre la vista izquierda y derecha de Intervalos", () => {

    it("combina, para el mismo bloque, el tipo/tiempo/distancia de una captura con la FC de otra", () => {

        // Captura 1: vista izquierda (Int./Tipo/Tiempo/Distancia/Ritmo).
        const leftView = intervalsRoadResult([
            { lap: 1, type: "Carrera", duration: "1:05:44", distance_km: 11, pace_min_km: "5:59" },
            { lap: 2, type: "Carrera", duration: "11:17", distance_km: 2.02, pace_min_km: "5:35" }
        ]);

        // Captura 2: vista derecha (Int./Distancia/Ritmo medio/FC media/FC máx.).
        const rightView = intervalsRoadResult([
            { lap: 1, distance_km: 11, pace_min_km: "5:59", avg_heart_rate_bpm: 152, max_heart_rate_bpm: 159 },
            { lap: 2, distance_km: 2.02, pace_min_km: "5:35", avg_heart_rate_bpm: 159, max_heart_rate_bpm: 165 }
        ]);

        const { blocks } = merge([leftView, rightView]);

        expect(blocks).toEqual([
            { lap: 1, type: "Carrera", duration: "1:05:44", distance_km: 11, pace_min_km: "5:59", avg_heart_rate_bpm: 152, max_heart_rate_bpm: 159 },
            { lap: 2, type: "Carrera", duration: "11:17", distance_km: 2.02, pace_min_km: "5:35", avg_heart_rate_bpm: 159, max_heart_rate_bpm: 165 }
        ]);

    });

    it("rellena la distancia que falta en una captura de la vista derecha sin esa columna (desplazada un paso más)", () => {

        const leftView = intervalsRoadResult([
            { lap: 2, type: "Carrera", duration: "11:17", distance_km: 2.02, pace_min_km: "5:35" }
        ]);

        // Sin columna Distancia (ver RIGHT_BLOCK_ROW_NO_DIST en parser-intervals-road.js).
        const rightViewNoDist = intervalsRoadResult([
            { lap: 2, pace_min_km: "5:35", avg_heart_rate_bpm: 159, max_heart_rate_bpm: 165 }
        ]);

        const { blocks } = merge([leftView, rightViewNoDist]);

        expect(blocks).toEqual([
            { lap: 2, type: "Carrera", duration: "11:17", distance_km: 2.02, pace_min_km: "5:35", avg_heart_rate_bpm: 159, max_heart_rate_bpm: 165 }
        ]);

    });

    it("sin ninguna captura de Intervalos, blocks queda vacío", () => {

        const { blocks } = merge([splitsResult([{ lap: 1, distance_km: 1, pace_min_km: "5:30" }])]);

        expect(blocks).toEqual([]);

    });

});

// Ampliación del fix: las filas hijas de Intervalos (extras.laps, ver
// parser-intervals-road.js) entran en `laps` (sin ninguna captura real de
// Vueltas de por medio, ver el describe del bug del "km 17" más abajo).
// A diferencia de parser-splits.js, aquí NUNCA se combinan dos capturas de
// Intervalos por número de vuelta relativo entre sí -- solo se usa UNA,
// la más completa -- ver mergeSingleIntervalsRoadCapture() en fusion.js y
// el describe "bug del km 19/21" más abajo para el porqué.
describe("fusion.merge — filas hijas de Intervalos (splits de 1 km) entran en `laps`", () => {

    it("con una sola captura, sus filas hijas entran en `laps` tal cual", () => {

        const rightView = intervalsRoadResult(
            [{ lap: 1, distance_km: 11, pace_min_km: "5:59", avg_heart_rate_bpm: 152, max_heart_rate_bpm: 159 }],
            [
                { blockLap: 1, childIndex: 1, distance_km: 1, pace_min_km: "5:17", avg_heart_rate_bpm: 140, max_heart_rate_bpm: 149 },
                { blockLap: 1, childIndex: 2, distance_km: 1, pace_min_km: "5:25", avg_heart_rate_bpm: 151, max_heart_rate_bpm: 155 }
            ]
        );

        const { laps } = merge([rightView]);

        expect(laps).toEqual([
            { lap: 1, distance_km: 1, pace_min_km: "5:17", avg_heart_rate_bpm: 140, max_heart_rate_bpm: 149 },
            { lap: 2, distance_km: 1, pace_min_km: "5:25", avg_heart_rate_bpm: 151, max_heart_rate_bpm: 155 }
        ]);

    });

    it("los avisos de descuadre bloque/filas hijas de una captura llegan a merged.warnings", () => {

        const rightView = intervalsRoadResult(
            [{ lap: 1, distance_km: 11, pace_min_km: "5:59", avg_heart_rate_bpm: 152, max_heart_rate_bpm: 159 }],
            [{ blockLap: 1, childIndex: 1, distance_km: 1, pace_min_km: "5:17", avg_heart_rate_bpm: 140, max_heart_rate_bpm: 149 }],
            ["El bloque 1 de Intervalos mide 11 km pero sus filas de 1 km suman 1.00 km -- revisar la captura."]
        );

        const { warnings } = merge([rightView]);

        expect(warnings).toContain("El bloque 1 de Intervalos mide 11 km pero sus filas de 1 km suman 1.00 km -- revisar la captura.");

    });

});

// Bug real reportado por el usuario tras el fix del "km 17" (commit
// 816c120): el mismo entreno de 13,02 km seguía mostrando splits
// duplicados y fuera de rango (hasta km 19) DENTRO de la propia familia de
// Intervalos -- mergeLapsFromResults() (con su mecanismo de solape/
// fallback, diseñado para RE-SCROLLS genuinos de la MISMA tabla continua
// de Vueltas) se estaba reutilizando también para combinar varias
// capturas de Intervalos entre sí, y ese mecanismo no es seguro ahí: (a)
// sin solape real, el fallback "continúa tras la última vuelta conocida"
// ancla contra un número sin relación real con la captura nueva; (b)
// incluso con solape "verificado", un solo par de FC coincidente por
// casualidad (un tramo estable de carrera repite el mismo ppm en varios km
// reales distintos) basta para anclar un desplazamiento completamente
// falso.
//
// El fix de 540d26c corrigió esto usando UNA sola captura entera (la más
// completa) y descartando las demás -- pero eso resultó ser demasiado
// drástico: la vista izquierda (Tipo/Tiempo/Distancia/Ritmo) es casi
// siempre la más completa y NUNCA trae FC (esa columna no existe ahí), así
// que ganaba siempre y la FC real de la vista derecha (con FC) se perdía
// al 100 % -- bug reportado por el usuario tras verificar a mano en Garmin
// Connect que cada split sí tiene FC real. mergeIntervalsRoadLaps()
// combina ahora por POSICIÓN real (blockLap + childIndex, ver
// parser-intervals-road.js) en vez de por solape/fallback de número de
// vuelta: el número de bloque SÍ es absoluto, así que es una referencia
// segura para saber que dos filas de capturas distintas hablan del mismo
// km real, sin necesidad de adivinar ningún desplazamiento.
describe("fusion.merge — mergeIntervalsRoadLaps: varias capturas de Intervalos se combinan por posición real (bloque + índice dentro del bloque)", () => {

    it("reproduce el bug real reportado: con las 3 capturas reales de este entreno, la FC de la vista derecha sobrevive al merge en vez de perderse por completo", () => {

        // Las 3 capturas reales de este entreno (mismos ritmos que
        // REAL_LEFT_VIEW_TEXT en parser-intervals-road.test.js): vista
        // izquierda completa (14 filas hijas, sin FC), vista derecha con
        // distancia (parcial, 4 de las 11 filas del bloque 1, con FC) y
        // vista derecha sin distancia (parcial, 1 fila, con FC).
        const left14Paces = ["5:17", "5:25", "5:49", "5:50", "5:52", "6:09", "6:08", "6:13", "6:10", "6:23", "6:29", "5:33", "5:33", "8:26"];
        const left14 = intervalsRoadResult([], left14Paces.map((pace, i) => {
            const inBlock1 = i < 11;
            return {
                blockLap: inBlock1 ? 1 : 2,
                childIndex: inBlock1 ? i + 1 : i - 10,
                distance_km: i < 13 ? 1 : 0.02,
                pace_min_km: pace
            };
        }));

        const rightPartial4 = intervalsRoadResult([], [
            { blockLap: 1, childIndex: 1, distance_km: 1, pace_min_km: "5:17", avg_heart_rate_bpm: 140, max_heart_rate_bpm: 149 },
            { blockLap: 1, childIndex: 2, distance_km: 1, pace_min_km: "5:25", avg_heart_rate_bpm: 151, max_heart_rate_bpm: 155 },
            { blockLap: 1, childIndex: 3, distance_km: 1, pace_min_km: "5:49", avg_heart_rate_bpm: 154, max_heart_rate_bpm: 157 },
            { blockLap: 1, childIndex: 4, distance_km: 1, pace_min_km: "5:50", avg_heart_rate_bpm: 153, max_heart_rate_bpm: 157 }
        ]);

        // Fila huérfana (sin blockLap -- el bloque 1 al que en realidad
        // pertenece quedó recortado por encima del encuadre de esta
        // captura), pero sin ningún bloque propio detrás tampoco (extras.
        // blocks=[]) -- no hay ninguna referencia con la que posicionarla,
        // así que se descarta (más seguro que adivinar), a diferencia del
        // caso "TAIL" de más abajo, que sí trae su propio bloque siguiente.
        const rightNoDistPartial1 = intervalsRoadResult([], [
            { blockLap: null, childIndex: 1, pace_min_km: "6:10", avg_heart_rate_bpm: 154, max_heart_rate_bpm: 157 }
        ]);

        const { laps } = merge([rightPartial4, rightNoDistPartial1, left14]);

        // Las 14 filas de la columna vertebral (left14), en el mismo orden
        // y sin duplicados/huecos -- y ahora CON la FC real recuperada de
        // rightPartial4 en las posiciones 1-4 (las únicas para las que hay
        // una captura con FC y posición verificable). rightNoDistPartial1
        // se descarta entera (sin ancla), tal como debe ser.
        expect(laps).toHaveLength(14);
        expect(laps.map(l => l.lap)).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
        expect(laps.map(l => l.pace_min_km)).toEqual(left14Paces);
        expect(laps.slice(0, 4).map(l => `${l.avg_heart_rate_bpm}/${l.max_heart_rate_bpm}`)).toEqual([
            "140/149", "151/155", "154/157", "153/157"
        ]);
        expect(laps.slice(4).every(l => l.avg_heart_rate_bpm == null)).toBe(true);

    });

    it("una fila huérfana (sin blockLap) SÍ se recupera cuando la misma captura trae después su propio bloque siguiente", () => {

        // Cola real del bloque 1 (posiciones 9-11, ver REAL_RIGHT_VIEW_NO_
        // DIST_TEXT en parser-intervals-road.test.js): el bloque 1 nunca
        // aparece en esta captura (recortado por encima), pero el bloque 2
        // sí -- eso basta para inferir con seguridad que estas 3 filas son
        // las últimas 3 del bloque 1, siempre que otra captura ya confirme
        // que el bloque 1 tiene 11 filas hijas en total.
        const left14Paces = ["5:17", "5:25", "5:49", "5:50", "5:52", "6:09", "6:08", "6:13", "6:10", "6:23", "6:29", "5:33", "5:33", "8:26"];
        const left14 = intervalsRoadResult([], left14Paces.map((pace, i) => {
            const inBlock1 = i < 11;
            return {
                blockLap: inBlock1 ? 1 : 2,
                childIndex: inBlock1 ? i + 1 : i - 10,
                distance_km: i < 13 ? 1 : 0.02,
                pace_min_km: pace
            };
        }));

        const tailNoBlock1Header = intervalsRoadResult(
            [{ lap: 2, pace_min_km: "5:35", avg_heart_rate_bpm: 159, max_heart_rate_bpm: 165 }],
            [
                { blockLap: null, childIndex: 1, pace_min_km: "6:10", avg_heart_rate_bpm: 154, max_heart_rate_bpm: 157 },
                { blockLap: null, childIndex: 2, pace_min_km: "6:23", avg_heart_rate_bpm: 154, max_heart_rate_bpm: 157 },
                { blockLap: null, childIndex: 3, pace_min_km: "6:29", avg_heart_rate_bpm: 153, max_heart_rate_bpm: 156 }
            ]
        );

        const { laps } = merge([left14, tailNoBlock1Header]);

        expect(laps).toHaveLength(14);
        // Posiciones 9, 10, 11 (0-indexed 8-10) son las que la cola resuelve.
        expect(laps.slice(8, 11).map(l => `${l.avg_heart_rate_bpm}/${l.max_heart_rate_bpm}`)).toEqual([
            "154/157", "154/157", "153/156"
        ]);
        expect(laps.slice(0, 8).every(l => l.avg_heart_rate_bpm == null)).toBe(true);
        expect(laps.slice(11).every(l => l.avg_heart_rate_bpm == null)).toBe(true);

    });

    it("con dos capturas de Intervalos con el mismo número de filas y la misma posición real, se combinan campo a campo", () => {

        const withoutHr = intervalsRoadResult([], [
            { blockLap: 1, childIndex: 1, distance_km: 1, pace_min_km: "5:17" },
            { blockLap: 1, childIndex: 2, distance_km: 1, pace_min_km: "5:25" }
        ]);

        const withHr = intervalsRoadResult([], [
            { blockLap: 1, childIndex: 1, pace_min_km: "5:17", avg_heart_rate_bpm: 140, max_heart_rate_bpm: 149 },
            { blockLap: 1, childIndex: 2, pace_min_km: "5:25", avg_heart_rate_bpm: 151, max_heart_rate_bpm: 155 }
        ]);

        const { laps } = merge([withoutHr, withHr]);

        // Misma posición real (mismo blockLap/childIndex) en las dos
        // capturas -- se combinan campo a campo, como los bloques.
        expect(laps).toEqual([
            { lap: 1, distance_km: 1, pace_min_km: "5:17", avg_heart_rate_bpm: 140, max_heart_rate_bpm: 149 },
            { lap: 2, distance_km: 1, pace_min_km: "5:25", avg_heart_rate_bpm: 151, max_heart_rate_bpm: 155 }
        ]);

    });

    it("false-positive verificado: un solo par de FC coincidente por casualidad entre dos capturas distintas NO debe usarse como ancla -- sin blockLap, la fila se descarta en vez de emparejarse por FC", () => {

        // captureA: 1 fila huérfana (sin blockLap, sin ningún bloque propio
        // en esta captura), hr=154/157 (dato real de un km cualquiera).
        const captureA = intervalsRoadResult([], [
            { blockLap: null, childIndex: 1, pace_min_km: "6:10", avg_heart_rate_bpm: 154, max_heart_rate_bpm: 157 }
        ]);

        // captureB: 4 filas reales del bloque 1 -- por pura coincidencia
        // (tramo estable en Z2), su 3ª fila comparte EXACTAMENTE el mismo
        // par de FC (154/157) que captureA, sin ser el mismo km real.
        // Antes del fix "único ganador" esto ya no podía anclar nada (ver
        // commit 540d26c); con mergeIntervalsRoadLaps, sin blockLap y sin
        // ningún bloque propio detrás en captureA, ni siquiera se intenta
        // resolver su posición -- se descarta sin más.
        const captureB = intervalsRoadResult([], [
            { blockLap: 1, childIndex: 1, distance_km: 1, pace_min_km: "5:17", avg_heart_rate_bpm: 140, max_heart_rate_bpm: 149 },
            { blockLap: 1, childIndex: 2, distance_km: 1, pace_min_km: "5:25", avg_heart_rate_bpm: 151, max_heart_rate_bpm: 155 },
            { blockLap: 1, childIndex: 3, distance_km: 1, pace_min_km: "5:49", avg_heart_rate_bpm: 154, max_heart_rate_bpm: 157 },
            { blockLap: 1, childIndex: 4, distance_km: 1, pace_min_km: "5:50", avg_heart_rate_bpm: 153, max_heart_rate_bpm: 157 }
        ]);

        const { laps } = merge([captureA, captureB]);

        // captureB gana (más filas) tal cual -- captureA se descarta
        // entera, ningún número negativo ni cero, ninguna FC prestada.
        expect(laps.every(l => l.lap >= 1)).toBe(true);
        expect(laps).toEqual([
            { lap: 1, distance_km: 1, pace_min_km: "5:17", avg_heart_rate_bpm: 140, max_heart_rate_bpm: 149 },
            { lap: 2, distance_km: 1, pace_min_km: "5:25", avg_heart_rate_bpm: 151, max_heart_rate_bpm: 155 },
            { lap: 3, distance_km: 1, pace_min_km: "5:49", avg_heart_rate_bpm: 154, max_heart_rate_bpm: 157 },
            { lap: 4, distance_km: 1, pace_min_km: "5:50", avg_heart_rate_bpm: 153, max_heart_rate_bpm: 157 }
        ]);

    });

    it("desalineación detectada por ritmo: si dos capturas discrepan en el ritmo de la misma posición real, no se fusiona ningún campo de esa fila (más seguro que pegar FC de un km en otro)", () => {

        const captureA = intervalsRoadResult([], [
            { blockLap: 1, childIndex: 1, distance_km: 1, pace_min_km: "5:17" }
        ]);

        // Misma posición real (blockLap 1, childIndex 1) pero con un ritmo
        // distinto -- una de las dos capturas se desalineó de verdad.
        const captureB = intervalsRoadResult([], [
            { blockLap: 1, childIndex: 1, pace_min_km: "5:59", avg_heart_rate_bpm: 152, max_heart_rate_bpm: 159 }
        ]);

        const { laps } = merge([captureA, captureB]);

        // Empate a 1 fila -- gana captureB (trae FC) como columna
        // vertebral; el ritmo de captureA no coincide en esa misma
        // posición real, así que ninguno de sus campos (aquí, distance_km)
        // se fusiona -- captureB queda tal cual llegó.
        expect(laps).toEqual([
            { lap: 1, pace_min_km: "5:59", avg_heart_rate_bpm: 152, max_heart_rate_bpm: 159 }
        ]);

    });

});

// Bug real reportado por el usuario: "FC máxima por km: 160 ppm (km 17)" en
// un entreno de 13,02 km -- no existe ningún km 17. Causa: Vueltas
// (parser-splits.js) e Intervalos (parser-intervals-road.js) son DOS
// descomposiciones distintas del mismo entreno -- los autolaps de Vueltas
// corren sin interrupción durante todo el entreno; los de Intervalos
// reinician el conteo en cada bloque manual. Antes de este fix,
// mergeLaps() las trataba como capturas de la MISMA tabla y las fusionaba
// por número de vuelta compartido: cuando ya había una vuelta con FC
// conocida (aunque viniera de una fusión previa de Intervalos, no de
// Vueltas) y llegaba una nueva captura de Intervalos con numeración
// relativa sin solape real que realinear, el fallback de "continúa tras la
// última vuelta conocida" usaba el MÁXIMO de Vueltas (13) como ancla y
// arrastraba las vueltas de Intervalos a números que no existen en el
// entreno real (14-18 en este caso, con 17 en medio) -- silenciosamente,
// sin ningún aviso, contaminando además la FC de vueltas que nunca
// tuvieron relación real con esos splits.
describe("fusion.merge — Vueltas reales + Intervalos del mismo entreno no se mezclan (bug del 'km 17')", () => {

    it("con Vueltas reales de por medio, las filas hijas de Intervalos se descartan enteras -- nunca aparece un número de vuelta fuera del rango real del entreno", () => {

        // Vueltas real: 13 vueltas reales (1-13), solo distancia/ritmo, sin FC.
        const realVueltas = splitsResult(
            Array.from({ length: 13 }, (_, i) => ({ lap: i + 1, distance_km: 1, pace_min_km: "5:30" }))
        );

        // Captura 1 de Intervalos (numeración relativa): local 1-3, con FC
        // -- coincide por casualidad con las vueltas reales 1-3 y les rellena
        // la FC (esto YA sería fusión cruzada indebida, pero es el paso que
        // deja hasKnownHr=true para el bug real de más abajo).
        const intervalsCapture1 = intervalsRoadResult([], [
            { lap: 1, avg_heart_rate_bpm: 140, max_heart_rate_bpm: 150, numberingIsRelative: true },
            { lap: 2, avg_heart_rate_bpm: 141, max_heart_rate_bpm: 151, numberingIsRelative: true },
            { lap: 3, avg_heart_rate_bpm: 142, max_heart_rate_bpm: 152, numberingIsRelative: true }
        ]);

        // Captura 2 de Intervalos (numeración relativa, local 1-5, SIN
        // solape real con la captura 1 -- ninguna FC coincide): con el bug
        // real, el fallback de offset usa el máximo conocido (13, de
        // Vueltas) y desplaza estas vueltas a 14-18, incluyendo el 17 del
        // reporte real. avgHr=160 es a propósito el más alto de todos los
        // splits para reproducir literalmente "FC máxima por km... (km 17)".
        const intervalsCapture2 = intervalsRoadResult([], [
            { lap: 1, avg_heart_rate_bpm: 155, max_heart_rate_bpm: 165, numberingIsRelative: true },
            { lap: 2, avg_heart_rate_bpm: 156, max_heart_rate_bpm: 166, numberingIsRelative: true },
            { lap: 3, avg_heart_rate_bpm: 157, max_heart_rate_bpm: 167, numberingIsRelative: true },
            { lap: 4, avg_heart_rate_bpm: 160, max_heart_rate_bpm: 170, numberingIsRelative: true },
            { lap: 5, avg_heart_rate_bpm: 158, max_heart_rate_bpm: 168, numberingIsRelative: true }
        ]);

        const { laps } = merge([realVueltas, intervalsCapture1, intervalsCapture2]);

        // Solo las 13 vueltas reales -- ninguna de Intervalos entra, así
        // que ningún número de vuelta puede superar el 13 real.
        expect(laps).toHaveLength(13);
        expect(Math.max(...laps.map(l => l.lap))).toBe(13);
        expect(laps.every(l => l.lap >= 1 && l.lap <= 13)).toBe(true);

        // Y, en particular, ninguna vuelta real queda contaminada con la FC
        // de Intervalos -- las 13 vueltas reales siguen sin FC, tal cual
        // las trajo Vueltas.
        expect(laps.every(l => l.avg_heart_rate_bpm == null)).toBe(true);

    });

    it("sin ninguna captura real de Vueltas, las filas hijas de Intervalos SÍ se usan (el caso para el que se diseñaron)", () => {

        const intervalsOnly = intervalsRoadResult([], [
            { blockLap: 1, childIndex: 1, distance_km: 1, pace_min_km: "5:17" },
            { blockLap: 1, childIndex: 2, distance_km: 1, pace_min_km: "5:25" }
        ]);

        const { laps } = merge([intervalsOnly]);

        expect(laps).toEqual([
            { lap: 1, distance_km: 1, pace_min_km: "5:17" },
            { lap: 2, distance_km: 1, pace_min_km: "5:25" }
        ]);

    });

});

describe("fusion.merge — combinación de vueltas entre varias capturas de Vueltas", () => {

    it("combina, para la misma vuelta, la distancia/ritmo de una captura con la FC de otra", () => {

        // Captura 1: vista estándar (Vuelta/Tiempo/Distancia/Ritmo).
        const standard = splitsResult([
            { lap: 1, distance_km: 1, pace_min_km: "5:30" },
            { lap: 2, distance_km: 1, pace_min_km: "5:34" }
        ]);

        // Captura 2: vista desplazada, solo FC (ver parser-splits.js).
        const hr = splitsResult([
            { lap: 1, avg_heart_rate_bpm: 140, max_heart_rate_bpm: 152 },
            { lap: 2, avg_heart_rate_bpm: 153, max_heart_rate_bpm: 157 }
        ]);

        const { laps } = merge([standard, hr]);

        expect(laps).toEqual([
            { lap: 1, distance_km: 1, pace_min_km: "5:30", avg_heart_rate_bpm: 140, max_heart_rate_bpm: 152 },
            { lap: 2, distance_km: 1, pace_min_km: "5:34", avg_heart_rate_bpm: 153, max_heart_rate_bpm: 157 }
        ]);

    });

    it("da igual el orden de las dos capturas — el resultado combinado es el mismo", () => {

        const standard = splitsResult([{ lap: 1, distance_km: 1, pace_min_km: "5:30" }]);
        const hr = splitsResult([{ lap: 1, avg_heart_rate_bpm: 140, max_heart_rate_bpm: 152 }]);

        const { laps: order1 } = merge([standard, hr]);
        const { laps: order2 } = merge([hr, standard]);

        expect(order1).toEqual(order2);

    });

    it("no pisa un campo ya leído por otra captura, se queda con el primero", () => {

        const first = splitsResult([{ lap: 1, distance_km: 1, pace_min_km: "5:30" }]);
        const second = splitsResult([{ lap: 1, distance_km: 1.05, pace_min_km: "5:31" }]);

        const { laps } = merge([first, second]);

        expect(laps).toEqual([{ lap: 1, distance_km: 1, pace_min_km: "5:30" }]);

    });

});

describe("fusion.merge — dos capturas de la vista de FC desplazada (numeración relativa, ver parser-splits.js)", () => {

    // Un entreno con más vueltas de las que caben en una pantalla exige
    // dos capturas de esa misma vista — cada una numera sus filas por
    // orden de aparición (1, 2, 3...) porque el primer dígito real viene
    // corrompido por scroll, así que las dos "empiezan en 1" aunque
    // representen vueltas reales distintas. Antes de este fix, fusion.js
    // fusionaba por ese número relativo tal cual: la segunda captura
    // colisionaba entera con la primera (sus vueltas 1-5 "ya estaban"
    // con FC de la primera captura) y las vueltas que solo estaban en la
    // segunda (7, 8, 9) desaparecían sin más.
    function hrCapture(pairs, startLap = 1) {
        return splitsResult(pairs.map((p, i) => ({
            avg_heart_rate_bpm: p[0],
            max_heart_rate_bpm: p[1],
            lap: startLap + i,
            numberingIsRelative: true
        })));
    }

    it("Puerto Lumbreras 8k (25 ago) — dos capturas de FC solapadas en las vueltas 5-6 no pierden las vueltas 7-9", () => {

        // Captura 1: vueltas 1-6 reales, numeradas 1-6 (primera captura
        // con numeración relativa — se acepta tal cual, ver mergeLaps()).
        const capture1 = hrCapture([
            [134, 147], [151, 156], [154, 158], [153, 156], [154, 156], [153, 158]
        ]);

        // Captura 2: vueltas 5-9 reales, pero el propio parser las numera
        // 1-5 (relativas a esta captura) -- las dos primeras (154/156,
        // 153/158) coinciden EXACTAMENTE con las vueltas 5 y 6 ya
        // conocidas de la captura 1: esa es la señal de solape que ancla
        // el desplazamiento real (+4).
        const capture2 = hrCapture([
            [154, 156], [153, 158], [152, 155], [154, 156], [151, 152]
        ]);

        const { laps } = merge([capture1, capture2]);

        expect(laps).toEqual([
            { lap: 1, avg_heart_rate_bpm: 134, max_heart_rate_bpm: 147 },
            { lap: 2, avg_heart_rate_bpm: 151, max_heart_rate_bpm: 156 },
            { lap: 3, avg_heart_rate_bpm: 154, max_heart_rate_bpm: 158 },
            { lap: 4, avg_heart_rate_bpm: 153, max_heart_rate_bpm: 156 },
            { lap: 5, avg_heart_rate_bpm: 154, max_heart_rate_bpm: 156 },
            { lap: 6, avg_heart_rate_bpm: 153, max_heart_rate_bpm: 158 },
            { lap: 7, avg_heart_rate_bpm: 152, max_heart_rate_bpm: 155 },
            { lap: 8, avg_heart_rate_bpm: 154, max_heart_rate_bpm: 156 },
            { lap: 9, avg_heart_rate_bpm: 151, max_heart_rate_bpm: 152 }
        ]);

    });

    // A diferencia de "da igual el orden" en el describe de arriba (vista
    // estándar + FC: ese SÍ es order-independent porque la vista estándar
    // trae números de vuelta reales, un ancla fiable pase lo que pase),
    // con DOS capturas de numeración relativa no hay ningún ancla externa
    // — la primera que se procesa se acepta tal cual (ver comentario en
    // mergeLaps()). Documentado a propósito, no un bug: subir las capturas
    // en el mismo orden en que se hicieron (de arriba abajo en la tabla,
    // lo natural) es lo que se asume, y es lo único que se puede asumir
    // sin otra señal en la propia captura.
    it("con dos capturas de numeración relativa, subirlas en el orden real de la tabla es lo que da el resultado correcto", () => {

        const capture1 = hrCapture([
            [134, 147], [151, 156], [154, 158], [153, 156], [154, 156], [153, 158]
        ]);
        const capture2 = hrCapture([
            [154, 156], [153, 158], [152, 155], [154, 156], [151, 152]
        ]);

        const { laps } = merge([capture1, capture2]);

        expect(laps.map(l => l.lap)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);

    });

    it("sin ninguna vuelta solapada (ningún par de FC coincide), se asume que la segunda captura continúa justo tras la última vuelta conocida", () => {

        const capture1 = hrCapture([[134, 147], [151, 156], [154, 158]]); // vueltas 1-3
        const capture2 = hrCapture([[140, 150], [145, 152]]); // vueltas reales 4-5, sin ninguna coincidencia con la 1

        const { laps } = merge([capture1, capture2]);

        expect(laps.map(l => l.lap)).toEqual([1, 2, 3, 4, 5]);
        expect(laps[3]).toMatchObject({ lap: 4, avg_heart_rate_bpm: 140, max_heart_rate_bpm: 150 });
        expect(laps[4]).toMatchObject({ lap: 5, avg_heart_rate_bpm: 145, max_heart_rate_bpm: 152 });

    });

    it("una vuelta solapada que CONTRADICE (misma posición relativa, FC distinta) descarta ese desplazamiento en vez de fusionar mal", () => {

        const capture1 = hrCapture([[134, 147], [151, 156], [154, 158]]); // vueltas 1-3
        // Si se alineara con offset 0 (local1 -> vuelta1), la FC de la
        // vuelta 1 contradice (134/147 vs 200/210) -- no debe colar ese
        // desplazamiento solo porque el número de filas coincida.
        const capture2 = hrCapture([[200, 210], [151, 156], [154, 158]]);

        const { laps } = merge([capture1, capture2]);

        // Sin un desplazamiento válido por solape, cae al fallback
        // (continúa tras la última vuelta conocida, vuelta 3).
        expect(laps.map(l => l.lap)).toEqual([1, 2, 3, 4, 5, 6]);

    });

    it("con una captura ESTÁNDAR también presente (distancia/ritmo, sin FC), la primera captura de FC igualmente se acepta con su numeración local -- las vueltas de la vista estándar no cuentan como 'ya conocidas' a efectos de realineación", () => {

        // Vista estándar: 9 vueltas reales con distancia/ritmo, SIN FC.
        const standard = splitsResult(
            Array.from({ length: 9 }, (_, i) => ({ lap: i + 1, distance_km: 1, pace_min_km: "5:30" }))
        );

        const hr1 = hrCapture([
            [134, 147], [151, 156], [154, 158], [153, 156], [154, 156], [153, 158]
        ]); // vueltas 1-6

        const hr2 = hrCapture([
            [154, 156], [153, 158], [152, 155], [154, 156], [151, 152]
        ]); // vueltas 5-9 (numeradas 1-5 en la propia captura)

        const { laps } = merge([standard, hr1, hr2]);

        expect(laps).toHaveLength(9);
        expect(laps.map(l => l.lap)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        expect(laps.every(l => l.distance_km === 1)).toBe(true); // vista estándar intacta
        expect(laps.map(l => `${l.avg_heart_rate_bpm}/${l.max_heart_rate_bpm}`)).toEqual([
            "134/147", "151/156", "154/158", "153/156", "154/156", "153/158", "152/155", "154/156", "151/152"
        ]);

    });

    it("integración real parser-splits.js + fusion.js: mismas dos capturas, generadas a partir de texto OCR de la tabla desplazada", () => {

        const capture1Text = [
            "Vuelta GAP medio Frecuencia cardiaca media Frec. cardiaca max. Ascenso total",
            "min/km ppm ppm m",
            "1 5:12 134 147 5",
            "2 5:18 151 156 4",
            "3 5:20 154 158 6",
            "4 5:19 153 156 3",
            "5 5:21 154 156 5",
            "6 5:24 153 158 4"
        ].join("\n");

        const capture2Text = [
            "Vuelta GAP medio Frecuencia cardiaca media Frec. cardiaca max. Ascenso total",
            "min/km ppm ppm m",
            "5 5:21 154 156 5",
            "6 5:24 153 158 4",
            "7 5:30 152 155 3",
            "8 5:33 154 156 4",
            "9 5:36 151 152 1"
        ].join("\n");

        const { laps } = merge([parseSplits(capture1Text), parseSplits(capture2Text)]);

        expect(laps.map(l => l.lap)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        expect(laps.map(l => `${l.avg_heart_rate_bpm}/${l.max_heart_rate_bpm}`)).toEqual([
            "134/147", "151/156", "154/158", "153/156", "154/156", "153/158", "152/155", "154/156", "151/152"
        ]);

    });

});
