import * as U from "./garmin-utils.js";

// Fila de BLOQUE real (columna "Int." con número, fila en negrita/expandible
// en la app) en la vista "izquierda" de la tabla -- Int./Tipo/Tiempo/
// Distancia/Ritmo medio: "1 Carrera 1:05:44.6 11,00 5:59". El tiempo trae
// horas cuando el bloque dura más de 60 min ("1:05:44.6") y no las trae si
// no ("11:17.6") -- verificado real con los dos bloques de un mismo
// entreno (11 km / 2,02 km).
const LEFT_BLOCK_ROW = /^([0-9]{1,2})\s+([a-záéíóúñ]+)\s+((?:[0-9]{1,2}:)?[0-9]{1,3}:[0-5][0-9](?:[.,][0-9]+)?)\s+([0-9]{1,3}[,.][0-9]{1,2})\s+([0-9]{1,2}:[0-5][0-9])\s*$/i;

// Fila hija (submuestra de ~1 km dentro del bloque, sin número en "Int.")
// de la misma vista -- "Carrera 5:16.9 1,00 5:17". A diferencia del intento
// anterior (commit b28fa65), esta fila SÍ se extrae: es un split real de
// ~1 km con ritmo real de Garmin, igual de fiable que uno de la vista
// clásica "Vueltas" (parser-splits.js) -- ver la corrección en el fix de
// más abajo.
const LEFT_CHILD_ROW = /^([a-záéíóúñ]+)\s+((?:[0-9]{1,2}:)?[0-9]{1,3}:[0-5][0-9](?:[.,][0-9]+)?)\s+([0-9]{1,3}[,.][0-9]{1,2})\s+([0-9]{1,2}:[0-5][0-9])\s*$/i;

// Misma fila hija pero en la vista "derecha" -- Distancia/Ritmo medio/GAP
// medio/FC media/FC máx, sin número de bloque delante: "1,00 5:17 5:22
// 140 149". Empieza directamente por una distancia decimal (con coma o
// punto), lo que la distingue de RIGHT_BLOCK_ROW (empieza por un entero de
// 1-2 cifras sin decimales, el número de bloque) sin ambigüedad posible.
const RIGHT_CHILD_ROW = /^([0-9]{1,3}[,.][0-9]{1,2})\s+([0-9]{1,2}:[0-5][0-9])\s+[0-9]{1,2}:[0-5][0-9]\s+([0-9]{2,3})\s+([0-9]{2,3})\b/;

// Fila de BLOQUE real en la vista "derecha" -- Int./Distancia/Ritmo medio/
// GAP medio/FC media/FC máx...: "1 11,00 5:59 5:59 152 159". El "^" ancla
// el número de intervalo al principio de la línea, así que una fila hija
// (que empieza directamente por la distancia, sin número delante) nunca
// puede matchear esto -- no hace falta un LEFT_CHILD_ROW equivalente aquí.
const RIGHT_BLOCK_ROW = /^([0-9]{1,2})\s+([0-9]{1,3}[,.][0-9]{1,2})\s+([0-9]{1,2}:[0-5][0-9])\s+[0-9]{1,2}:[0-5][0-9]\s+([0-9]{2,3})\s+([0-9]{2,3})\b/;

// Misma vista "derecha" pero desplazada un paso más a la derecha, ya sin
// columna de Distancia visible (verificado real, ver el bug original de
// esta pantalla -- commit b752969): "2 5:35 5:35 159 165 7". Sin
// distancia, el bloque se fusiona igualmente con el de otra captura que sí
// la traiga (mismo número de "Int.", ver fusion.js) en vez de perderse.
const RIGHT_BLOCK_ROW_NO_DIST = /^([0-9]{1,2})\s+([0-9]{1,2}:[0-5][0-9])\s+[0-9]{1,2}:[0-5][0-9]\s+([0-9]{2,3})\s+([0-9]{2,3})\b/;

