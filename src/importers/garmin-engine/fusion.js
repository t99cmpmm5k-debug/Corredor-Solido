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
// En vez de eso, se combinan por POSICIÓN real: cada fila hija ya viene de
// parser-intervals-road.js anclada a su bloque real (blockLap) y a su
// orden dentro de él (childIndex) -- el número de bloque SÍ es absoluto
// (no relativo a la captura, a diferencia de la numeración de Vueltas), así
// que (blockLap, childIndex) identifica el mismo kilómetro físico en
// cualquier captura de esta pantalla, sea cual sea su recorte de scroll.
// Esto es lo que permite recuperar la FC real de una captura parcial de la
// vista derecha (que casi nunca cabe entera) sin arriesgarse al bug de
// duplicados/km fuera de rango que tenía el intento anterior (offset
// global + solape de FC).
//
// Se parte de la captura más completa (más filas hijas; a igualdad, la que
// además trae FC) como "columna vertebral": su orden y distancias ya están
// verificados (checkBlockChildSum), así que fijan la lista final. Las
// demás capturas solo APORTAN campos que falten (typicamente FC) en las
// posiciones donde se puede confirmar que hablan del mismo km -- nunca
// sustituyen ni reordenan la columna vertebral.
function mergeIntervalsRoadLaps(results) {

    const candidates = results.filter(r => r.parser?.startsWith("intervals-road") && r.extras?.laps?.length);
    if (!candidates.length) return [];

    const backbone = candidates.reduce((a, b) => {
        if (b.extras.laps.length !== a.extras.laps.length) {
            return b.extras.laps.length > a.extras.laps.length ? b : a;
        }
        const bHasHr = b.extras.laps.some(l => l.avg_heart_rate_bpm != null);
        const aHasHr = a.extras.laps.some(l => l.avg_heart_rate_bpm != null);
        return (bHasHr && !aHasHr) ? b : a;
    });

    // Copia mutable de la columna vertebral, en su orden original -- ese
    // orden ya es el real (viene de una única captura sin mezclar).
    const merged = backbone.extras.laps.map(lap => ({ ...lap }));

    // Cuántas filas hijas conoce la columna vertebral por bloque -- hace
    // falta para poder resolver una fila hija de OTRA captura que aparezca
    // antes de ver ningún bloque en ESA captura (recortada por scroll, ver
    // resolveLeadingRun más abajo).
    const blockChildCount = new Map();
    merged.forEach(lap => {
        if (lap.blockLap == null) return;
        const count = blockChildCount.get(lap.blockLap) ?? 0;
        if (lap.childIndex > count) blockChildCount.set(lap.blockLap, lap.childIndex);
    });

    const positionByKey = new Map();
    merged.forEach((lap, index) => {
        if (lap.blockLap != null) positionByKey.set(`${lap.blockLap}:${lap.childIndex}`, index);
    });

    // Una fila hija sin blockLap apareció antes de ver ningún bloque EN ESA
    // captura (el bloque que la precede de verdad quedó recortado por
    // encima del encuadre). Si esa misma captura sí muestra más adelante el
    // primer bloque siguiente, se puede inferir con seguridad de qué bloque
    // se trata (el anterior a ese) y su posición real dentro de él, usando
    // cuántas filas hijas tiene ese bloque según la columna vertebral --
    // nunca al revés (la columna vertebral nunca se corrige con esto).
    function resolveLeadingRun(leadingRows, nextKnownBlockLap) {

        if (nextKnownBlockLap == null) return []; // toda la captura es anónima -- sin ninguna referencia, se descarta entera.

        const resolvedBlock = nextKnownBlockLap - 1;
        const knownCount = blockChildCount.get(resolvedBlock);
        if (resolvedBlock < 1 || knownCount == null) return [];

        const startIndex = knownCount - leadingRows.length + 1;
        if (startIndex < 1) return []; // la captura dice tener más filas de ese bloque de las que la columna vertebral conoce -- no se puede posicionar con seguridad.

        return leadingRows.map((lap, i) => ({ ...lap, blockLap: resolvedBlock, childIndex: startIndex + i }));

    }

    candidates.forEach(result => {
        if (result === backbone) return;

        const laps = result.extras.laps;
        const firstKnownIndex = laps.findIndex(l => l.blockLap != null);
        const leadingRows = firstKnownIndex === -1 ? laps : laps.slice(0, firstKnownIndex);
        const knownRows = firstKnownIndex === -1 ? [] : laps.slice(firstKnownIndex);

        // El bloque que sigue a la fila hija huérfana no siempre trae más
        // filas hijas propias detrás EN ESTA MISMA captura (puede acabar
        // justo en la fila de bloque, ver REAL_RIGHT_VIEW_NO_DIST_TEXT) --
        // así que la referencia real es la propia fila de bloque
        // (extras.blocks[0], el primer bloque que aparece en esta captura,
        // que por construcción es siempre el que sigue a la fila huérfana:
        // blockLap solo es null ANTES de ver el primer bloque de la
        // captura), no la siguiente fila hija con blockLap conocido.
        const nextKnownBlockLap = result.extras.blocks?.[0]?.lap ?? knownRows[0]?.blockLap ?? null;

        const resolvedLeading = leadingRows.length ? resolveLeadingRun(leadingRows, nextKnownBlockLap) : [];

        [...resolvedLeading, ...knownRows].forEach(lap => {

            const position = positionByKey.get(`${lap.blockLap}:${lap.childIndex}`);
            if (position == null) return; // la columna vertebral no tiene esta posición -- no se inventa una fila nueva.

            const target = merged[position];

            // Si ambas capturas traen ritmo para la misma posición y no
            // coincide, no son en realidad el mismo km real -- alguna de
            // las dos se desalineó. Más seguro no fusionar nada de esa fila
            // que arriesgarse a pegar la FC de un km en el ritmo de otro.
            if (target.pace_min_km != null && lap.pace_min_km != null && target.pace_min_km !== lap.pace_min_km) return;

            Object.entries(lap).forEach(([key, value]) => {
                if (value != null && target[key] == null) target[key] = value;
            });

        });

    });

    // El orden ya es el correcto -- es el de la columna vertebral tal cual
    // vino de una única captura sin mezclar; aquí solo se renumera de forma
    // secuencial y se quitan los campos de posicionamiento internos.
    return merged.map(({ blockLap, childIndex, ...lap }, index) => ({ ...lap, lap: index + 1 }));

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
