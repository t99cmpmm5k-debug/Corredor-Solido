import * as U from "./garmin-utils.js";

// Fila de BLOQUE real (columna "Int." con número, fila en negrita/expandible
// en la app) en la vista "izquierda" de la tabla -- Int./Tipo/Tiempo/
// Distancia/Ritmo medio: "1 Carrera 1:05:44.6 11,00 5:59". El tiempo trae
// horas cuando el bloque dura más de 60 min ("1:05:44.6") y no las trae si
// no ("11:17.6") -- verificado real con los dos bloques de un mismo
// entreno (11 km / 2,02 km).
const LEFT_BLOCK_ROW = /^([0-9]{1,2})\s+([a-záéíóúñ]+)\s+((?:[0-9]{1,2}:)?[0-9]{1,3}:[0-5][0-9](?:[.,][0-9]+)?)\s+([0-9]{1,3}[,.][0-9]{1,2})\s+([0-9]{1,2}:[0-5][0-9])\s*$/i;

// Fila hija (submuestra de ~1 km dentro del bloque, sin número en "Int.")
// de la misma vista -- "Carrera 5:16.9 1,00 5:17". No se extrae nada de
// ella (ver comentario de más abajo); solo hace falta reconocerla para no
// tratarla como basura sin forma.
const LEFT_CHILD_ROW = /^([a-záéíóúñ]+)\s+((?:[0-9]{1,2}:)?[0-9]{1,3}:[0-5][0-9](?:[.,][0-9]+)?)\s+([0-9]{1,3}[,.][0-9]{1,2})\s+([0-9]{1,2}:[0-5][0-9])\s*$/i;

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

// Pantalla "Intervalos" de una Carrera normal (ver screen-detector.js). A
// diferencia del intento anterior (que no extraía nada, ver el commit
// b752969), aquí SÍ se extraen los bloques reales -- cada fila con número
// en "Int." trae un agregado ya calculado y verificado por Garmin (Tipo/
// Tiempo/Distancia/Ritmo medio, y en la vista desplazada también FC media/
// FC máx.), no un dato inventado por nosotros. Las filas hijas (submuestras
// de ~1 km sin número en "Int.") se ignoran a propósito para este MVP: la
// restricción de "no inventar splits de 1 km" del fix anterior seguía
// aplicando a ellas (no traen ninguna columna que las distinga de un split
// real de Vueltas), así que se descartan en vez de intentar mapearlas.
export function parse(text) {
    const raw = U.cleanText(text);

    // La fila de resumen ("Total 1:17:02.2 13,02 5:55") no es un bloque
    // real -- mismo criterio que ya usan parser-intervals.js/parser-splits.js.
    const lines = U.linesOf(raw).filter(line => !/^total\b/i.test(line.trim()));

    const blocks = [];

    for (const line of lines) {

        const leftBlock = line.match(LEFT_BLOCK_ROW);
        if (leftBlock) {
            blocks.push({
                lap: Number(leftBlock[1]),
                type: leftBlock[2],
                duration: U.duration(leftBlock[3]),
                distance_km: U.num(leftBlock[4]),
                pace_min_km: U.pace(leftBlock[5])
            });
            continue;
        }

        if (LEFT_CHILD_ROW.test(line)) continue;

        const rightBlock = line.match(RIGHT_BLOCK_ROW);
        if (rightBlock) {
            blocks.push({
                lap: Number(rightBlock[1]),
                distance_km: U.num(rightBlock[2]),
                pace_min_km: U.pace(rightBlock[3]),
                avg_heart_rate_bpm: U.num(rightBlock[4]),
                max_heart_rate_bpm: U.num(rightBlock[5])
            });
            continue;
        }

        const rightBlockNoDist = line.match(RIGHT_BLOCK_ROW_NO_DIST);
        if (rightBlockNoDist) {
            blocks.push({
                lap: Number(rightBlockNoDist[1]),
                pace_min_km: U.pace(rightBlockNoDist[2]),
                avg_heart_rate_bpm: U.num(rightBlockNoDist[3]),
                max_heart_rate_bpm: U.num(rightBlockNoDist[4])
            });
        }

    }

    return {
        parser: "intervals-road-v2",
        fields: {
            source: U.field("Garmin", "Pantalla Intervalos (Carrera)", .99),
            screen_type: U.field("intervals-road", "Intervalos (Carrera)", .9)
        },
        extras: { blocks }
    };
}
