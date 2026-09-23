// Detección del tramo de "series" (intervalos) dentro de un entreno con
// calentamiento + series + enfriamiento -- soporta el toggle "Ver solo
// intervalos" de RunningDetailView.js.
//
// Dos vías, nunca mezcladas:
//
// 1) Real (segmentType "work"/"rest"): viene tal cual de la pantalla
//    "Intervalos" de Garmin (parser-intervals.js/parser-intervals-road.js)
//    -- no es una estimación, es la propia estructura que Garmin ya
//    calculó. isHeuristic: false. NOTA: esa pantalla hoy solo reconoce las
//    filas "Carrera"/"Recuperación" -- las de Calentamiento/Enfriamiento se
//    descartan en el propio parser (nunca llegan a workout.splits), así
//    que esta vía nunca necesita excluirlas aparte: si aparecieran algún
//    día habría que extender el parser primero contra una captura real
//    (no se ha hecho -- no hay ninguna capturada todavía con la que
//    verificar el formato exacto de esas filas, ver CLAUDE.md).
//
// 2) Heurística (splits sin segmentType -- GPX/TCX, o Garmin solo con la
//    vista "Vueltas"): un calentamiento/enfriamiento real corre
//    notablemente más lento que las series -- se recortan los splits
//    iniciales/finales cuyo ritmo supera la mediana de TODO el entreno en
//    más de HEURISTIC_SLOWDOWN_RATIO, mientras quede un tramo central de
//    tamaño razonable. isHeuristic: true -- es una suposición, nunca se
//    presenta como dato cierto (mismo criterio que la temperatura estimada
//    en RunningDetailView.js: badge visible, no un valor normal más).
//
// Mediana fija de TODO el entreno (no recalculada en cada recorte a
// propósito) -- una regla simple y estable es preferible a un algoritmo
// iterativo que intente adivinar caso por caso (mismo criterio pedido para
// los marcadores de km del mapa).
const HEURISTIC_SLOWDOWN_RATIO = 1.20;

// Por debajo de esto no hay suficiente tramo central del que fiarse, ni
// tiene sentido ocultar 1-2 km de un entreno de 3-4.
const MIN_SPLITS_FOR_HEURISTIC = 5;
const MIN_INNER_SPLITS = 3;

function median(values) {

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

}

function detectFromSegmentType(splits) {

    const indices = splits
        .map((split, index) => ({ index, type: split.segmentType }))
        .filter(({ type }) => type === "work" || type === "rest")
        .map(({ index }) => index);

    if (!indices.length) return null;

    // Los tramos work/rest de un archivo sin vueltas reales (Zepp, ver
    // src/importers/intervalHeuristic.js) son una estimación por velocidad,
    // no la estructura leída del reloj -- cada uno ya llega con
    // isHeuristic: true.
    return {
        startIndex: indices[0],
        endIndex: indices[indices.length - 1],
        isHeuristic: splits.some(split => split.isHeuristic === true)
    };

}

function detectHeuristic(splits) {

    if (splits.length < MIN_SPLITS_FOR_HEURISTIC) return null;

    const paces = splits.map(s => s.paceSecPerKm);
    if (paces.some(p => p == null)) return null;

    let start = 0;
    let end = paces.length - 1;

    // La mediana de referencia se recalcula sobre lo que queda tras cada
    // recorte -- así un calentamiento/enfriamiento largo (varios km) no
    // arrastra la mediana hacia arriba y esconde el siguiente km lento.
    // Sigue siendo una regla simple (siempre el mismo criterio de "¿supera
    // la mediana de lo que queda en más de un 20%?"), no un algoritmo
    // distinto por caso.
    while (end - start + 1 > MIN_INNER_SPLITS) {

        const threshold = median(paces.slice(start, end + 1)) * HEURISTIC_SLOWDOWN_RATIO;
        const startIsSlow = paces[start] > threshold;
        const endIsSlow = paces[end] > threshold;

        if (!startIsSlow && !endIsSlow) break;

        if (startIsSlow) start++;
        if (endIsSlow && end - start + 1 > MIN_INNER_SPLITS) end--;

    }

    if (start === 0 && end === paces.length - 1) return null;

    return { startIndex: start, endIndex: end, isHeuristic: true };

}

// splits: los mismos que ya llegan a RunningPaceChart (chartSplits(workout),
// ver RunningDetailView.js) -- ya sin el remanente final descartado.
export function detectIntervalRange(splits) {

    if (!splits || !splits.length) return null;

    return detectFromSegmentType(splits) || detectHeuristic(splits);

}

export function filterToIntervalRange(splits, range) {

    if (!range) return splits;

    return splits.slice(range.startIndex, range.endIndex + 1);

}
