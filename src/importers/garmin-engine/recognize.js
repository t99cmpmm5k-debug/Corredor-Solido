// tesseract.js exporta con un spread al final de module.exports, así que
// no se puede fiar un named export de forma fiable — se coge del export
// por defecto en tiempo de ejecución.
import Tesseract from "tesseract.js";
import { parse as parseGarminText, merge as mergeGarminResults } from "./garmin-parser.js";

const { createWorker, OEM } = Tesseract;

// Un solo worker de Tesseract para toda la vida de la página, no uno por
// pasada. Arrancarlo (núcleo WASM + modelo de idioma, aunque esté en
// caché) es caro — antes se repetía hasta 2 veces por captura.
let workerPromise = null;
let currentProgressHandler = () => {};

function getWorker() {

    if (!workerPromise) {

        workerPromise = createWorker("spa+eng", OEM.LSTM_ONLY, {
            logger: m => {
                if (typeof m.progress === "number") currentProgressHandler(m.progress, m.status);
            }
        }).catch(err => {
            workerPromise = null; // permite reintentar si el arranque falla
            throw err;
        });

    }

    return workerPromise;

}

// Arranca el worker sin esperar a que haya nada que reconocer todavía —
// pensado para llamarlo al entrar en la pantalla Running, así los ~6s de
// arranque pasan mientras el usuario mira la lista, no al pulsar Importar.
// getWorker() ya memoiza, así que llamarlo aquí y luego otra vez desde
// parseGarminScreenshots() no arranca un segundo worker.
export function warmUpWorker() {
    getWorker().catch(() => {});
}

function canvasFromFile(file) {
    return new Promise((resolve, reject) => {
        const img = new Image(), url = URL.createObjectURL(file);
        img.onload = () => {
            const maxWidth = 1800, scale = Math.min(2, maxWidth / img.width);
            const c = document.createElement("canvas");
            c.width = Math.max(1, Math.round(img.width * scale));
            c.height = Math.max(1, Math.round(img.height * scale));
            const ctx = c.getContext("2d", { willReadFrequently: true });
            ctx.drawImage(img, 0, 0, c.width, c.height);
            URL.revokeObjectURL(url);
            resolve(c);
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`No se pudo abrir ${file.name}`)); };
        img.src = url;
    });
}

function enhance(source, mode = "gray") {
    const c = document.createElement("canvas");
    c.width = source.width;
    c.height = source.height;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(source, 0, 0);
    const im = ctx.getImageData(0, 0, c.width, c.height), d = im.data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) sum += (d[i] + d[i + 1] + d[i + 2]) / 3;
    const avg = sum / (d.length / 4), invert = avg < 110;
    for (let i = 0; i < d.length; i += 4) {
        let g = .299 * d[i] + .587 * d[i + 1] + .114 * d[i + 2];
        if (invert) g = 255 - g;
        g = (g - 128) * 1.55 + 128;
        g = Math.max(0, Math.min(255, g));
        if (mode === "binary") g = g > 155 ? 255 : 0;
        d[i] = d[i + 1] = d[i + 2] = g;
    }
    ctx.putImageData(im, 0, 0);
    return c;
}

async function recognizeText(image, onProgress) {
    const worker = await getWorker();
    currentProgressHandler = onProgress || (() => {});
    return worker.recognize(image);
}

// TEMPORAL - TIMING, QUITAR CUANDO SE OPTIMICE
function logTiming(onTiming, label, ms) {
    const line = `${label}: ${ms.toFixed(0)}ms`;
    console.log(`[OCR TIMING] ${line}`);
    onTiming?.(line);
}

