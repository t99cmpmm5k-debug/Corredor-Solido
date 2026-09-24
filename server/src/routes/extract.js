import { Router } from "express";
import { randomUUID } from "node:crypto";
import { requireAuth } from "../middleware/requireAuth.js";
import { DOCUMENT_TYPES } from "../extraction/documentTypes.js";
import { extractDocument, classifyError } from "../extraction/claudeExtractor.js";

export const extractRouter = Router();

// Extracción de estructura de un PDF con IA (dieta, y en el futuro el plan
// de entrenamiento), compartida por los importadores del frontend.
//
// Asíncrono a propósito: leer un PDF con Claude puede tardar más de un
// minuto, más que el timeout de proxy de nginx y más de lo que aguanta un
// fetch en el iPhone si se bloquea la pantalla o se cambia de app. POST
// arranca el trabajo y devuelve su id al momento; GET /:id se consulta
// hasta que termina. El trabajo sigue en el servidor aunque el móvil se
// desconecte.
//
// En memoria, un solo proceso (pm2-runtime) -- igual que rateLimit.js. Un
// reinicio pierde los trabajos en curso: el GET responde 404 y el
// frontend ofrece reintentar. El PDF no se guarda en ningún sitio: solo
// vive en la petición a Claude.

// base64 de ~8 MB (PDF de 6 MB): cabe en el límite de 10 MB de
// express.json() de index.js. Una dieta o un plan ocupa mucho menos.
const MAX_PDF_BYTES = 6 * 1024 * 1024;

const JOB_TTL_MS = 30 * 60 * 1000;

// Cada extracción cuesta dinero real en la API de Claude -- límite por
// usuario, no por IP.
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX = 10;
const MAX_PENDING_PER_USER = 2;

const jobs = new Map();
const userHits = new Map();

function pruneJobs(now = Date.now()) {

    for (const [id, job] of jobs) {
        if (now - job.createdAt > JOB_TTL_MS) jobs.delete(id);
    }

}

// "%PDF" al principio del archivo, en base64 empieza por "JVBER".
function looksLikePdf(base64) {

    return typeof base64 === "string" && base64.startsWith("JVBER");

}

export function handleStartExtraction(req, res) {

    pruneJobs();

    const { type, pdfBase64 } = req.body ?? {};

    if (!Object.hasOwn(DOCUMENT_TYPES, type)) {
        return res.status(400).json({ error: "Tipo de documento no soportado.", retryable: false });
    }

    if (!looksLikePdf(pdfBase64)) {
        return res.status(400).json({ error: "El archivo no es un PDF.", retryable: false });
    }

    if (Math.floor(pdfBase64.length * 3 / 4) > MAX_PDF_BYTES) {
        return res.status(413).json({ error: "El PDF es demasiado grande (máximo 6 MB).", retryable: false });
    }

    const now = Date.now();
    const recent = (userHits.get(req.userId) || []).filter(t => now - t < RATE_WINDOW_MS);

    if (recent.length >= RATE_MAX) {
        return res.status(429).json({ error: "Has hecho muchas importaciones en la última hora. Prueba más tarde.", retryable: true });
    }

    const pending = [...jobs.values()].filter(job => job.userId === req.userId && job.status === "pending").length;
    if (pending >= MAX_PENDING_PER_USER) {
        return res.status(429).json({ error: "Ya hay una importación en curso. Espera a que termine.", retryable: true });
    }

    recent.push(now);
    userHits.set(req.userId, recent);

    const id = randomUUID();
    const job = { id, userId: req.userId, type, status: "pending", createdAt: now, result: null, error: null };
    jobs.set(id, job);

    extractDocument(type, pdfBase64)
        .then(result => {
            job.status = "done";
            job.result = result;
        })
        .catch(err => {
            const e = classifyError(err);
            job.status = "error";
            job.error = { message: e.message, retryable: e.retryable };
        });

    res.status(202).json({ jobId: id });

}

export function handleGetExtraction(req, res) {

    pruneJobs();

    const job = jobs.get(req.params.id);

    // El trabajo de otro usuario se trata igual que uno inexistente.
    if (!job || job.userId !== req.userId) {
        return res.status(404).json({ error: "La importación ya no está disponible (caducó o se reinició el servidor). Vuelve a intentarlo.", retryable: true });
    }

    if (job.status === "pending") return res.json({ status: "pending" });

    if (job.status === "error") return res.json({ status: "error", error: job.error.message, retryable: job.error.retryable });

    res.json({ status: "done", type: job.type, result: job.result });

}

extractRouter.post("/", requireAuth, handleStartExtraction);
extractRouter.get("/:id", requireAuth, handleGetExtraction);
