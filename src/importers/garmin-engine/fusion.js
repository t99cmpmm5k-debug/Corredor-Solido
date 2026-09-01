import * as U from "./garmin-utils.js";

const KEYS = [
    "source", "screen_type", "title", "location", "activity", "date", "time",
    "distance_km", "avg_heart_rate_bpm", "max_heart_rate_bpm",
    "avg_pace_min_km", "total_time", "calories_kcal", "cadence_spm",
    "max_cadence_spm", "temperature_c", "elevation_gain_m",
    // Training Effect (bloque real dentro de la pantalla Estadísticas, ver
    // parser-statistics.js) -- solo Garmin lo trae, TCX/Amazfit se queda en
    // null como el resto de campos exclusivos de Garmin.
    "training_effect_aerobic", "training_effect_anaerobic", "exercise_load"
];

function paceToSeconds(pace) {
    const m = String(pace || "").match(/^([0-9]{1,2}):([0-5][0-9])$/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function durationToSeconds(duration) {
    const parts = String(duration || "").split(":").map(Number);
    if (!parts.length || parts.some(Number.isNaN)) return null;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return null;
}

function mergeLapIntoMap(lapsByNumber, lap) {

    const existing = lapsByNumber.get(lap.lap);
    if (!existing) {
        lapsByNumber.set(lap.lap, { ...lap });
        return;
    }

    Object.entries(lap).forEach(([key, value]) => {
        if (value != null && existing[key] == null) existing[key] = value;
    });

}

function hrPairsEqual(a, b) {

    return a.avg_heart_rate_bpm != null && a.max_heart_rate_bpm != null
        && a.avg_heart_rate_bpm === b.avg_heart_rate_bpm
        && a.max_heart_rate_bpm === b.max_heart_rate_bpm;

}

// Una captura de la tabla de Vueltas desplazada (solo FC, ver
// parser-splits.js) numera sus filas por orden de aparición (1, 2, 3...)
// porque el primer dígito de cada fila viene corrompido por basura de
// scroll de forma poco fiable — pero esa numeración es relativa a ESA
// captura. Con dos capturas de esa misma vista (el entreno no cupo en una
// sola pantalla), la segunda también "empieza en 1", así que hace falta
// averiguar en qué vuelta real empieza de verdad antes de fusionarla.
//
// La única señal fiable disponible es la propia FC: al volver a capturar
// más abajo en la tabla, es habitual que un par de filas queden repetidas
// (solape de scroll) — si la FC media Y máxima de una fila de la captura
// nueva coincide EXACTAMENTE con una vuelta ya conocida, esa coincidencia
// (sobre todo si son dos o más filas seguidas) ancla el desplazamiento
// real. Cualquier vuelta solapada que NO coincida descarta ese
// desplazamiento entero — no basta con que "una" cuadre por azar.
function findOverlapOffset(lapsByNumber, candidateLaps) {

    let bestOffset = null;
    let bestMatches = 0;

    lapsByNumber.forEach((knownLap, knownNumber) => {

        if (knownLap.avg_heart_rate_bpm == null) return;

        candidateLaps.forEach(candidate => {

            const offset = knownNumber - candidate.lap;
            let matches = 0;
            let contradicted = false;

            candidateLaps.forEach(c => {
                const target = lapsByNumber.get(c.lap + offset);
                if (!target || target.avg_heart_rate_bpm == null) return;
                if (hrPairsEqual(target, c)) matches++;
                else contradicted = true;
            });

            if (!contradicted && matches > bestMatches) {
                bestMatches = matches;
                bestOffset = offset;
            }

        });

    });

    return bestMatches > 0 ? bestOffset : null;

}

// Parciales: se juntan los de TODAS las capturas de Vueltas (una carrera
// larga puede no caber en una sola pantalla, o la FC viene de una segunda
// captura de la tabla desplazada — ver parser-splits.js), ordenados por
// número de vuelta. Se combinan campo a campo (no "la primera captura de
// esa vuelta gana entera"): así la distancia/ritmo de la vista estándar y
// la FC de la vista desplazada, para la misma vuelta, conviven en el
// mismo lap en vez de que la segunda captura pierda sus datos porque esa
// vuelta "ya estaba" con otro campo.
//
// Las capturas se procesan EN ORDEN (no un flatMap de todas a la vez): una
// captura con numeración relativa (ver parser-splits.js) se realinea
// contra lo que ya se sabe de las capturas anteriores (findOverlapOffset)
// antes de fusionarla, así sus vueltas 7-9 no colisionan con las 1-3 de
// otra captura que también "empieza en 1".
//
// "Ya se sabe algo con lo que realinear" significa concretamente "ya hay
// FC de otra captura relativa" — no basta con que ya existan vueltas de la
// vista ESTÁNDAR (distancia/ritmo, sin FC): esas no aportan ninguna señal
// de solape (ver el filtro por avg_heart_rate_bpm en findOverlapOffset), y
// tratarlas como "ya conocido" hacía que la primera captura de FC cayera
// siempre al fallback de "continúa después de la última vuelta" aunque sus
// números locales (1..6) ya fueran los reales — un entreno con vista
// estándar (9 vueltas) + 2 capturas de FC (1-6 y 5-9) desplazaba la
// primera de FC a las vueltas 10-15 en vez de dejarla en 1-6. La primera
// captura con FC que se procesa se acepta tal cual con su numeración local
// (no hay nada de FC contra lo que realinearla todavía, y en la práctica
// las capturas se suben en el mismo orden en que se hicieron — de arriba
// abajo en la tabla — así que su "1" ya es la vuelta 1 real).
//
// Sin solape detectable entre dos capturas de FC (ninguna FC coincide), se
// asume que la segunda continúa justo después de la última vuelta ya
// conocida — mejor esa suposición razonable que perder las vueltas
// enteras, que es el bug que esto corrige.
function mergeLapsFromResults(results) {

    const lapsByNumber = new Map();

    results
        .filter(r => Array.isArray(r.extras?.laps) && r.extras.laps.length)
        .forEach(result => {

            const capturedLaps = result.extras.laps;
            const isRelative = capturedLaps.some(l => l.numberingIsRelative);
            const hasKnownHr = [...lapsByNumber.values()].some(l => l.avg_heart_rate_bpm != null);

            if (!isRelative || !hasKnownHr) {
                capturedLaps.forEach(lap => mergeLapIntoMap(lapsByNumber, lap));
                return;
            }

            const knownNumbers = [...lapsByNumber.keys()];
            const localNumbers = capturedLaps.map(l => l.lap);

            const offset = findOverlapOffset(lapsByNumber, capturedLaps)
                ?? (Math.max(...knownNumbers) - Math.min(...localNumbers) + 1);

            capturedLaps.forEach(lap => mergeLapIntoMap(lapsByNumber, { ...lap, lap: lap.lap + offset }));

        });

    return [...lapsByNumber.values()]
        .map(({ numberingIsRelative, ...lap }) => lap)
        .sort((a, b) => a.lap - b.lap);

}

// Las vueltas de "Vueltas" (parser-splits.js) y las filas hijas de
// "Intervalos" (parser-intervals-road.js) son DOS descomposiciones
// distintas del mismo entreno, no dos capturas de la MISMA tabla: los
// autolaps de 1 km de Vueltas corren sin interrupción durante todo el
// entreno, mientras que los de Intervalos reinician el conteo en cada
// bloque manual -- su vuelta "5" y la vuelta "5" de Vueltas casi nunca son
// el mismo kilómetro físico. Fusionarlas por número de vuelta mezclaba
// ritmo/distancia de un tramo con la FC de un tramo distinto sin ningún
// aviso, y el desplazamiento relativo de Intervalos podía arrastrar una
// vuelta a un número que ni siquiera existe en el entreno real (p. ej.
// "km 17" en un entreno de 13,02 km) al chocar con las vueltas ya
// conocidas de Vueltas. Por eso se fusionan por familia, nunca mezcladas:
// si hay alguna captura real de Vueltas, esa es la única fuente de
// workout.splits (más fiable: numeración continua de verdad, sin reinicios
// por bloque) y las filas hijas de Intervalos se descartan enteras: no hay
// forma fiable de saber a qué kilómetro real corresponden. Solo si NO hay
// ninguna captura de Vueltas se usan las de Intervalos -- ver
// mergeIntervalsRoadLaps() para cómo se combinan varias capturas de
// Intervalos entre sí DENTRO de esa familia.
function mergeLaps(results) {

    const splitsFamily = results.filter(r => r.parser?.startsWith("splits"));
    const fromSplits = mergeLapsFromResults(splitsFamily);
    if (fromSplits.length) return fromSplits;

    return mergeIntervalsRoadLaps(results);

}

// A diferencia de Vueltas (mergeLapsFromResults, con su mecanismo de
// solape/fallback pensado para varios RE-SCROLLS genuinos de la MISMA
// tabla continua), las capturas de Intervalos NUNCA se combinan por número
// de vuelta relativo ni por solape de FC -- verificado real, con las
// propias capturas de este entreno de 13,02 km, que ese mecanismo rompe de
// dos formas distintas aquí: (a) sin solape real detectable, el fallback
// "continúa tras la última vuelta conocida" ancla contra un número que no
// tiene ninguna relación real con esta captura; (b) incluso con solape
// "verificado" (un par de FC coincidente EXACTO), un solo tramo de carrera
// estable repite el mismo ppm con total normalidad en varios km reales
// distintos -- un solo par no es evidencia suficiente.
//
// Se combinan en su lugar por POSICIÓN real, con dos señales, de más a
// menos fuerte:
// (1) Ancla directa por bloque -- cada fila hija ya viene de
//     parser-intervals-road.js anclada a su bloque real (blockLap, SÍ
//     absoluto, a diferencia de la numeración de Vueltas) y su orden
//     dentro de él (childIndex). Cuando una fila trae blockLap directo (el
//     bloque aparece dentro de esa misma captura), es la señal más fiable.
// (2) Solape de RITMO -- cuando una captura no ve ningún bloque propio
//     (recortada por scroll, p. ej. una vista de FC en mitad de un bloque
//     largo sin llegar a ver ni el de arriba ni el de abajo), el ritmo real
//     de cada km varía lo bastante de sus vecinos como para que 2+
//     coincidencias EXACTAS y consecutivas en la misma posición relativa
//     sean prueba sólida -- a diferencia de la FC (que sí puede quedarse
//     plana varios km, ver el test "false-positive" más abajo), un ritmo
//     GPS real no se repite así por casualidad.
//
// Verificado real con las 6 capturas de este entreno de 13,02 km (ver
// REAL_CAPTURAS_13_02 en garmin-parser.test.js): la vista izquierda sola
// (sin FC) nunca cupo entera en una sola captura -- dos capturas parciales
// (posiciones 1-10 y 6-14) se combinan por solape de ritmo para formar el
// "esqueleto" completo de 14 posiciones con distancia real, y solo LUEGO
// las capturas de FC (todas parciales, algunas sin ver ningún bloque en
// absoluto) aportan FC a las posiciones que se pueden verificar contra ese
// esqueleto ya completo -- nunca añaden filas nuevas, así que una fila
// espuria (la fila "Total" de Garmin, sin FC "5:55" y sin ninguna etiqueta
// que la distinga de un km real cuando la vista está desplazada del todo a
// la derecha, sin la columna "Tipo" donde normalmente se lee "Total") no
// puede colarse como un km 15 inventado: su ritmo no coincide con ningún
// km real del esqueleto, así que no encuentra dónde encajar y se descarta.
const MIN_PACE_OVERLAP_MATCHES = 2;

function applyFieldMerge(existing, lap) {

    // Si ambas capturas traen ritmo para la misma posición y no coincide,
    // no son en realidad el mismo km real -- alguna de las dos se
    // desalineó. Más seguro no fusionar nada de esa fila que arriesgarse a
    // pegar la FC de un km en el ritmo de otro.
    if (existing.pace_min_km != null && lap.pace_min_km != null && existing.pace_min_km !== lap.pace_min_km) return;

    Object.entries(lap).forEach(([key, value]) => {
        if (value != null && existing[key] == null) existing[key] = value;
    });

}

// Reparte candidateLaps entre "resueltas por clave directa" (se fusionan ya
// mismo, fila a fila e independientes entre sí -- (blockLap, childIndex) es
// una identidad absoluta, no depende de la posición dentro del array, así
// que una captura que salta de un bloque a otro sin filas intermedias --
// REAL_RIGHT_VIEW_TEXT, con solo 4 de las 11 filas del bloque 1 antes de
// saltar al bloque 2 -- no rompe nada) y "sin resolver" (blockLap
// desconocido, o una posición que la secuencia aún no tiene).
function matchByKey(sequence, candidateLaps) {

    const seqKeyIndex = new Map();
    sequence.forEach((lap, index) => {
        if (lap.blockLap != null) seqKeyIndex.set(`${lap.blockLap}:${lap.childIndex}`, index);
    });

    const unresolved = [];
    candidateLaps.forEach(lap => {
        const key = lap.blockLap != null ? `${lap.blockLap}:${lap.childIndex}` : null;
        const target = key != null ? seqKeyIndex.get(key) : null;
        if (target == null) { unresolved.push(lap); return; }
        applyFieldMerge(sequence[target], lap);
    });

    return unresolved;

}

// Una fila hija sin blockLap apareció antes de ver ningún bloque EN ESA
// captura (el bloque que la precede de verdad quedó recortado por encima
// del encuadre) -- por construcción de parser-intervals-road.js, como mucho
// hay UNA de estas rachas iniciales por captura. Si esa misma captura SÍ
// muestra más adelante el primer bloque siguiente (nextBlockLap), se puede
// inferir con seguridad de qué bloque se trata (el anterior) y su posición
// real dentro de él, usando cuántas filas hijas tiene ese bloque según la
// secuencia YA COMPLETA -- solo se llama con la secuencia ya formada a
// partir de las capturas con distancia, nunca al construirla, así que ese
// recuento ya es el real (a diferencia de un intento anterior que lo
// calculaba sobre una secuencia todavía incompleta y desplazaba las
// posiciones).
function resolveOrphanRun(sequence, unresolved, nextBlockLap) {

    if (nextBlockLap == null) return unresolved;

    const firstKnown = unresolved.findIndex(l => l.blockLap != null);
    const leading = firstKnown === -1 ? unresolved : unresolved.slice(0, firstKnown);
    if (!leading.length) return unresolved;

    const resolvedBlock = nextBlockLap - 1;
    if (resolvedBlock < 1) return unresolved;

    const knownCount = sequence.reduce((max, l) => (l.blockLap === resolvedBlock && l.childIndex > max ? l.childIndex : max), 0);
    if (!knownCount) return unresolved;

    const startIndex = knownCount - leading.length + 1;
    if (startIndex < 1) return unresolved; // la captura dice tener más filas de ese bloque de las que la secuencia conoce -- no se puede posicionar con seguridad.

    const resolvedLeading = leading.map((lap, i) => ({ ...lap, blockLap: resolvedBlock, childIndex: startIndex + i }));
    return [...resolvedLeading, ...unresolved.slice(firstKnown === -1 ? unresolved.length : firstKnown)];

}

// Solape de ritmo: única señal que queda para lo que ni tiene clave directa
// ni se pudo anclar por bloque -- cada coincidencia EXACTA de ritmo entre
// una fila y la secuencia "vota" por el desplazamiento que las haría
// corresponder. El ritmo real de cada km varía lo bastante de sus vecinos
// como para que 2+ coincidencias consecutivas sin contradicción sean prueba
// sólida -- a diferencia de la FC (que sí puede quedarse plana varios km,
// ver el test "false-positive" más abajo), un ritmo GPS real no se repite
// así por casualidad.
function findPaceOverlapOffset(sequence, laps) {

    const votes = new Map();
    laps.forEach((lap, i) => {
        if (lap.pace_min_km == null) return;
        sequence.forEach((seqLap, j) => {
            if (seqLap.pace_min_km !== lap.pace_min_km) return;
            const offset = j - i;
            votes.set(offset, (votes.get(offset) ?? 0) + 1);
        });
    });

    let bestOffset = null, bestVotes = 0;
    votes.forEach((count, offset) => { if (count > bestVotes) { bestVotes = count; bestOffset = offset; } });
    if (bestOffset == null || bestVotes < MIN_PACE_OVERLAP_MATCHES) return null;

    // El desplazamiento ganador no puede contradecir NINGUNA fila (no solo
    // las que votaron).
    for (let i = 0; i < laps.length; i++) {
        const target = sequence[i + bestOffset];
        if (!target || target.pace_min_km == null || laps[i].pace_min_km == null) continue;
        if (target.pace_min_km !== laps[i].pace_min_km) return null;
    }

    return bestOffset;

}

// allowExtend=false impide que esta captura añada filas nuevas al final --
// reservado a capturas SIN distancia (no pueden demostrar que un km nuevo
// es real, solo ritmo/FC que podría pertenecer a cualquier tramo, o ser la
// fila "Total" mal recortada, ver el bug real documentado más arriba).
function mergeIntoSequence(sequence, candidateLaps, { allowExtend, nextBlockLap = null }) {

    let unresolved = matchByKey(sequence, candidateLaps);
    if (!unresolved.length) return;

    // resolveOrphanRun asume que el recuento de filas por bloque de
    // `sequence` YA es el definitivo -- cierto para el relleno de FC
    // (allowExtend=false, después de cerrar el esqueleto), pero no
    // mientras el propio esqueleto todavía se está construyendo
    // (allowExtend=true): un recuento aún incompleto en ese momento
    // desplazaría la posición inferida (verificado real: descolocaba en 1
    // las filas de una vista izquierda parcial que sí llegaba hasta el
    // final del bloque 1 cuando otra vista izquierda, procesada antes,
    // solo había aportado 10 de sus 11 filas). Durante la construcción del
    // esqueleto solo se confía en clave directa + solape de ritmo.
    if (!allowExtend) {
        unresolved = resolveOrphanRun(sequence, unresolved, nextBlockLap);
        unresolved = matchByKey(sequence, unresolved);
        if (!unresolved.length) return;
    }

    const offset = findPaceOverlapOffset(sequence, unresolved);
    if (offset == null) return; // sin ninguna referencia fiable -- se descarta el resto de esta captura.

    unresolved.forEach((lap, i) => {

        const target = i + offset;
        if (target < 0 || target > sequence.length) return; // hueco o fuera de rango -- no se inventa una posición.

        if (target === sequence.length) {
            if (allowExtend) sequence.push({ ...lap });
            return;
        }

        applyFieldMerge(sequence[target], lap);

    });

}

// Reasigna blockLap/childIndex a cada fila del esqueleto ya completo
// consumiendo los bloques absolutos (ordenados) por distancia acumulada --
// más fiable que arrastrar esos campos a través de cada fusión, porque no
// depende de qué fila concreta "trajo" la etiqueta originalmente (algunas,
// como una fila huérfana recuperada por solape de ritmo, no traían
// ninguna). Un bloque sin distancia conocida (ninguna captura la trajo) no
// se puede consumir con seguridad -- se deja el resto del esqueleto sin
// re-etiquetar antes que asignar mal el resto.
function retagSequenceWithBlocks(sequence, blocks) {

    let seqIndex = 0;

    [...blocks].sort((a, b) => a.lap - b.lap).forEach(block => {

        if (block.distance_km == null) return;

        let consumed = 0;
        let childIndex = 0;

        while (seqIndex < sequence.length && consumed < block.distance_km - 0.005) {
            childIndex++;
            sequence[seqIndex].blockLap = block.lap;
            sequence[seqIndex].childIndex = childIndex;
            consumed += sequence[seqIndex].distance_km ?? 0;
            seqIndex++;
        }

    });

}

function mergeIntervalsRoadLaps(results) {

    const candidates = results.filter(r => r.parser?.startsWith("intervals-road") && r.extras?.laps?.length);
    if (!candidates.length) return [];

    // Las capturas CON distancia (vista izquierda, o una vista derecha que
    // también traiga la columna Distancia) son las únicas que pueden
    // demostrar que un km es real y dónde acaba -- forman el "esqueleto"
    // (orden + distancia). Las capturas sin distancia (típicamente FC) solo
    // rellenan huecos en ese esqueleto, nunca lo alargan.
    const distanceBearing = candidates.filter(c => c.extras.laps.some(l => l.distance_km != null));
    const hrOnly = candidates.filter(c => !distanceBearing.includes(c));

    // Si ninguna captura trae distancia (caso raro pero posible), mejor
    // partir de la más completa igualmente que devolver nada.
    const skeletonSource = distanceBearing.length ? distanceBearing : candidates;
    const seed = skeletonSource.reduce((a, b) => (b.extras.laps.length > a.extras.laps.length ? b : a));

    const sequence = seed.extras.laps.map(lap => ({ ...lap }));

    const nextBlockLapOf = c => c.extras.blocks?.[0]?.lap ?? null;

    skeletonSource.filter(c => c !== seed)
        .forEach(c => mergeIntoSequence(sequence, c.extras.laps, { allowExtend: true, nextBlockLap: nextBlockLapOf(c) }));

    // El esqueleto ya está completo (orden + distancia reales) -- se
    // re-etiqueta blockLap/childIndex desde cero usando los bloques
    // absolutos conocidos (por distancia acumulada), en vez de arrastrar
    // esos campos fila a fila durante la fusión anterior: una fila
    // extendida por solape de ritmo (huérfana, sin blockLap propio) se
    // quedaba sin etiquetar, y eso hacía que el relleno de FC de más abajo
    // (que sí necesita blockLap para ubicar filas huérfanas de otras
    // capturas) contara mal cuántas filas tiene ese bloque.
    retagSequenceWithBlocks(sequence, mergeBlocks(candidates));

    if (distanceBearing.length) {
        hrOnly.forEach(c => mergeIntoSequence(sequence, c.extras.laps, { allowExtend: false, nextBlockLap: nextBlockLapOf(c) }));
    }

    // El orden ya es el correcto -- aquí solo se renumera de forma
    // secuencial y se quitan los campos de posicionamiento internos.
    return sequence.map(({ blockLap, childIndex, ...lap }, index) => ({ ...lap, lap: index + 1 }));

}

// Bloques reales de "Intervalos" de una Carrera normal (ver
// parser-intervals-road.js) -- a diferencia de mergeLaps(), el número de
// bloque ("Int.") YA es el real (no relativo a la posición de scroll de
// esa captura, como sí pasa con la tabla de Vueltas-con-FC), así que no
// hace falta ningún realineamiento por solape: basta con fusionar campo a
// campo (mergeLapIntoMap ya es genérico, no depende de forma "splits") las
// capturas de la vista izquierda (Tipo/Tiempo/Distancia/Ritmo medio) y
// derecha (Distancia/Ritmo medio/FC media/FC máx.) del mismo bloque.
function mergeBlocks(results) {

    const blocksByNumber = new Map();

    results
        .filter(r => Array.isArray(r.extras?.blocks) && r.extras.blocks.length)
        .forEach(result => {
            result.extras.blocks.forEach(block => mergeLapIntoMap(blocksByNumber, block));
        });

    return [...blocksByNumber.values()].sort((a, b) => a.lap - b.lap);

}

export function merge(results) {
    const fields = {};
    const fieldParser = {};

    const identity = ["title", "location", "activity", "date", "time"];

    // Calorías totales (Resumen) y activas (Estadísticas) son magnitudes
    // distintas, no dos lecturas del mismo dato — a diferencia del resto
    // de métricas, aquí Estadísticas NO debe pisar a Resumen; solo sirve
    // de fallback si Resumen no detectó nada.
    const summaryPreferredMetrics = ["calories_kcal"];

    results.forEach((result, index) => {
        Object.entries(result.fields || {}).forEach(([key, item]) => {
            if (item?.value == null) return;
            const candidate = { ...item, capture: index + 1 };
            const current = fields[key];

            // Summary owns identity fields.
            if (identity.includes(key) || summaryPreferredMetrics.includes(key)) {
                if (result.parser.startsWith("summary") && (!current || candidate.confidence >= current.confidence)) {
                    fields[key] = candidate;
                    fieldParser[key] = result.parser;
                } else if (!current && !result.parser.startsWith("summary")) {
                    fields[key] = candidate;
                    fieldParser[key] = result.parser;
                }
                return;
            }

            // Métricas: Estadísticas manda sobre Resumen aunque la confianza
            // empate o incluso sea menor — Resumen puede leer una fila que no
            // es la suya (p. ej. el ritmo donde debería ir el tiempo total).
            const candidateIsStatistics = result.parser.startsWith("statistics");
            const currentIsStatistics = fieldParser[key]?.startsWith("statistics");
            const currentIsSummary = fieldParser[key]?.startsWith("summary");

            let replace;
            if (!current) {
                replace = true;
            } else if (currentIsStatistics && !candidateIsStatistics) {
                replace = false;
            } else if (candidateIsStatistics && currentIsSummary) {
                replace = true;
            } else {
                replace = candidate.confidence > current.confidence;
            }

            if (replace) {
                fields[key] = candidate;
                fieldParser[key] = result.parser;
            }
        });
    });

    KEYS.forEach(k => { if (!fields[k]) fields[k] = U.field(null, null, 0) });
    const data = Object.fromEntries(KEYS.map(k => [k, fields[k].value]));
    const warnings = [];

    const laps = mergeLaps(results);
    const blocks = mergeBlocks(results);

    // Avisos generados por el propio parser de una captura (hoy solo
    // parser-intervals-road.js, ver checkBlockChildSum) -- se agregan tal
    // cual, sin deduplicar: cada captura avisa como mucho una vez por
    // bloque real que no cuadra.
    results.forEach(r => { if (Array.isArray(r.extras?.warnings)) warnings.push(...r.extras.warnings); });

    if (!data.title) warnings.push("Falta el título del entrenamiento.");
    if (!data.date) warnings.push("Falta la fecha del entrenamiento.");
    if (data.calories_kcal != null && data.distance_km != null && data.calories_kcal < data.distance_km * 25) {
        warnings.push("Las calorías parecen demasiado bajas para la distancia.");
    }
    if (data.cadence_spm != null && data.cadence_spm < 80) {
        warnings.push("La cadencia se ha descartado o debe revisarse por ser demasiado baja.");
    }
    if (data.distance_km != null && data.distance_km > 100) {
        warnings.push("La distancia parece demasiado alta y debe revisarse.");
    }

    // Señal casi segura de un error de lectura: el ritmo y el tiempo total
    // no pueden coincidir letra a letra en una carrera real.
    if (data.total_time != null && data.avg_pace_min_km != null && data.total_time === data.avg_pace_min_km) {
        warnings.push("El tiempo total y el ritmo medio son idénticos — probable error de lectura.");
    }

    // Coherencia: distancia × ritmo medio debe aproximarse al tiempo total
    // (10% de margen por redondeo de GPS/ritmo y paradas puntuales).
    const paceSec = paceToSeconds(data.avg_pace_min_km);
    const durationSec = durationToSeconds(data.total_time);
    if (data.distance_km != null && paceSec != null && durationSec != null && durationSec > 0) {
        const expectedSec = data.distance_km * paceSec;
        const diffRatio = Math.abs(expectedSec - durationSec) / durationSec;
        if (diffRatio > 0.1) {
            warnings.push("La duración total no cuadra con distancia × ritmo medio — revisar.");
        }
    }

    return {
        parser: "garmin-final-v4.2.2",
        found: Object.values(data).filter(v => v != null).length,
        data, fields, warnings, laps, blocks
    };
}