// La confianza cruda de Tesseract puede salir baja por ruido que no nos
// importa (mapa de fondo, iconos...) sin afectar a los campos que de
// verdad usamos. Se mira si YA están los campos clave de esa pantalla
// en vez de la confianza global — evita una segunda pasada (~5-6s) que
// no iba a cambiar nada útil.
function hasEnoughFields(parsed) {

    if (parsed.screen.type === "summary") {
        // calories_kcal se cuela aquí a propósito: es el campo que la
        // fusión trata como exclusivo de Resumen (fusion.js no deja que
        // Estadísticas lo pise salvo que Resumen no leyera nada), así que
        // si sale mal en la primera pasada no hay ninguna otra pantalla
        // que lo corrija después — merece su propia segunda oportunidad
        // en vez de darse por bueno solo con título y fecha.
        return parsed.data.title != null && parsed.data.date != null && parsed.data.calories_kcal != null;
    }

    if (parsed.screen.type === "statistics") {
        return parsed.data.distance_km != null && parsed.data.total_time != null;
    }

    if (parsed.screen.type === "splits" || parsed.screen.type === "intervals") {
        return (parsed.extras?.laps?.length || 0) > 0;
    }

    if (parsed.screen.type === "intervals-road") {
        return (parsed.extras?.blocks?.length || 0) > 0;
    }

    // Pantalla sin identificar todavía — la segunda pasada es la única
    // oportunidad real de reconocerla, no se descarta el reintento.
    return false;

}

async function readOne(file, index, total, onProgress, onTiming) {
    const report = onProgress || (() => {});
    const fileStart = performance.now();

    let t = performance.now();
    const base = await canvasFromFile(file), gray = enhance(base, "gray");
    logTiming(onTiming, `${file.name} — preparar imagen (decodificar + gris)`, performance.now() - t);

    t = performance.now();
    let first = await recognizeText(gray, (p, s) => report(index, total, p * .7, s || "OCR"));
    logTiming(onTiming, `${file.name} — OCR pasada 1, gris`, performance.now() - t);

    let best = first;
    const text1 = first?.data?.text?.trim() || "", conf1 = first?.data?.confidence || 0;
    let bestParsed = parseGarminText(text1);

    if (!hasEnoughFields(bestParsed)) {

        t = performance.now();
        const binary = enhance(base, "binary");
        logTiming(onTiming, `${file.name} — preparar imagen (binario)`, performance.now() - t);

        t = performance.now();
        const second = await recognizeText(binary, (p, s) => report(index, total, .7 + p * .3, s || "segunda lectura"));
        logTiming(onTiming, `${file.name} — OCR pasada 2, binario`, performance.now() - t);

        const text2 = second?.data?.text?.trim() || "";
        const parsed2 = parseGarminText(text2);

        // Se queda con la que de verdad encontró más campos, no con la
        // de mayor confianza cruda o texto más largo.
        if (parsed2.found > bestParsed.found) {
            best = second;
            bestParsed = parsed2;
        }
    }

    logTiming(onTiming, `${file.name} — TOTAL (confianza pasada 1: ${Math.round(conf1)})`, performance.now() - fileStart);

    return {
        file: file.name,
        ocr_confidence: Math.round(best?.data?.confidence || 0),
        text: best?.data?.text?.trim() || "",
        parsed: bestParsed
    };
}

// Entrada real del motor: recibe uno o varios File (capturas del mismo
// entrenamiento) y devuelve el resultado fusionado + el detalle por captura.
// onProgress(fileIndex, totalFiles, fraction0a1, status) es opcional.
// onTiming(linea) es opcional — TEMPORAL mientras se mide el rendimiento.
export async function parseGarminScreenshots(files, onProgress, onTiming) {

    const overallStart = performance.now();

    // Arranque del worker medido aparte, fuera del bucle — a partir de
    // aquí todas las capturas reutilizan el mismo.
    const workerStart = performance.now();
    await getWorker();
    logTiming(onTiming, "Arranque del worker de Tesseract (una sola vez)", performance.now() - workerStart);

    const captures = [];

    for (let i = 0; i < files.length; i++) {
        captures.push(await readOne(files[i], i, files.length, onProgress, onTiming));
    }

    const merged = mergeGarminResults(captures.map(c => c.parsed));

    // TEMPORAL - TIMING, QUITAR CUANDO SE OPTIMICE
    logTiming(onTiming, `TOTAL importación — ${files.length} captura(s) en serie`, performance.now() - overallStart);

    return { merged, captures };

}
