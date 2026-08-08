import * as U from "./garmin-utils.js";

const KEYS = [
    "source", "screen_type", "title", "location", "activity", "date", "time",
    "distance_km", "avg_heart_rate_bpm", "max_heart_rate_bpm",
    "avg_pace_min_km", "total_time", "calories_kcal", "cadence_spm",
    "temperature_c", "elevation_gain_m"
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

    // Parciales: se juntan los de TODAS las capturas de Vueltas (una
    // carrera larga puede no caber en una sola pantalla), sin duplicar
    // por número de vuelta (por si se sube la misma captura dos veces)
    // y ordenados, por si las capturas no llegan en orden.
    const lapsByNumber = new Map();
    results
        .filter(r => Array.isArray(r.extras?.laps))
        .flatMap(r => r.extras.laps)
        .forEach(lap => {
            if (!lapsByNumber.has(lap.lap)) lapsByNumber.set(lap.lap, lap);
        });
    const laps = [...lapsByNumber.values()].sort((a, b) => a.lap - b.lap);

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
        data, fields, warnings, laps
    };
}
