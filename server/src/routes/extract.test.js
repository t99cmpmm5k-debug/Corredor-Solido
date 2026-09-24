import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const extractMock = vi.fn();
let failWith = null;

vi.mock("../extraction/claudeExtractor.js", async importOriginal => ({
    ...(await importOriginal()),
    extractDocument: (...args) => {
        if (failWith) return Promise.reject(failWith);
        return extractMock(...args);
    }
}));

function mockRes() {
    const res = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
}

const PDF = "JVBERi0xLjQK";

async function setup() {

    vi.resetModules();
    const { DOCUMENT_TYPES } = await import("../extraction/documentTypes.js");
    DOCUMENT_TYPES.prueba = { label: "prueba", instructions: "", schema: {} };
    const route = await import("./extract.js");
    return { ...route, DOCUMENT_TYPES };

}

const flush = () => new Promise(r => setTimeout(r, 0));

describe("POST/GET /api/extract-document -- trabajo asíncrono por usuario", () => {

    beforeEach(() => { extractMock.mockReset(); failWith = null; });
    afterEach(() => vi.resetModules());

    it("arranca el trabajo (202 + jobId), queda pending y luego devuelve el resultado solo a su dueño", async () => {

        const { handleStartExtraction, handleGetExtraction } = await setup();

        let resolve;
        extractMock.mockReturnValue(new Promise(r => { resolve = r; }));

        const start = mockRes();
        handleStartExtraction({ userId: 7, body: { type: "prueba", pdfBase64: PDF } }, start);
        expect(start.status).toHaveBeenCalledWith(202);
        const { jobId } = start.json.mock.calls[0][0];
        expect(extractMock).toHaveBeenCalledWith("prueba", PDF);

        const pending = mockRes();
        handleGetExtraction({ userId: 7, params: { id: jobId } }, pending);
        expect(pending.json).toHaveBeenCalledWith({ status: "pending" });

        const result = { documentMatchesType: true, data: {}, uncertain: [] };
        resolve(result);
        await flush();

        const done = mockRes();
        handleGetExtraction({ userId: 7, params: { id: jobId } }, done);
        expect(done.json).toHaveBeenCalledWith({ status: "done", type: "prueba", result });

        const other = mockRes();
        handleGetExtraction({ userId: 8, params: { id: jobId } }, other);
        expect(other.status).toHaveBeenCalledWith(404);

    });

    it("un fallo de la IA queda como error con su mensaje y si se puede reintentar", async () => {

        const { handleStartExtraction, handleGetExtraction } = await setup();
        const { ExtractionError } = await import("../extraction/claudeExtractor.js");

        // Función normal en vez de mockRejectedValue: el spy de vi.fn()
        // deja sin manejar su propia copia de la promesa rechazada.
        failWith = new ExtractionError("El servicio de IA está saturado ahora mismo.", { status: 503, retryable: true });

        const start = mockRes();
        handleStartExtraction({ userId: 7, body: { type: "prueba", pdfBase64: PDF } }, start);
        await flush();

        const res = mockRes();
        handleGetExtraction({ userId: 7, params: { id: start.json.mock.calls[0][0].jobId } }, res);
        expect(res.json).toHaveBeenCalledWith({ status: "error", error: "El servicio de IA está saturado ahora mismo.", retryable: true });

    });

    it("rechaza tipo desconocido, algo que no es un PDF y PDFs de más de 6 MB, sin llamar a la IA", async () => {

        const { handleStartExtraction } = await setup();

        const cases = [
            [{ type: "otro", pdfBase64: PDF }, 400],
            [{ type: "prueba", pdfBase64: "aG9sYQ==" }, 400],
            [{ type: "prueba", pdfBase64: "JVBER" + "A".repeat(9 * 1024 * 1024) }, 413],
            [{ type: "__proto__", pdfBase64: PDF }, 400]
        ];

        for (const [body, status] of cases) {
            const res = mockRes();
            handleStartExtraction({ userId: 7, body }, res);
            expect(res.status).toHaveBeenCalledWith(status);
        }

        expect(extractMock).not.toHaveBeenCalled();

    });

    it("máximo 2 en curso por usuario y 10 por hora", async () => {

        const { handleStartExtraction } = await setup();
        extractMock.mockReturnValue(new Promise(() => {}));

        const statuses = [];
        for (let i = 0; i < 3; i++) {
            const res = mockRes();
            handleStartExtraction({ userId: 7, body: { type: "prueba", pdfBase64: PDF } }, res);
            statuses.push(res.status.mock.calls[0][0]);
        }
        expect(statuses).toEqual([202, 202, 429]);

        const { handleStartExtraction: fresh } = await setup();
        extractMock.mockResolvedValue({ documentMatchesType: true, data: {}, uncertain: [] });

        const hourly = [];
        for (let i = 0; i < 11; i++) {
            const res = mockRes();
            fresh({ userId: 9, body: { type: "prueba", pdfBase64: PDF } }, res);
            hourly.push(res.status.mock.calls[0][0]);
            await flush();
        }
        expect(hourly.filter(s => s === 202)).toHaveLength(10);
        expect(hourly.at(-1)).toBe(429);

    });

});
