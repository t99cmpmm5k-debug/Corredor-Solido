import Anthropic from "@anthropic-ai/sdk";
import { DOCUMENT_TYPES, COMMON_SYSTEM_PROMPT, buildOutputSchema } from "./documentTypes.js";

// Llamada real a la API de Claude para extraer la estructura de un PDF --
// el PDF va tal cual (bloque "document"), no texto extraído antes: las
// tablas y columnas de una dieta o un plan se pierden al aplanarlas a
// texto, y Claude lee el PDF con su maquetación.
const MODEL = "claude-opus-5";
const MAX_TOKENS = 16000;

// Si Claude declina la petición por sus filtros de seguridad (improbable
// con una dieta, pero posible), la API la reintenta sola en el modelo
// alternativo que Anthropic recomienda para ese caso, en la misma llamada.
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

// El SDK ya reintenta por su cuenta los 429/5xx y fallos de conexión
// (maxRetries, con espera exponencial) antes de lanzar el error.
const CLIENT_OPTIONS = { maxRetries: 2, timeout: 5 * 60 * 1000 };

let client = null;

function getClient() {

    client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, ...CLIENT_OPTIONS });
    return client;

}

// Error con lo que necesita el frontend: mensaje para el usuario, si tiene
// sentido reintentar, y el status HTTP con el que se contesta.
export class ExtractionError extends Error {

    constructor(message, { status, retryable }) {
        super(message);
        this.status = status;
        this.retryable = retryable;
    }

}

// Error del SDK -> ExtractionError. Más específico primero: todos heredan
// de APIError.
export function classifyError(err) {

    if (err instanceof ExtractionError) return err;

    if (err instanceof Anthropic.RateLimitError) {
        return new ExtractionError("El servicio de IA está saturado ahora mismo. Espera un minuto y reintenta.", { status: 503, retryable: true });
    }

    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
        console.error("extract-document: la API de Claude rechazó la clave --", err.message);
        return new ExtractionError("El servicio de IA no está configurado correctamente en el servidor.", { status: 503, retryable: false });
    }

    if (err instanceof Anthropic.BadRequestError || err instanceof Anthropic.UnprocessableEntityError) {
        console.error("extract-document: petición rechazada --", err.message);
        return new ExtractionError("La IA no ha podido abrir este PDF (¿está protegido, dañado o es demasiado largo?).", { status: 422, retryable: false });
    }

    // Incluye APIConnectionTimeoutError (subclase de APIConnectionError).
    if (err instanceof Anthropic.APIConnectionError) {
        return new ExtractionError("No se pudo contactar con el servicio de IA. Reintenta en un momento.", { status: 502, retryable: true });
    }

    if (err instanceof Anthropic.APIError) {
        console.error(`extract-document: API de Claude ${err.status} --`, err.message);
        return new ExtractionError("El servicio de IA ha fallado. Reintenta en un momento.", { status: 502, retryable: true });
    }

    console.error("extract-document: error inesperado --", err);
    return new ExtractionError("Error inesperado al procesar el documento. Reintenta.", { status: 500, retryable: true });

}

// Respuesta de la API -> { documentMatchesType, data, uncertain }. Mira
// stop_reason antes de leer el contenido: una respuesta cortada o
// rechazada no es un JSON válido que se pueda dar por bueno.
export function parseExtractionResponse(response) {

    if (response.stop_reason === "refusal") {
        throw new ExtractionError("La IA se ha negado a procesar este documento.", { status: 422, retryable: false });
    }

    if (response.stop_reason === "max_tokens") {
        throw new ExtractionError("El documento es demasiado largo para extraerlo de una vez.", { status: 422, retryable: false });
    }

    const text = response.content.filter(block => block.type === "text").map(block => block.text).join("");

    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch {
        throw new ExtractionError("La respuesta de la IA no se ha podido leer. Reintenta.", { status: 502, retryable: true });
    }

    if (typeof parsed?.documentMatchesType !== "boolean" || !Array.isArray(parsed.uncertain) || parsed.data == null) {
        throw new ExtractionError("La respuesta de la IA no tiene la forma esperada. Reintenta.", { status: 502, retryable: true });
    }

    return { documentMatchesType: parsed.documentMatchesType, data: parsed.data, uncertain: parsed.uncertain };

}

export function buildRequest(type, pdfBase64) {

    const docType = DOCUMENT_TYPES[type];

    return {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        betas: [FALLBACK_BETA],
        fallbacks: "default",
        system: `${COMMON_SYSTEM_PROMPT}\n\n${docType.instructions}`,
        output_config: { format: { type: "json_schema", schema: buildOutputSchema(docType.schema) } },
        messages: [{
            role: "user",
            content: [
                { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
                { type: "text", text: `Extract this document as: ${docType.label}.` }
            ]
        }]
    };

}

export async function extractDocument(type, pdfBase64) {

    if (!process.env.ANTHROPIC_API_KEY) {
        throw new ExtractionError("La importación con IA todavía no está activada en el servidor.", { status: 503, retryable: false });
    }

    try {

        const response = await getClient().beta.messages.create(buildRequest(type, pdfBase64));
        return parseExtractionResponse(response);

    } catch (err) {

        throw classifyError(err);

    }

}
