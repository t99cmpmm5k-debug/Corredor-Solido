// Cliente de POST/GET /api/extract-document (server/src/routes/extract.js):
// extracción de la estructura de un PDF con IA, compartida por los
// importadores (dieta hoy; el plan de entrenamiento después). El servidor
// trabaja en segundo plano -- aquí se arranca el trabajo y se consulta
// hasta que termina.
import { getToken } from "./authStore.js";

const API_BASE_URL = "https://api.corredorsolido.es";
const REQUEST_TIMEOUT_MS = 30000;
const POLL_INTERVAL_MS = 3000;
// Una extracción normal tarda de segundos a un par de minutos; pasado
// esto se da por perdida y se ofrece reintentar.
const MAX_WAIT_MS = 6 * 60 * 1000;

const MAX_PDF_BYTES = 6 * 1024 * 1024;

// Error con lo que necesita la pantalla: mensaje para el usuario y si
// tiene sentido ofrecer "Reintentar".
export class ExtractError extends Error {

    constructor(message, { retryable = true, code = null } = {}) {
        super(message);
        this.retryable = retryable;
        this.code = code;
    }

}

async function request(method, path, body) {

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let res;

    try {

        res = await fetch(`${API_BASE_URL}${path}`, {
            method,
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal
        });

    } catch {

        throw new ExtractError("No se pudo conectar con el servidor. Comprueba tu conexión y reintenta.", { code: "OFFLINE" });

    } finally {

        clearTimeout(timeout);

    }

    if (res.status === 401) {
        throw new ExtractError("Tu sesión ha caducado. Vuelve a iniciar sesión.", { retryable: false, code: "UNAUTHORIZED" });
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new ExtractError(data.error || "El servidor no ha podido procesar el documento.", { retryable: data.retryable ?? res.status >= 500 });
    }

    return data;

}

// Solo mira la cabecera real del archivo ("%PDF"), no la extensión ni el
// tipo MIME -- en iOS el selector no lleva "accept" (ver
// project_ios_file_input_no_accept) y el tipo que reporta no es fiable.
export async function readPdfAsBase64(file) {

    if (file.size > MAX_PDF_BYTES) {
        throw new ExtractError("El PDF es demasiado grande (máximo 6 MB).", { retryable: false });
    }

    const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    if (String.fromCharCode(...head) !== "%PDF") {
        throw new ExtractError("El archivo elegido no es un PDF.", { retryable: false });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }

    return btoa(binary);

}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// PDF -> { documentMatchesType, data, uncertain } del tipo pedido. Lanza
// ExtractError con un mensaje claro si algo falla; nunca devuelve un
// resultado a medias. onStatus("uploading" | "processing") para la UI.
export async function extractPdf(type, file, { onStatus = () => {}, now = Date.now } = {}) {

    const pdfBase64 = await readPdfAsBase64(file);

    onStatus("uploading");
    const { jobId } = await request("POST", "/api/extract-document", { type, pdfBase64 });

    onStatus("processing");
    const startedAt = now();

    while (now() - startedAt < MAX_WAIT_MS) {

        await wait(POLL_INTERVAL_MS);

        let job;
        try {
            job = await request("GET", `/api/extract-document/${encodeURIComponent(jobId)}`);
        } catch (err) {
            // Un corte de red mientras se espera (el móvil cambió de red,
            // pantalla bloqueada) no pierde el trabajo: sigue en el
            // servidor, se vuelve a preguntar.
            if (err.code === "OFFLINE") continue;
            throw err;
        }

        if (job.status === "done") return job.result;
        if (job.status === "error") throw new ExtractError(job.error, { retryable: job.retryable });

    }

    throw new ExtractError("La IA está tardando demasiado en leer el documento. Reintenta.");

}
