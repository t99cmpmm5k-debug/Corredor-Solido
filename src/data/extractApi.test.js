import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("./authStore.js", () => ({ getToken: () => "tok" }));

function jsonResponse(body, status = 200) {
    return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) };
}

function pdfFile(text = "%PDF-1.4 hola") {
    return new File([text], "dieta.pdf");
}

describe("extractApi", () => {

    beforeEach(() => {
        vi.resetModules();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it("sube el PDF en base64 con el token, espera al trabajo y devuelve el resultado", async () => {

        const result = { documentMatchesType: true, data: { x: 1 }, uncertain: [] };
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(jsonResponse({ jobId: "j1" }, 202))
            .mockResolvedValueOnce(jsonResponse({ status: "pending" }))
            .mockResolvedValueOnce(jsonResponse({ status: "done", result }));
        vi.stubGlobal("fetch", fetchMock);

        const { extractPdf } = await import("./extractApi.js");
        const statuses = [];
        const pending = extractPdf("dieta", pdfFile(), { onStatus: s => statuses.push(s) });
        await vi.runAllTimersAsync();

        expect(await pending).toEqual(result);
        expect(statuses).toEqual(["uploading", "processing"]);

        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe("https://api.corredorsolido.es/api/extract-document");
        expect(init.headers.Authorization).toBe("Bearer tok");
        expect(JSON.parse(init.body)).toEqual({ type: "dieta", pdfBase64: btoa("%PDF-1.4 hola") });
        expect(fetchMock.mock.calls[2][0]).toBe("https://api.corredorsolido.es/api/extract-document/j1");

    });

    it("un corte de red mientras espera no pierde el trabajo: vuelve a preguntar", async () => {

        const fetchMock = vi.fn()
            .mockResolvedValueOnce(jsonResponse({ jobId: "j1" }, 202))
            .mockRejectedValueOnce(new TypeError("Load failed"))
            .mockResolvedValueOnce(jsonResponse({ status: "done", result: { documentMatchesType: true, data: {}, uncertain: [] } }));
        vi.stubGlobal("fetch", fetchMock);

        const { extractPdf } = await import("./extractApi.js");
        const pending = extractPdf("dieta", pdfFile());
        await vi.runAllTimersAsync();

        await expect(pending).resolves.toMatchObject({ documentMatchesType: true });

    });

    it("el error de la IA llega con su mensaje y si se puede reintentar", async () => {

        vi.stubGlobal("fetch", vi.fn()
            .mockResolvedValueOnce(jsonResponse({ jobId: "j1" }, 202))
            .mockResolvedValueOnce(jsonResponse({ status: "error", error: "El servicio de IA está saturado ahora mismo.", retryable: true })));

        const { extractPdf } = await import("./extractApi.js");
        const pending = extractPdf("dieta", pdfFile());
        const assertion = expect(pending).rejects.toMatchObject({ message: "El servicio de IA está saturado ahora mismo.", retryable: true });
        await vi.runAllTimersAsync();
        await assertion;

    });

    it("rechaza lo que no es un PDF por su contenido, sin llamar al servidor", async () => {

        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);

        const { extractPdf } = await import("./extractApi.js");

        await expect(extractPdf("dieta", new File(["hola"], "dieta.pdf"))).rejects.toMatchObject({ retryable: false, message: /no es un PDF/ });
        expect(fetchMock).not.toHaveBeenCalled();

    });

});
