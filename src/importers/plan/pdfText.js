// Build "legacy", no la normal ("pdfjs-dist" a secas → build/pdf.mjs) a
// propósito: esa build asume soporte nativo de funciones JS muy recientes
// (p. ej. Promise.withResolvers, que Safari no tiene hasta iOS 17.4) y
// revienta en iPhones con una versión de Safari algo más vieja con un
// "undefined is not a function" al llamar getDocument() — error real
// confirmado en un iPhone, reproducido también en el propio issue tracker
// de pdf.js (mozilla/pdf.js#20479) en iOS 16.7.12. La build legacy trae
// los polyfills necesarios para ese caso.
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

// Patrón estándar de Vite: new URL(..., import.meta.url) hace que Vite
// reconozca el worker como asset y lo empaquete aparte, con su propia URL
// final — sin esto pdf.js no puede procesar el PDF (necesita su worker
// para no bloquear el hilo principal). Mismo motivo que arriba: worker de
// la build legacy, no el de la normal.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url
).href;

const MIN_TEXT_LENGTH = 20;

// Solo extrae texto de la capa de texto real del PDF (PDF "nativo
// digital") — no hace OCR ni renderiza páginas como imagen, así que un
// PDF escaneado/fotografiado no producirá texto útil aquí.
export async function extractPdfText(file) {

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const pageTexts = [];

    for (let i = 1; i <= pdf.numPages; i++) {

        const page = await pdf.getPage(i);
        const content = await page.getTextContent();

        pageTexts.push(content.items.map(item => item.str).join("\n"));

    }

    const text = pageTexts.join("\n\n");

    if (text.trim().length < MIN_TEXT_LENGTH) {
        throw new Error("Este PDF no tiene texto legible — puede ser una imagen escaneada, todavía no soportado.");
    }

    return text;

}
