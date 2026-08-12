import { normalizeText } from "./text.js";

const WEEKDAYS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

// Cabecera de sesión — dos formas confirmadas contra dos PDFs reales de
// distinta generación del mismo generador (ChatGPT), probadas en este
// orden (la ambigua es más específica, debe intentarse primero):
// "Sábado 15 o domingo 16 de agosto - Tirada larga - 13 km" (dos días
// posibles reales, no un error de formato) y "Jueves 6 de agosto -
// Rodaje fácil de recuperación - 7 km" / "Martes 11 - 8 km en Zona 2"
// (con o sin mes dentro de la propia cabecera).
const AMBIGUOUS_HEADER_RE = /^([A-Za-zÁÉÍÓÚáéíóú]+)\s+(\d{1,2})\s+o\s+([A-Za-zÁÉÍÓÚáéíóú]+)\s+(\d{1,2})\s+de\s+([A-Za-zÁÉÍÓÚáéíóú]+)\s*-\s*(.+)$/i;
const SIMPLE_HEADER_RE = /^([A-Za-zÁÉÍÓÚáéíóú]+)\s+(\d{1,2})(?:\s+de\s+([A-Za-zÁÉÍÓÚáéíóú]+))?\s*-\s*(.+)$/i;

// El número de sesión ("1", "2"...), cuando aparece, vive en su propia
// línea justo antes de la cabecera — no pegado a la fecha en la misma
// línea (confirmado contra el segundo PDF real).
const SESSION_NUMBER_RE = /^\d{1,2}$/;

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

// Heurística de cierre de sección (p. ej. "REGLAS DE AJUSTE",
// "ORGANIZACIÓN CON EL GIMNASIO", "TIRADA LARGA SIGUIENTE") — la única
// del parser que es una suposición, no una lectura literal. Se aplica a
// TODAS las sesiones (no solo la última: confirmado contra un segundo
// PDF real que un heading de este tipo puede aparecer también ENTRE dos
// sesiones, no solo al final del documento) — con dos PDFs reales de
// evidencia y cero casos donde una sesión legítima tuviera una frase
// corta en mayúsculas dentro de su propio texto, el riesgo de recortar
// contenido real de una sesión intermedia por error se acepta.
const HEADING_LIKE_RE = /^[A-ZÁÉÍÓÚÑ\s]{4,40}$/;

function isKnownLabelLine(line) {
    return KNOWN_LABELS.includes(normalizeText(line));
}

// Devuelve null si la línea no es una cabecera real. Si lo es:
// - Ambigua: { titleText, ambiguous:true, ambiguousText }
// - Simple: { titleText, ambiguous:false, dayNumber, monthName }
//   (monthName es null si la cabecera no trae mes propio)
function isDayHeaderLine(line) {

    const ambiguous = line.match(AMBIGUOUS_HEADER_RE);
    if (ambiguous) {

        const weekday1 = normalizeText(ambiguous[1]);
        const weekday2 = normalizeText(ambiguous[3]);

        if (WEEKDAYS.includes(weekday1) && WEEKDAYS.includes(weekday2)) {
            return {
                titleText: ambiguous[6].trim(),
                ambiguous: true,
                ambiguousText: `${ambiguous[1]} ${ambiguous[2]} o ${ambiguous[3]} ${ambiguous[4]} de ${ambiguous[5]}`
            };
        }

    }

    const simple = line.match(SIMPLE_HEADER_RE);
    if (simple) {

        const weekday = normalizeText(simple[1]);
        if (!WEEKDAYS.includes(weekday)) return null;

        return {
            titleText: simple[4].trim(),
            ambiguous: false,
            dayNumber: Number(simple[2]),
            monthName: simple[3] || null
        };

    }

    return null;

}

function extractMonthYear(text) {

    const match = text.match(MONTH_YEAR_RE);
    if (!match) return null;

    const month = MONTH_NAMES_ES[normalizeText(match[3])];
    if (!month) return null;

    return { month, year: Number(match[4]) };

}

