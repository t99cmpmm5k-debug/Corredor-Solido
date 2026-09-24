import { describe, it, expect, afterEach } from "vitest";
import Anthropic from "@anthropic-ai/sdk";
import { DOCUMENT_TYPES } from "./documentTypes.js";
import { buildRequest, parseExtractionResponse, classifyError, extractDocument, ExtractionError } from "./claudeExtractor.js";

// Instancia de una clase de error del SDK sin pasar por su constructor
// (que pide status/headers reales) -- lo único que se comprueba es la
// clase, igual que hace classifyError().
function sdkError(ErrorClass, message = "x") {
    return Object.assign(Object.create(ErrorClass.prototype), { message });
}

const TEST_TYPE = {
    label: "tipo de prueba",
    instructions: "Instrucciones del tipo de prueba.",
    schema: { type: "object", properties: { items: { type: "array", items: { type: "string" } } }, required: ["items"], additionalProperties: false }
};

describe("buildRequest", () => {

    afterEach(() => { delete DOCUMENT_TYPES.prueba; });

    it("manda el PDF como documento, con el esquema envuelto en el sobre común y el fallback del servidor", () => {

        DOCUMENT_TYPES.prueba = TEST_TYPE;
        const req = buildRequest("prueba", "JVBERi0x");

        expect(req.model).toBe("claude-opus-5");
        expect(req.betas).toEqual(["server-side-fallback-2026-07-01"]);
        expect(req.fallbacks).toBe("default");
        expect(req.messages[0].content[0]).toEqual({ type: "document", source: { type: "base64", media_type: "application/pdf", data: "JVBERi0x" } });
        expect(req.system).toContain("Instrucciones del tipo de prueba.");
        expect(req.system).toContain("uncertain");

        const schema = req.output_config.format.schema;
        expect(req.output_config.format.type).toBe("json_schema");
        expect(schema.required).toEqual(["documentMatchesType", "data", "uncertain"]);
        expect(schema.properties.data).toBe(TEST_TYPE.schema);
        expect(schema.additionalProperties).toBe(false);

    });

});

describe("parseExtractionResponse", () => {

    const ok = body => ({ stop_reason: "end_turn", content: [{ type: "thinking", thinking: "" }, { type: "text", text: JSON.stringify(body) }] });

    it("devuelve data y los avisos de lo que no se pudo extraer", () => {

        const body = { documentMatchesType: true, data: { items: ["a"] }, uncertain: [{ location: "Página 2", rawText: null, reason: "ilegible" }] };
        expect(parseExtractionResponse(ok(body))).toEqual(body);

    });

    it("refusal y max_tokens no se dan por buenos, sin reintento (el mismo PDF daría lo mismo)", () => {

        expect(() => parseExtractionResponse({ stop_reason: "refusal", content: [] })).toThrow(expect.objectContaining({ retryable: false }));
        expect(() => parseExtractionResponse({ stop_reason: "max_tokens", content: [{ type: "text", text: "{\"documentMatchesType\": tr" }] })).toThrow(/demasiado largo/);

    });

    it("JSON roto o sin la forma esperada: error reintentable", () => {

        expect(() => parseExtractionResponse({ stop_reason: "end_turn", content: [{ type: "text", text: "no es json" }] })).toThrow(expect.objectContaining({ retryable: true }));
        expect(() => parseExtractionResponse(ok({ data: {} }))).toThrow(expect.objectContaining({ retryable: true }));

    });

});

describe("classifyError -- mensaje claro y si tiene sentido reintentar", () => {

    it("rate limit, conexión y 5xx: reintentables", () => {

        expect(classifyError(sdkError(Anthropic.RateLimitError))).toMatchObject({ retryable: true, status: 503 });
        expect(classifyError(sdkError(Anthropic.APIConnectionTimeoutError))).toMatchObject({ retryable: true, status: 502 });
        expect(classifyError(sdkError(Anthropic.InternalServerError))).toMatchObject({ retryable: true, status: 502 });

    });

    it("clave mala o PDF que la API no acepta: no reintentables", () => {

        expect(classifyError(sdkError(Anthropic.AuthenticationError))).toMatchObject({ retryable: false, status: 503 });
        expect(classifyError(sdkError(Anthropic.BadRequestError))).toMatchObject({ retryable: false, status: 422 });

    });

    it("un ExtractionError pasa tal cual", () => {

        const e = new ExtractionError("x", { status: 422, retryable: false });
        expect(classifyError(e)).toBe(e);

    });

});

describe("extractDocument", () => {

    const originalKey = process.env.ANTHROPIC_API_KEY;
    afterEach(() => { process.env.ANTHROPIC_API_KEY = originalKey; });

    it("sin ANTHROPIC_API_KEY: 503 claro, sin llamar a la API", async () => {

        delete process.env.ANTHROPIC_API_KEY;
        await expect(extractDocument("prueba", "JVBER")).rejects.toMatchObject({ status: 503, retryable: false });

    });

});

// Structured outputs exige additionalProperties:false y todas las
// propiedades en required en cada objeto -- un despiste aquí es un 400 de
// la API en producción, no un fallo visible en local.
function checkStrictSchema(schema, path = "schema") {

    if (schema.anyOf) return schema.anyOf.forEach((s, i) => checkStrictSchema(s, `${path}.anyOf[${i}]`));

    const types = [].concat(schema.type);

    if (types.includes("object")) {
        expect(schema.additionalProperties, path).toBe(false);
        expect([...schema.required].sort(), path).toEqual(Object.keys(schema.properties).sort());
        for (const [key, value] of Object.entries(schema.properties)) checkStrictSchema(value, `${path}.${key}`);
    }

    if (types.includes("array")) checkStrictSchema(schema.items, `${path}[]`);

}

describe("esquema de dieta", () => {

    it("cumple las reglas de structured outputs en todos sus niveles, con el sobre común", async () => {

        const { DOCUMENT_TYPES: types, buildOutputSchema } = await import("./documentTypes.js");
        checkStrictSchema(buildOutputSchema(types.dieta.schema));

    });

});
