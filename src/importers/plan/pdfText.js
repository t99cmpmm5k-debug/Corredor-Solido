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

// page.getTextContent() de pdfjs-dist usa internamente
// "for await (const value of readableStream)" — depende de que
// ReadableStream sea iterable de forma asíncrona (Symbol.asyncIterator),
// una característica de la API de Streams del navegador (no del lenguaje
// JS, así que el polyfill de Promise.withResolvers de la build legacy no
// la cubre) con soporte históricamente tardío y parcheado en Safari.
// Verificado leyendo el propio código fuente instalado
// (node_modules/pdfjs-dist/legacy/build/pdf.mjs) tras un stack trace real
// de un iPhone que señalaba exactamente a getTextContent. Se evita del
// todo llamando a streamTextContent() (mismo dato, expone el
// ReadableStream en crudo) y leyéndolo a mano con .getReader()/.read(),
// la forma universal de consumir un stream — no depende del iterador
// asíncrono.
async function readPageText(page) {

    const reader = page.streamTextContent({}).getReader();
    const items = [];

    for (;;) {

        const { value, done } = await reader.read();
        if (done) break;

        items.push(...value.items);

    }

    return items;

}

// TEMPORAL — mientras se diagnostica el bug real de iPhone (Safari da
// "undefined is not a function" sin stack trace útil y no hay Mac a mano
// para el inspector remoto). Envuelve el error original con la etapa
// exacta en la que ha saltado, en vez de dejar que solo llegue el mensaje
// genérico de Safari (que no dice si fue leer el archivo, iniciar
// pdfjs-dist o procesar una página). Quitar en cuanto quede resuelto.
function describeError(stage, err) {

    const name = err?.name || typeof err;
    const message = err?.message || String(err);
    const stack = err?.stack ? ` | stack: ${String(err.stack).slice(0, 300)}` : "";

    return new Error(`[${stage}] ${name}: ${message}${stack}`);

}

// Solo extrae texto de la capa de texto real del PDF (PDF "nativo
// digital") — no hace OCR ni renderiza páginas como imagen, así que un
// PDF escaneado/fotografiado no producirá texto útil aquí.
export async function extractPdfText(file) {

    let arrayBuffer;
    try {
        arrayBuffer = await file.arrayBuffer();
    } catch (err) {
        throw describeError("leer archivo", err);
    }

    let pdf;
    try {
        pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    } catch (err) {
        throw describeError("getDocument", err);
    }

    const pageTexts = [];

    for (let i = 1; i <= pdf.numPages; i++) {

        let items;
        try {
            const page = await pdf.getPage(i);
            items = await readPageText(page);
        } catch (err) {
            throw describeError(`página ${i}`, err);
        }

        pageTexts.push(items.map(item => item.str).join("\n"));

    }

    const text = pageTexts.join("\n\n");

    if (text.trim().length < MIN_TEXT_LENGTH) {
        throw new Error("Este PDF no tiene texto legible — puede ser una imagen escaneada, todavía no soportado.");
    }

    return text;

}
