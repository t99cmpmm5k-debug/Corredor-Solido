import * as U from "./garmin-utils.js";

// Fila de Carrera real: "1 Carrera 4:21.6 1000 4:22" (nº, tiempo, distancia
// EN METROS sin decimal — a diferencia de Vueltas, esta tabla no usa km con
// coma — y ritmo). Se matchea sobre la línea ya normalizada (minúsculas,
// sin acentos) para no depender de si el OCR conserva la tilde de más abajo.
const CARRERA_RE = /^([0-9]{1,2})\s+carrera\s+([0-9]{1,2}:[0-5][0-9](?:[.,][0-9]+)?)\s+([0-9]{1,4})\s+([0-9]{1,2}:[0-5][0-9])$/;

// Fila de Recuperación: misma forma pero sin número propio — pertenece a la
// Carrera anterior. "recuperacion" cubre tanto "Recuperación" como una
// lectura del OCR que pierda la tilde (normalize() ya se la quita a ambas).
const RECUPERACION_RE = /^recuperacion\s+([0-9]{1,2}:[0-5][0-9](?:[.,][0-9]+)?)\s+([0-9]{1,4})\s+([0-9]{1,2}:[0-5][0-9])$/;

export function parse(text) {
    const raw = U.cleanText(text);
    const lines = U.linesOf(raw);
    const laps = [];

    // Recuerda a qué Carrera pertenece la próxima fila de Recuperación.
    let currentInterval = null;

    for (const line of lines) {
        const n = U.normalize(line);

        // La fila de resumen ("Total 25:45.6 4770 5:24") no es un intervalo
        // real — se descarta antes de intentar leerla como Carrera/Recuperación.
        if (/^total\b/.test(n)) continue;

        const work = n.match(CARRERA_RE);
        if (work) {
            currentInterval = Number(work[1]);
            laps.push({
                lap: currentInterval,
                distance_km: Number(work[3]) / 1000,
                pace_min_km: U.pace(work[4]),
                segmentType: "work"
            });
            continue;
        }

        // Numeración N+0.5: reutiliza la fusión por "lap" ya existente
        // (fusion.js) sin tocarla — cada Recuperación queda su propia
        // entrada, nunca descartada ni fusionada con la Carrera vecina.
        const rest = n.match(RECUPERACION_RE);
        if (rest && currentInterval != null) {
            laps.push({
                lap: currentInterval + 0.5,
                distance_km: Number(rest[2]) / 1000,
                pace_min_km: U.pace(rest[3]),
                segmentType: "rest"
            });
        }
    }

    return {
        parser: "intervals-v1",
        fields: {
            source: U.field("Garmin", "Pantalla Intervalos", .99),
            screen_type: U.field("intervals", "Intervalos", .98)
        },
        extras: { laps }
    };
}
