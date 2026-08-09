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
const PPM_UNIT = "[bp][a-z]{1,4}";
// Cadencia además puede venir en "spm" (pasos/carreras por minuto), que
// PPM_UNIT no cubre por arrancar en "s" — mismo criterio de tolerancia.
const CADENCE_NUM = "[0-9]{2,3}";
const CADENCE_UNIT = "[bsp][a-z]{1,4}";

const DISTANCE_NUM = "[0-9]{1,3}[,.][0-9]{1,2}";

// "km" se lee mal con bastante frecuencia ("in", "kin", "krn", "irn"...)
// — a diferencia de FC/cadencia no hay una unidad alternativa razonable
// que enumerar, así que aquí directamente no se exige ninguna. La
// etiqueta "distancia" (a veces en la línea de después del número, no
// antes) es la señal fiable y basta como ancla por sí sola.
export function distance(raw) {
    const text = compact(raw);
    const patterns = [
        new RegExp(`distancia(?:\\s+recorrida|\\s+real)?[\\s\\S]{0,45}?(${DISTANCE_NUM})`, "i"),
        new RegExp(`(${DISTANCE_NUM})[\\s\\S]{0,45}?distancia(?:\\s+recorrida|\\s+real)?`, "i")
    ];

    for (const regex of patterns) {
        const m = text.match(regex);
        if (!m) continue;
        const value = numberParser(m[1]);
        if (V.distance(value)) return { value, source: m[0], confidence: .98 };
    }
    return null;
}

export function avgHeartRate(raw) {
    const text = compact(raw);
    const patterns = [
        new RegExp(`frecuencia cardiaca media[\\s\\S]{0,35}?(${HR_NUM}\\s*${PPM_UNIT})`, "i"),
        new RegExp(`(${HR_NUM}\\s*${PPM_UNIT})[\\s\\S]{0,35}?frecuencia cardiaca media`, "i"),
        new RegExp(`fc media[\\s\\S]{0,25}?(${HR_NUM}\\s*${PPM_UNIT})`, "i"),
        new RegExp(`(${HR_NUM}\\s*${PPM_UNIT})[\\s\\S]{0,25}?fc media`, "i")
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
        new RegExp(`frecuencia cardiaca media[\\s\\S]{0,10}?(?:frecuencia cardiaca maxima|frec\\s*cardiaca\\s*max|fc maxima)[\\s\\S]{0,15}?${HR_NUM}\\s*${PPM_UNIT}[\\s\\S]{0,15}?(${HR_NUM}\\s*${PPM_UNIT})`, "i"),
        new RegExp(`(?:frecuencia cardiaca maxima|frec\\s*cardiaca\\s*max|fc maxima)[\\s\\S]{0,45}?(${HR_NUM}\\s*${PPM_UNIT})`, "i"),
        new RegExp(`(${HR_NUM}\\s*${PPM_UNIT})[\\s\\S]{0,45}?(?:frecuencia cardiaca maxima|frec\\s*cardiaca\\s*max|fc maxima)`, "i")
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
        // La barra de "m:ss/km" es un trazo fino que el OCR pierde con
        // frecuencia (mismo caso que "km" en distancia y "ppm" en FC) —
        // se hace opcional. "km" sigue siendo obligatorio: sin barra,
        // es lo único que distingue un ritmo de una duración con el
        // mismo formato m:ss, ya que la etiqueta "ritmo medio" ancla el
        // resto.
        ["[0-9]{1,2}\\s*[:.]\\s*[0-5][0-9]\\s*\\/?\\s*km"],
        paceParser,
        V.pace
    );
}

// Solo "etiqueta -> número", nunca al revés. findAnchored() también
// prueba "número -> etiqueta" para levantar los layouts de dos columnas
// (como en FC media/máxima) — pero cuando el OCR se salta del todo la
// fila de números bajo "Tiempo total" (etiqueta leída, cifra no), esa
// dirección hacia atrás cuela el número de la fila anterior (el ritmo)
// como si fuera la duración. Mejor devolver null que un dato inventado.
const TIME_VALUE = "(?:[0-9]{1,2}:)?[0-9]{1,3}:[0-5][0-9]";

