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
function mergeLaps(results) {

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