function buildIsoDate(month, year, dayNumber) {

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
// también las líneas que quedaron detrás del corte de cierre de sección
// (`trailingLines`, sin unir — el llamador decide si son una tabla de
// gimnasio reconocible o solo contenido genérico a citar en un aviso).
function parseSessionBody(bodyLines) {

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

        if (currentLabel && HEADING_LIKE_RE.test(line)) {
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

    return { description, trailingLines };

}

// "ORGANIZACIÓN CON EL GIMNASIO" (único patrón de tabla de gimnasio
// confirmado hasta ahora) trae pares {día de la semana} → {recomendación},
// con las cabeceras de columna propias de la tabla ("Día", "Trabajo
// recomendado") intercaladas — se ignoran sin más porque no son un día
// de la semana real ni pertenecen a una fila ya abierta. Mismo patrón de
// acumular-hasta-el-siguiente-marcador que parseSessionBody(), para no
// perder una descripción que se reparta en más de una línea.
function parseGymTable(lines) {

    const rows = [];
    const leftoverLines = [];

    let currentWeekday = null;
    let currentLines = [];
    let stopped = false;

    function flush() {
        if (currentWeekday) {
            const description = currentLines.join(" ").trim();
            if (description) rows.push({ weekday: currentWeekday, description });
        }
        currentLines = [];
    }

    lines.forEach(line => {

        if (stopped) {
            leftoverLines.push(line);
            return;
        }

        if (HEADING_LIKE_RE.test(line)) {
            flush();
            stopped = true;
            leftoverLines.push(line);
            return;
        }

        const normalized = normalizeText(line);

        if (WEEKDAYS.includes(normalized)) {
            flush();
            currentWeekday = normalized;
            return;
        }

        if (currentWeekday) {
            currentLines.push(line);
        }

    });

    flush();

    return { rows, leftoverLines };

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

    // Si la línea justo antes de una cabecera es un número suelto (el
    // número de sesión, en su propia línea), no pertenece al cuerpo de
    // la sesión ANTERIOR — precedingBoundary excluye esa línea al
    // calcular dónde termina esa sesión previa.
    const headers = [];
    lines.forEach((line, index) => {

        const parsed = isDayHeaderLine(line);
        if (!parsed) return;

        const hasNumberPrefix = index > 0 && SESSION_NUMBER_RE.test(lines[index - 1]);

        headers.push({
            ...parsed,
            lineIndex: index,
            precedingBoundary: hasNumberPrefix ? index - 1 : index
        });

    });

    if (headers.length === 0) {
        throw new Error("No se han reconocido sesiones en este PDF — puede que el formato no coincida con lo esperado.");
    }

    // Mes/año a nivel de documento se buscan en el TEXTO COMPLETO sin
    // dividir en líneas (el año a veces queda en la línea siguiente al
    // mes, y \s ya incluye el salto de línea entre ambos) — sigue siendo
    // el único sitio de donde puede salir el AÑO: ninguno de los PDFs
    // reales vistos hasta ahora lo trae dentro de una cabecera de sesión.
    const documentMonthYear = extractMonthYear(text);

    const planWarnings = [];

    const preHeaderText = lines.slice(titleLineCount, headers[0].precedingBoundary).join(" ").trim();
    if (preHeaderText) {
        planWarnings.push(`Contexto general del documento, no asignado a ninguna sesión: "${preHeaderText}"`);
    }

    // Dos motivos de "sin fecha" bien distintos, con avisos de plan
    // separados — no basta con "falta alguna fecha": una sesión ambigua
    // (ya tiene su propio aviso por sesión) no debe disparar el aviso de
    // "falta el año" si el año sí se conocía.
    let anyMissingDueToYear = false;
    let anyDateUnresolvable = false;

    const sessions = [];

    headers.forEach((header, index) => {

        const isLast = index === headers.length - 1;
        const bodyStart = header.lineIndex + 1;
        const bodyEnd = isLast ? lines.length : headers[index + 1].precedingBoundary;
        const bodyLines = lines.slice(bodyStart, bodyEnd);

        const { description, trailingLines } = parseSessionBody(bodyLines);

        const distanceKm = extractDistanceKm(header.titleText);
        const importWarnings = [];

        let date = null;
        let dateConfidence = null;

        if (header.ambiguous) {

            importWarnings.push(`Fecha ambigua: "${header.ambiguousText}" — hay más de un día posible, indícala tú abajo.`);

        } else {

            const month = header.monthName
                ? MONTH_NAMES_ES[normalizeText(header.monthName)] ?? null
                : documentMonthYear?.month ?? null;

            const year = documentMonthYear?.year ?? null;

            if (month != null && year != null) {
                date = buildIsoDate(month, year, header.dayNumber);
            }

            if (!date) {

                if (month != null && year == null) {
                    anyMissingDueToYear = true;
                } else {
                    anyDateUnresolvable = true;
                }

                importWarnings.push("No se pudo determinar la fecha completa de esta sesión — indícala tú abajo.");

            } else {
                dateConfidence = 0.7;
            }

        }

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

        sessions.push({
            ...session,
            fieldMeta: buildFieldMeta({
                dateConfidence,
                distanceConfidence: distanceKm != null ? 0.85 : null
            }),
            importWarnings
        });

        // Se procesa DESPUÉS de empujar la sesión propia de esta cabecera,
        // no antes — el texto sobrante viene textualmente después de ella
        // en el documento (p. ej. la tabla de gimnasio aparece tras la
        // última sesión numerada), así que el orden del array de salida
        // coincide con el orden de lectura real.
        if (trailingLines.length > 0) {

            // Único patrón de "sección adicional" con estructura propia
            // reconocida hasta ahora — el resto de headings (REGLAS DE
            // AJUSTE, TIRADA LARGA SIGUIENTE...) siguen siendo solo texto
            // a citar en un aviso, no datos a importar.
            const isGymTable = HEADING_LIKE_RE.test(trailingLines[0]) && normalizeText(trailingLines[0]).includes("gimnasio");

            if (isGymTable) {

                const { rows, leftoverLines } = parseGymTable(trailingLines.slice(1));

                rows.forEach(row => {

                    sessions.push({
                        date: null,
                        weekday: row.weekday,
                        type: "strength",
                        title: null,
                        distanceKm: null,
                        durationSec: null,
                        targetPaceSecPerKm: null,
                        targetHrZone: null,
                        description: row.description,
                        fieldMeta: buildFieldMeta({ dateConfidence: null, distanceConfidence: null }),
                        importWarnings: [`Sesión semanal recurrente ("${row.weekday}") — no tiene una fecha concreta en el documento, se repite cada semana.`]
                    });

                });

                const leftoverText = leftoverLines.join(" ").trim();
                if (leftoverText) {
                    planWarnings.push(`Contenido adicional no asignado a ninguna sesión: "${leftoverText}"`);
                }

            } else {

                const trailingText = trailingLines.join(" ").trim();
                if (trailingText) {
                    planWarnings.push(`Contenido adicional no asignado a ninguna sesión: "${trailingText}"`);
                }

            }

        }

    });

    if (anyMissingDueToYear) {
        planWarnings.push("Se reconoce el día y el mes de cada sesión, pero no se ha encontrado el año en ningún sitio del documento — revisa las fechas.");
    }

    if (anyDateUnresolvable) {
        planWarnings.push("No se pudo determinar el mes y el año del plan a partir del título — revisa la fecha de cada sesión.");
    }

    return { planName, sessions, planWarnings };

}