export function totalTime(raw) {
    const text = compact(raw);
    const labels = [
        "tiempo total",
        "duracion total",
        "tiempo de actividad",
        "tiempo del recorrido"
    ];

    for (const label of labels) {
        const regex = new RegExp(`(?:${label})[\\s\\S]{0,45}?(${TIME_VALUE})`, "i");
        const m = text.match(regex);
        if (!m) continue;
        const value = durationParser(m[1]);
        if (value != null && V.duration(value)) {
            return { value, source: m[0], confidence: .98 };
        }
    }
    return null;
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

// Alias de la etiqueta de cadencia máxima — el OCR la trunca a "máx." tan
// a menudo como la deja completa ("máxima"); tras normalizeLabel ambas
// pierden el acento y el punto, así que hace falta cubrir las dos formas.
const MAX_CADENCE_LABEL = "(?:cadencia maxima de carrera|cadencia max de carrera|cadencia maxima|cadencia max)";

export function cadence(raw) {
    const text = normalizeLabel(compact(raw));

    // Layout de dos columnas (mismo caso que maxCadence/maxHeartRate):
    // ambas etiquetas seguidas, valores en la fila de abajo — el primer
    // número tras saltar las dos etiquetas es el propio de "media". Va
    // fuera del bucle de abajo porque, a diferencia de los demás patrones,
    // este SÍ atraviesa a propósito la etiqueta "máx." para llegar a él.
    const twoColumn = text.match(new RegExp(
        `cadencia media[\\s\\S]{0,10}?${MAX_CADENCE_LABEL}[\\s\\S]{0,15}?(${CADENCE_NUM}\\s*${CADENCE_UNIT})`,
        "i"
    ));
    if (twoColumn) {
        const value = numberParser(twoColumn[1]);
        if (V.cadence(value)) return { value, source: twoColumn[0], confidence: .99 };
    }

    const patterns = [
        new RegExp(`cadencia media de carrera[\\s\\S]{0,35}?(${CADENCE_NUM}\\s*${CADENCE_UNIT})`, "i"),
        new RegExp(`(${CADENCE_NUM}\\s*${CADENCE_UNIT})[\\s\\S]{0,35}?cadencia media de carrera`, "i"),
        new RegExp(`cadencia media[\\s\\S]{0,25}?(${CADENCE_NUM}\\s*${CADENCE_UNIT})`, "i"),
        new RegExp(`(${CADENCE_NUM}\\s*${CADENCE_UNIT})[\\s\\S]{0,25}?cadencia media`, "i")
    ];

    for (const regex of patterns) {
        const m = text.match(regex);
        if (!m) continue;
        if (/max/.test(m[0])) continue;
        const value = numberParser(m[1]);
        if (V.cadence(value)) return { value, source: m[0], confidence: .99 };
    }
    return null;
}

export function maxCadence(raw) {
    const text = normalizeLabel(compact(raw));
    const patterns = [
        // Mismo layout de dos columnas que maxHeartRate: media y máx. en
        // la misma fila de etiquetas, valores en la fila de abajo.
        new RegExp(`cadencia media[\\s\\S]{0,10}?${MAX_CADENCE_LABEL}[\\s\\S]{0,15}?${CADENCE_NUM}\\s*${CADENCE_UNIT}[\\s\\S]{0,15}?(${CADENCE_NUM}\\s*${CADENCE_UNIT})`, "i"),
        new RegExp(`${MAX_CADENCE_LABEL}[\\s\\S]{0,45}?(${CADENCE_NUM}\\s*${CADENCE_UNIT})`, "i"),
        new RegExp(`(${CADENCE_NUM}\\s*${CADENCE_UNIT})[\\s\\S]{0,45}?${MAX_CADENCE_LABEL}`, "i")
    ];

    for (const regex of patterns) {
        const match = text.match(regex);
        if (!match) continue;

        // Mismo filtro que maxHeartRate: si el número del patrón invertido
        // viene pegado a "media", es el de la cadencia media, no la máxima.
        const before = text.slice(Math.max(0, match.index - 20), match.index);
        if (/media\s*$/.test(before)) continue;

        const value = numberParser(match[1]);
        if (V.cadence(value)) {
            return { value, source: match[0], confidence: .99 };
        }
    }
    return null;
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
