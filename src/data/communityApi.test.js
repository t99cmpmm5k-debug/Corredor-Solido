import { describe, it, expect, vi, afterEach } from "vitest";

function jsonResponse(body, ok = true, status = 200) {
    return { ok, status, json: () => Promise.resolve(body) };
}

describe("getEntrenosComunidad -- cliente de GET /api/community/entrenos", () => {

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("manda GET con el Authorization Bearer real, sin body", async () => {

        const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ entrenos: [] }));
        vi.stubGlobal("fetch", fetchMock);

        const { getEntrenosComunidad } = await import("./communityApi.js");
        const result = await getEntrenosComunidad("token-real");

        expect(result).toEqual({ entrenos: [] });

        const [url, options] = fetchMock.mock.calls[0];
        expect(url).toBe("https://api.corredorsolido.es/api/community/entrenos");
        expect(options.method).toBe("GET");
        expect(options.headers.Authorization).toBe("Bearer token-real");
        expect(options.body).toBeUndefined();

    });

    it("devuelve la lista de entrenos tal cual la manda el backend", async () => {

        const entrenos = [
            { alias: "Rafa", id: "w1", type: "easy", date: "2026-09-01", distanceKm: 8, avgPaceSecPerKm: 330, durationSec: 2640, routeTrace: [{ lat: 37.9, lon: -1.1 }, { lat: 37.91, lon: -1.11 }] }
        ];

        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ entrenos })));

        const { getEntrenosComunidad } = await import("./communityApi.js");
        const result = await getEntrenosComunidad("token-real");

        expect(result.entrenos).toEqual(entrenos);

    });

    it("con un error real del servidor, lanza con el mensaje del backend", async () => {

        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "No autorizado." }, false, 401)));

        const { getEntrenosComunidad } = await import("./communityApi.js");

        await expect(getEntrenosComunidad("token-caducado")).rejects.toThrow("No autorizado.");

    });

    it("sin red, lanza un error legible en vez de dejar la promesa colgada", async () => {

        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

        const { getEntrenosComunidad } = await import("./communityApi.js");

        await expect(getEntrenosComunidad("token-real")).rejects.toThrow("No se pudo conectar con el servidor");

    });

});

describe("getEntrenoComunidadDetail -- cliente de GET /api/community/entrenos/:id", () => {

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("manda GET a la ruta del id concreto, con el Authorization Bearer real", async () => {

        const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ alias: "Rafa", id: "w1", splits: [] }));
        vi.stubGlobal("fetch", fetchMock);

        const { getEntrenoComunidadDetail } = await import("./communityApi.js");
        const result = await getEntrenoComunidadDetail("w1", "token-real");

        expect(result).toEqual({ alias: "Rafa", id: "w1", splits: [] });

        const [url, options] = fetchMock.mock.calls[0];
        expect(url).toBe("https://api.corredorsolido.es/api/community/entrenos/w1");
        expect(options.method).toBe("GET");
        expect(options.headers.Authorization).toBe("Bearer token-real");

    });

    it("un id inexistente (404) lanza con el mensaje del backend", async () => {

        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "No se encontró ese entreno." }, false, 404)));

        const { getEntrenoComunidadDetail } = await import("./communityApi.js");

        await expect(getEntrenoComunidadDetail("no-existe", "token-real")).rejects.toThrow("No se encontró ese entreno.");

    });

    it("sin red, lanza un error legible en vez de dejar la promesa colgada", async () => {

        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

        const { getEntrenoComunidadDetail } = await import("./communityApi.js");

        await expect(getEntrenoComunidadDetail("w1", "token-real")).rejects.toThrow("No se pudo conectar con el servidor");

    });

});