// Fila hija de esa misma vista sin Distancia -- "6:10 6:14 154 157 1":
// Ritmo medio/GAP medio/FC media/FC máx/Ascenso, sin número de bloque
// delante. Sin distancia no se puede validar contra la suma del bloque
// (checkBlockChildSum se salta estas filas), pero el ritmo y la FC por km
// SÍ son datos reales -- fusion.js las combina por número de vuelta con
// las de la vista izquierda (que sí trae distancia), igual que ya hace
// parseHrRows() en parser-splits.js con la tabla de Vueltas desplazada.
// Esta era la vista que de verdad usó el usuario para este entreno (ver
// REAL_INTERVALS_ROAD en garmin-parser.test.js) -- sin extraer esta fila,
// workout.splits se quedaba sin FC por km aunque la captura sí la traía,
// y RITMO POR KILÓMETRO perdía el toggle Ritmo+FC/Ritmo/FC, la línea de
// FC superpuesta y el bloque de análisis (deriva, FC máxima por km) que
// dependen de esa FC por split -- todos ellos ya existían en el
// componente compartido, solo les faltaba el dato.
const RIGHT_CHILD_ROW_NO_DIST = /^([0-9]{1,2}:[0-5][0-9])\s+[0-9]{1,2}:[0-5][0-9]\s+([0-9]{2,3})\s+([0-9]{2,3})\b/;

// Tolerancia entre la suma de distancias de las filas hijas de un bloque y
// la distancia del propio bloque -- 0,05 km cubre el redondeo real que ya
// se ve en las capturas (Garmin redondea cada fila a 2 decimales), sin
// dejar pasar una discrepancia real por captura incompleta o fila perdida.
const BLOCK_CHILD_DISTANCE_TOLERANCE_KM = 0.05;

function checkBlockChildSum(block, childSumKm, warnings) {

    if (!block || childSumKm === 0 || block.distance_km == null) return;

    const diff = Math.abs(block.distance_km - childSumKm);
    if (diff > BLOCK_CHILD_DISTANCE_TOLERANCE_KM) {
        warnings.push(
            `El bloque ${block.lap} de Intervalos mide ${block.distance_km} km pero sus filas de 1 km suman ${childSumKm.toFixed(2)} km -- revisar la captura.`
        );
    }

}

