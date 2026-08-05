// tesseract.js exporta con un spread al final de module.exports, así que
// "recognize" no se puede importar como named export de forma fiable — se
// coge del export por defecto en tiempo de ejecución.
import Tesseract from "tesseract.js";
import { parse as parseGarminText, merge as mergeGarminResults } from "./garmin-parser.js";

const { recognize: tesseractRecognize } = Tesseract;

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
    return tesseractRecognize(image, "spa+eng", {
        logger: m => { if (typeof m.progress === "number") onProgress(m.progress, m.status); }
    });
}

// Reintento: si la primera pasada (gris) sale con poca confianza o poco
// texto, se prueba una segunda pasada en binario y se queda con la mejor.
async function readOne(file, index, total, onProgress) {
    const report = onProgress || (() => {});

    const base = await canvasFromFile(file), gray = enhance(base, "gray");
    let first = await recognizeText(gray, (p, s) => report(index, total, p * .7, s || "OCR"));
    let best = first;

    const text1 = first?.data?.text?.trim() || "", conf1 = first?.data?.confidence || 0;
    if (conf1 < 58 || text1.length < 90) {
        const binary = enhance(base, "binary");
        const second = await recognizeText(binary, (p, s) => report(index, total, .7 + p * .3, s || "segunda lectura"));
        const text2 = second?.data?.text?.trim() || "", conf2 = second?.data?.confidence || 0;
        if (conf2 > conf1 || text2.length > text1.length * 1.25) best = second;
    }

    const text = best?.data?.text?.trim() || "";
    return {
        file: file.name,
        ocr_confidence: Math.round(best?.data?.confidence || 0),
        text,
        parsed: parseGarminText(text)
    };
}

// Entrada real del motor: recibe uno o varios File (capturas del mismo
// entrenamiento) y devuelve el resultado fusionado + el detalle por captura.
// onProgress(fileIndex, totalFiles, fraction0a1, status) es opcional.
export async function parseGarminScreenshots(files, onProgress) {

    const captures = [];

    for (let i = 0; i < files.length; i++) {
        captures.push(await readOne(files[i], i, files.length, onProgress));
    }

    const merged = mergeGarminResults(captures.map(c => c.parsed));

    return { merged, captures };

}
