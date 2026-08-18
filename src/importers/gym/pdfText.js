// Duplica el setup de pdfjs-dist de ../plan/pdfText.js a propósito — el
// contrato de retorno es distinto (filas agrupadas por posición, no texto
// plano), así que no es un simple alias intercambiable. Ver comentarios de
// esa copia para el motivo de la build "legacy" y de streamTextContent().
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url
).href;

const MIN_ROWS = 1;

// Tolerancia en unidades de PDF (puntos) para considerar que dos ítems
// están en la MISMA fila visual — las filas reales de esta rutina viven a
// exactamente la misma Y, pero un margen pequeño absorbe redondeos de
// otros generadores de PDF sin fundir dos filas distintas entre sí (las
// filas de la tabla están separadas por ~18pt como mínimo).
const ROW_Y_TOLERANCE = 2;

async function readPageItems(page) {

    const reader = page.streamTextContent({}).getReader();
    const items = [];

    for (;;) {

        const { value, done } = await reader.read();
        if (done) break;

        items.push(...value.items);

    }

    return items;

}

// Agrupa los ítems de una página por coordenada Y (fila) y los ordena por
// X dentro de cada fila — a diferencia de extractPdfText() (texto plano,
// pierde la posición), esto resuelve sin ambigüedad dónde empieza y
// termina cada fila de una tabla, incluso cuando dos columnas de una fila
// concreta llegan fundidas en un único ítem de texto (ver pdf.js: el
// conteo de tokens por fila, no un heurístico de líneas encadenadas,
// decide dónde acaba cada fila).
function groupRowsByY(items) {

    const rows = new Map();

    items.forEach(item => {

        const text = item.str.trim();
        if (!text) return;

        const y = item.transform[5];
        const x = item.transform[4];

        const key = [...rows.keys()].find(existing => Math.abs(existing - y) <= ROW_Y_TOLERANCE);
        const rowKey = key ?? y;

        if (!rows.has(rowKey)) rows.set(rowKey, []);
        rows.get(rowKey).push({ x, text });

    });

    return [...rows.entries()]
        .sort((a, b) => b[0] - a[0]) // Y de PDF crece hacia arriba: de mayor a menor = orden de lectura.
        .map(([, tokens]) => tokens.sort((a, b) => a.x - b.x).map(t => t.text));

}

// Solo extrae de la capa de texto real del PDF, igual que extractPdfText()
// — sin OCR, un PDF escaneado no produce filas útiles aquí.
export async function extractPdfRows(file) {

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const rows = [];

    for (let i = 1; i <= pdf.numPages; i++) {

        const page = await pdf.getPage(i);
        const items = await readPageItems(page);

        rows.push(...groupRowsByY(items));

    }

    if (rows.length < MIN_ROWS) {
        throw new Error("Este PDF no tiene texto legible — puede ser una imagen escaneada, todavía no soportado.");
    }

    return rows;

}
