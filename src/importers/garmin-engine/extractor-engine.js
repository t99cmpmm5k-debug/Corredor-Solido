import * as U from "./garmin-utils.js";
import * as V from "./validators.js";

function compact(text) {
    return U.cleanText(text).replace(/[ \t]+/g, " ").trim();
}

function normalizeLabel(label) {
    return U.normalize(label)
        .replace(/[.:]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function findAnchored(raw, labelPatterns, valuePatterns, parser, validator) {
    const text = compact(raw);

    for (const label of labelPatterns) {
        for (const value of valuePatterns) {
            const after = new RegExp(`(?:${label})[\\s\\S]{0,45}?(${value})`, "i");
            const before = new RegExp(`(${value})[\\s\\S]{0,45}?(?:${label})`, "i");

            for (const regex of [after, before]) {
                const m = text.match(regex);
                if (!m) continue;
                const parsed = parser(m[1]);
                if (parsed != null && validator(parsed)) {
                    return { value: parsed, source: m[0], confidence: .98 };
                }
            }
        }
    }
    return null;
}

function numberParser(value) { return U.num(value); }
function paceParser(value) { return U.pace(value); }
function durationParser(value) { return U.duration(value); }

const HR_NUM = "(?:[3-9][0-9]|1[0-9]{2}|2[0-4][0-9])";
// "ppm"/"bpm" salen mal leídos con frecuencia (p<->o, p<->r, m<->rn/in) —
// p. ej. "172 pom" en vez de "172 ppm". Exigir la unidad letra a letra
// dejaba caer el número real al fallback y fusionaba el de otra fila.
// Basta con que arranque por b/p y tenga un par de letras más pegadas.
const HR_UNIT = "[bp][a-z]{1,4}";

export function distance(raw) {
    return findAnchored(
        raw,
        ["distancia(?: recorrida| real)?"],
        ["[0-9]{1,3}[,.][0-9]{1,2}\\s*km"],
        numberParser,
        V.distance
    );
}

export function avgHeartRate(raw) {
    const text = compact(raw);
    const patterns = [
        new RegExp(`frecuencia cardiaca media[\\s\\S]{0,35}?(${HR_NUM}\\s*${HR_UNIT})`, "i"),
        new RegExp(`(${HR_NUM}\\s*${HR_UNIT})[\\s\\S]{0,35}?frecuencia cardiaca media`, "i"),
        new RegExp(`fc media[\\s\\S]{0,25}?(${HR_NUM}\\s*${HR_UNIT})`, "i"),
        new RegExp(`(${HR_NUM}\\s*${HR_UNIT})[\\s\\S]{0,25}?fc media`, "i")
    ];

    for (const regex of patterns) {
        const m = text.match(regex);
        if (!m) continue;
        if (/max\.?|maxima/.test(normalizeLabel(m[0]))) continue;
        const value = numberParser(m[1]);
        if (V.heartRate(value)) return { value, source: m[0], confidence: .99 };
    }
    return null;
}

export function maxHeartRate(raw) {
    const text = normalizeLabel(compact(raw));
    const patterns = [
        // Layout de dos columnas (media y máx. en la misma fila, valores
        // en la fila de abajo): tras aplanar saltos de línea a espacios,
        // el número más cercano a la etiqueta "máx." es en realidad el de
        // "media" — hay que exigir las dos etiquetas seguidas y saltar al
        // segundo número.
        new RegExp(`frecuencia cardiaca media[\\s\\S]{0,10}?(?:frecuencia cardiaca maxima|frec\\s*cardiaca\\s*max|fc maxima)[\\s\\S]{0,15}?${HR_NUM}\\s*${HR_UNIT}[\\s\\S]{0,15}?(${HR_NUM}\\s*${HR_UNIT})`, "i"),
        new RegExp(`(?:frecuencia cardiaca maxima|frec\\s*cardiaca\\s*max|fc maxima)[\\s\\S]{0,45}?(${HR_NUM}\\s*${HR_UNIT})`, "i"),
        new RegExp(`(${HR_NUM}\\s*${HR_UNIT})[\\s\\S]{0,45}?(?:frecuencia cardiaca maxima|frec\\s*cardiaca\\s*max|fc maxima)`, "i")
    ];

    for (const regex of patterns) {
        const match = text.match(regex);
        if (!match) continue;

        // El último patrón acepta "número + etiqueta máx." en cualquier
        // orden (para el layout donde el número sale antes) — pero si ese
        // número viene precedido de "media" a poca distancia, no es el de
        // "máxima": es el de la frecuencia media, y la etiqueta "máx." que
        // el OCR sí leyó pertenece a un número que se perdió en la lectura.
        // Sin este filtro se fusiona el valor medio como si fuera el máximo.
        const before = text.slice(Math.max(0, match.index - 20), match.index);
        if (/media\s*$/.test(before)) continue;

        const value = numberParser(match[1]);
        if (V.heartRate(value)) {
            return { value, source: match[0], confidence: .99 };
        }
    }
    return null;
}

export function avgPace(raw) {
    return findAnchored(
        raw,
        [
            // "ritmo medio" es prefijo de sus propias variantes ("ritmo
            // medio en movimiento", "...adapt pend", "...de carrera") — sin
            // esta negativa, cualquiera de esas cuela como si fuera la
            // etiqueta buena. Solo debe valer "ritmo medio" a secas.
            "ritmo medio(?!\\s+(?:en movimiento|adapt|de carrera))",
            "ritmo promedio",
            "ritmo del recorrido",
            "ritmo medio de carrera"
        ],
        ["[0-9]{1,2}\\s*[:.]\\s*[0-5][0-9]\\s*\\/\\s*km"],
        paceParser,
        V.pace
    );
}

export function totalTime(raw) {
    return findAnchored(
        raw,
        [
            "tiempo total",
            "duracion total",
            "tiempo de actividad",
            "tiempo del recorrido"
        ],
        ["(?:[0-9]{1,2}:)?[0-9]{1,3}:[0-5][0-9]"],
        durationParser,
        V.duration
    );
}

export function calories(raw) {
    const text = normalizeLabel(compact(raw));

    // Highest priority: total calories. Accents and punctuation are already removed.
    const totalPatterns = [
        /(?:calorias totales|total de calorias quemadas|total de calorias|total calorias)[\s\S]{0,45}?([0-9]{2,5})(?:\s*kcal)?/i,
        /([0-9]{2,5})(?:\s*kcal)?[\s\S]{0,45}?(?:calorias totales|total de calorias quemadas|total de calorias|total calorias)/i
    ];

    for (const regex of totalPatterns) {
        const match = text.match(regex);
        if (!match) continue;
        if (/calorias en reposo/.test(match[0])) continue;
        const value = numberParser(match[1]);
        if (V.calories(value)) {
            return { value, source: match[0], confidence: .99 };
        }
    }

    // Fallback only when total calories are not visible.
    const activePatterns = [
        /calorias activas[\s\S]{0,35}?([0-9]{2,5})(?:\s*kcal)?/i,
        /([0-9]{2,5})(?:\s*kcal)?[\s\S]{0,35}?calorias activas/i
    ];

    for (const regex of activePatterns) {
        const match = text.match(regex);
        if (!match) continue;
        const value = numberParser(match[1]);
        if (V.calories(value)) {
            return { value, source: match[0], confidence: .96 };
        }
    }

    return null;
}

export function cadence(raw) {
    return findAnchored(
        raw,
        ["cadencia media de carrera", "cadencia media"],
        ["[0-9]{2,3}\\s*(?:ppm|spm)"],
        numberParser,
        V.cadence
    );
}

export function temperature(raw) {
    return findAnchored(
        raw,
        ["temperatura media", "temperatura"],
        ["-?[0-9]{1,2}(?:[,.][0-9])?\\s*°?\\s*c"],
        numberParser,
        V.temperature
    );
}

export function elevation(raw) {
    return findAnchored(
        raw,
        ["ascenso total", "desnivel positivo", "ganancia de altura"],
        ["[0-9]{1,5}\\s*m"],
        numberParser,
        V.elevation
    );
}
