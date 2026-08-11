import { normalizeText } from "./text.js";

const WEEKDAYS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

const DAY_HEADER_RE = /^([A-Za-zÁÉÍÓÚáéíóú]+)\s+(\d{1,2})\s*-\s*(.+)$/;

const MONTH_YEAR_RE = /(\d{1,2})\s*-\s*(\d{1,2})\s+([A-Za-zÁÉÍÓÚáéíóú]+)\s+(\d{4})/;

const MONTH_NAMES_ES = {
    enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
    julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10,
    noviembre: 11, diciembre: 12
};

// Las 4 etiquetas viven solas en su propia línea en el PDF real (sin ":",
// el texto empieza en la línea siguiente) — no una etiqueta"Objetivo: texto"
// en la misma línea.
const KNOWN_LABELS = ["objetivo", "estructura", "intensidad", "clave"];

// Heurística de cierre de sección (p. ej. "REGLAS DE AJUSTE") — la única
// del parser que es una suposición, no una lectura literal. Se aplica
// solo al cuerpo de la ÚLTIMA sesión (las demás ya están perfectamente
// acotadas por la siguiente cabecera) para no cortar por error el texto
// legítimo de una sesión intermedia que use mayúsculas para énfasis.
const HEADING_LIKE_RE = /^[A-ZÁÉÍÓÚÑ\s]{4,40}$/;

function isKnownLabelLine(line) {
    return KNOWN_LABELS.includes(normalizeText(line));
}

function isDayHeaderLine(line) {

    const match = line.match(DAY_HEADER_RE);
    if (!match) return null;

    const weekday = normalizeText(match[1]);
    if (!WEEKDAYS.includes(weekday)) return null;

    return { dayNumber: Number(match[2]), titleText: match[3].trim() };

}

function extractMonthYear(text) {

    const match = text.match(MONTH_YEAR_RE);
    if (!match) return null;

    const month = MONTH_NAMES_ES[normalizeText(match[3])];
    if (!month) return null;

    return { month, year: Number(match[4]) };

}

function buildIsoDate(monthYear, dayNumber) {

    if (!monthYear) return null;

    const { month, year } = monthYear;
    const date = new Date(year, month - 1, dayNumber);

    // Descarta fechas que no existen de verdad (p. ej. día 31 en un mes
    // de 30 días) — new Date() las "adelanta" en silencio al mes
    // siguiente en vez de fallar.
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== dayNumber) {
        return null;
    }

    const mm = String(month).padStart(2, "0");
    const dd = String(dayNumber).padStart(2, "0");
    return `${year}-${mm}-${dd}`;

}

// Patrón de repeticiones ("4 x 1.000 m", "3 x 5 km") — si el título lo
// tiene, no se extrae distanceKm aunque contenga "km": no es una
// distancia total limpia, es un volumen de series.
const REPETITION_RE = /\d+\s*x\s*\d/i;
const DISTANCE_RE = /(\d+(?:[.,]\d+)?)\s*km\b/i;

function extractDistanceKm(titleText) {

    if (REPETITION_RE.test(titleText)) return null;

    const match = titleText.match(DISTANCE_RE);
    if (!match) return null;

    return Number(match[1].replace(",", "."));

}

// Agrupa las líneas del cuerpo de una sesión bajo sus 4 etiquetas
// conocidas (en el orden fijo Objetivo/Estructura/Intensidad/Clave, no en
// el orden en que aparezcan, por si la extracción de una tabla de 2
// columnas las intercalase de forma distinta al orden visual). Devuelve
// también el texto que quedó detrás del corte de cierre de sección
// (`trailingText`), si `detectTrailingHeading` está activo y se detectó.
function parseSessionBody(bodyLines, detectTrailingHeading) {

    const sectionLines = { objetivo: [], estructura: [], intensidad: [], clave: [] };
    const trailingLines = [];

    let currentLabel = null;
    let stopped = false;

    bodyLines.forEach(line => {

        if (stopped) {
            trailingLines.push(line);
            return;
        }

        if (isKnownLabelLine(line)) {
            currentLabel = normalizeText(line);
            return;
        }

        if (detectTrailingHeading && currentLabel && HEADING_LIKE_RE.test(line)) {
            stopped = true;
            trailingLines.push(line);
            return;
        }

        if (currentLabel) {
            sectionLines[currentLabel].push(line);
        }

    });

    const description = KNOWN_LABELS
        .map(label => {
            const text = sectionLines[label].join(" ").trim();
            return text ? `${label[0].toUpperCase()}${label.slice(1)}: ${text}` : null;
        })
        .filter(Boolean)
        .join("\n") || null;

    return { description, trailingText: trailingLines.join(" ").trim() };

}