// Pantalla "Intervalos" de una Carrera normal (ver screen-detector.js). Se
// extraen tanto los bloques reales (cada fila con número en "Int." trae un
// agregado ya calculado y verificado por Garmin -- Tipo/Tiempo/Distancia/
// Ritmo medio, y en la vista desplazada también FC media/FC máx.) como las
// filas hijas (submuestras de ~1 km sin número en "Int."): a diferencia del
// intento anterior (que las descartaba, ver el commit b28fa65), SÍ son
// splits reales de 1 km con ritmo real de Garmin -- igual de fiables que
// los de la vista clásica "Vueltas" (parser-splits.js), así que se numeran
// y devuelven en `extras.laps` con la misma forma que esa vista, para que
// fusion.js/garmin.js las fusionen en `workout.splits` por el mismo camino
// (RITMO POR KILÓMETRO no distingue de dónde vino cada split).
export function parse(text) {
    const raw = U.cleanText(text);

    // La fila de resumen ("Total 1:17:02.2 13,02 5:55") no es un bloque
    // real -- mismo criterio que ya usan parser-intervals.js/parser-splits.js.
    const lines = U.linesOf(raw).filter(line => !/^total\b/i.test(line.trim()));

    const blocks = [];
    const laps = [];
    const warnings = [];

    // Las filas hijas no traen número de "Int." -- se numeran por orden de
    // aparición en la captura, igual que parseHrRows() en parser-splits.js,
    // y por el mismo motivo llevan numberingIsRelative: si el entreno no
    // cupo en una sola captura, fusion.js ya sabe realinearlas contra otra
    // captura de la misma pantalla (por solape de FC) en vez de asumir que
    // el "1" de la segunda es de verdad la vuelta 1.
    let lapCounter = 0;

    // Bloque cuyas filas hijas se están acumulando ahora mismo, para poder
    // comparar su distancia contra la suma de esas filas en cuanto se sabe
    // que ya no van a llegar más (empieza el siguiente bloque, o se acaba
    // el texto).
    let currentBlock = null;
    let childSumKm = 0;

    const closeCurrentBlock = () => {
        checkBlockChildSum(currentBlock, childSumKm, warnings);
        childSumKm = 0;
    };

    for (const line of lines) {

        const leftBlock = line.match(LEFT_BLOCK_ROW);
        if (leftBlock) {
            closeCurrentBlock();
            currentBlock = {
                lap: Number(leftBlock[1]),
                type: leftBlock[2],
                duration: U.duration(leftBlock[3]),
                distance_km: U.num(leftBlock[4]),
                pace_min_km: U.pace(leftBlock[5])
            };
            blocks.push(currentBlock);
            continue;
        }

        const leftChild = line.match(LEFT_CHILD_ROW);
        if (leftChild) {
            const distanceKm = U.num(leftChild[3]);
            laps.push({
                lap: ++lapCounter,
                distance_km: distanceKm,
                pace_min_km: U.pace(leftChild[4]),
                numberingIsRelative: true
            });
            if (distanceKm != null) childSumKm += distanceKm;
            continue;
        }

        const rightBlock = line.match(RIGHT_BLOCK_ROW);
        if (rightBlock) {
            closeCurrentBlock();
            currentBlock = {
                lap: Number(rightBlock[1]),
                distance_km: U.num(rightBlock[2]),
                pace_min_km: U.pace(rightBlock[3]),
                avg_heart_rate_bpm: U.num(rightBlock[4]),
                max_heart_rate_bpm: U.num(rightBlock[5])
            };
            blocks.push(currentBlock);
            continue;
        }

        const rightChild = line.match(RIGHT_CHILD_ROW);
        if (rightChild) {
            const distanceKm = U.num(rightChild[1]);
            laps.push({
                lap: ++lapCounter,
                distance_km: distanceKm,
                pace_min_km: U.pace(rightChild[2]),
                avg_heart_rate_bpm: U.num(rightChild[3]),
                max_heart_rate_bpm: U.num(rightChild[4]),
                numberingIsRelative: true
            });
            if (distanceKm != null) childSumKm += distanceKm;
            continue;
        }

        const rightBlockNoDist = line.match(RIGHT_BLOCK_ROW_NO_DIST);
        if (rightBlockNoDist) {
            closeCurrentBlock();
            currentBlock = {
                lap: Number(rightBlockNoDist[1]),
                pace_min_km: U.pace(rightBlockNoDist[2]),
                avg_heart_rate_bpm: U.num(rightBlockNoDist[3]),
                max_heart_rate_bpm: U.num(rightBlockNoDist[4])
            };
            blocks.push(currentBlock);
            continue;
        }

        const rightChildNoDist = line.match(RIGHT_CHILD_ROW_NO_DIST);
        if (rightChildNoDist) {
            laps.push({
                lap: ++lapCounter,
                pace_min_km: U.pace(rightChildNoDist[1]),
                avg_heart_rate_bpm: U.num(rightChildNoDist[2]),
                max_heart_rate_bpm: U.num(rightChildNoDist[3]),
                numberingIsRelative: true
            });
        }

    }

    closeCurrentBlock();

    return {
        parser: "intervals-road-v2",
        fields: {
            source: U.field("Garmin", "Pantalla Intervalos (Carrera)", .99),
            screen_type: U.field("intervals-road", "Intervalos (Carrera)", .9)
        },
        extras: { blocks, laps, warnings }
    };
}