function buildFieldMeta({ dateConfidence, distanceConfidence }) {

    return {
        date: { confidence: dateConfidence, corrected: false },
        type: { confidence: null, corrected: false },
        title: { confidence: 1, corrected: false },
        distanceKm: { confidence: distanceConfidence, corrected: false },
        durationSec: { confidence: null, corrected: false },
        targetPaceSecPerKm: { confidence: null, corrected: false },
        targetHrZone: { confidence: null, corrected: false },
        description: { confidence: 1, corrected: false }
    };

}

export function parsePlanFromPdfText(text) {

    const rawLines = text.split(/\r\n|\n/);
    const lines = rawLines.map(l => l.trim()).filter(l => l !== "");

    if (lines.length === 0) {
        throw new Error("El PDF no contiene texto legible.");
    }

    // El título a veces se parte en dos líneas por el ancho de página,
    // dejando el año solo en la línea siguiente ("...AGOSTO" / "2026") —
    // se reconoce por ser una línea de exactamente 4 dígitos justo detrás
    // del título, no por adivinar dónde "debería" terminar el título.
    let titleLineCount = 1;
    if (lines.length > 1 && /^\d{4}$/.test(lines[1])) {
        titleLineCount = 2;
    }

    const planName = lines.slice(0, titleLineCount).join(" ");

    const headers = [];
    lines.forEach((line, index) => {
        const parsed = isDayHeaderLine(line);
        if (parsed) headers.push({ ...parsed, lineIndex: index });
    });

    if (headers.length === 0) {
        throw new Error("No se han reconocido sesiones en este PDF — puede que el formato no coincida con lo esperado.");
    }

    // Mes/año se buscan en el TEXTO COMPLETO sin dividir en líneas: en el
    // documento real el año queda en la línea siguiente al mes ("AGOSTO"
    // / "2026"), y \s ya incluye el salto de línea entre ambos.
    const monthYear = extractMonthYear(text);

    const planWarnings = [];

    const preHeaderText = lines.slice(titleLineCount, headers[0].lineIndex).join(" ").trim();
    if (preHeaderText) {
        planWarnings.push(`Contexto general del documento, no asignado a ninguna sesión: "${preHeaderText}"`);
    }

    if (!monthYear) {
        planWarnings.push("No se pudo determinar el mes y el año del plan a partir del título — revisa la fecha de cada sesión.");
    }

    const sessions = headers.map((header, index) => {

        const isLast = index === headers.length - 1;
        const bodyStart = header.lineIndex + 1;
        const bodyEnd = isLast ? lines.length : headers[index + 1].lineIndex;
        const bodyLines = lines.slice(bodyStart, bodyEnd);

        const { description, trailingText } = parseSessionBody(bodyLines, isLast);

        if (isLast && trailingText) {
            planWarnings.push(`Contenido adicional al final del documento, no asignado a ninguna sesión: "${trailingText}"`);
        }

        const date = buildIsoDate(monthYear, header.dayNumber);
        const distanceKm = extractDistanceKm(header.titleText);

        const session = {
            date,
            type: null,
            title: header.titleText,
            distanceKm,
            durationSec: null,
            targetPaceSecPerKm: null,
            targetHrZone: null,
            description
        };

        const importWarnings = [];
        if (!date) {
            importWarnings.push("No se pudo determinar la fecha completa de esta sesión — indícala tú abajo.");
        }

        return {
            ...session,
            fieldMeta: buildFieldMeta({
                dateConfidence: date != null ? 0.7 : null,
                distanceConfidence: distanceKm != null ? 0.85 : null
            }),
            importWarnings
        };

    });

    return { planName, sessions, planWarnings };

}
