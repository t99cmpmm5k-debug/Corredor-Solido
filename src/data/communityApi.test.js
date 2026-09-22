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

describe("likeComunidadEntreno -- cliente de POST /api/community/entrenos/:id/like", () => {

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("manda POST a la ruta del id concreto y devuelve { liked, likesCount }", async () => {

        const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ liked: true, likesCount: 3 }));
        vi.stubGlobal("fetch", fetchMock);

        const { likeComunidadEntreno } = await import("./communityApi.js");
        const result = await likeComunidadEntreno("w1", "token-real");

        expect(result).toEqual({ liked: true, likesCount: 3 });

        const [url, options] = fetchMock.mock.calls[0];
        expect(url).toBe("https://api.corredorsolido.es/api/community/entrenos/w1/like");
        expect(options.method).toBe("POST");
        expect(options.headers.Authorization).toBe("Bearer token-real");

    });

    it("con un error real del servidor, lanza con el mensaje del backend", async () => {

        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "No autorizado." }, false, 401)));

        const { likeComunidadEntreno } = await import("./communityApi.js");

        await expect(likeComunidadEntreno("w1", "token-caducado")).rejects.toThrow("No autorizado.");

    });

    it("sin red, lanza un error legible en vez de dejar la promesa colgada", async () => {

        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

        const { likeComunidadEntreno } = await import("./communityApi.js");

        await expect(likeComunidadEntreno("w1", "token-real")).rejects.toThrow("No se pudo conectar con el servidor");

    });

});

describe("unlikeComunidadEntreno -- cliente de DELETE /api/community/entrenos/:id/like", () => {

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("manda DELETE a la ruta del id concreto y devuelve { liked, likesCount }", async () => {

        const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ liked: false, likesCount: 2 }));
        vi.stubGlobal("fetch", fetchMock);

        const { unlikeComunidadEntreno } = await import("./communityApi.js");
        const result = await unlikeComunidadEntreno("w1", "token-real");

        expect(result).toEqual({ liked: false, likesCount: 2 });

        const [url, options] = fetchMock.mock.calls[0];
        expect(url).toBe("https://api.corredorsolido.es/api/community/entrenos/w1/like");
        expect(options.method).toBe("DELETE");
        expect(options.headers.Authorization).toBe("Bearer token-real");

    });

    it("sin red, lanza un error legible en vez de dejar la promesa colgada", async () => {

        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

        const { unlikeComunidadEntreno } = await import("./communityApi.js");

        await expect(unlikeComunidadEntreno("w1", "token-real")).rejects.toThrow("No se pudo conectar con el servidor");

    });

});

describe("postComunidadComment -- cliente de POST /api/community/entrenos/:id/comments", () => {

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("manda POST con el texto en el body y devuelve el comentario creado", async () => {

        const created = { id: 1, alias: "Rafa", text: "Bien ahí!", createdAt: "2026-09-22T10:00:00.000Z", isMine: true };
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse(created, true, 201));
        vi.stubGlobal("fetch", fetchMock);

        const { postComunidadComment } = await import("./communityApi.js");
        const result = await postComunidadComment("w1", "Bien ahí!", "token-real");

        expect(result).toEqual(created);

        const [url, options] = fetchMock.mock.calls[0];
        expect(url).toBe("https://api.corredorsolido.es/api/community/entrenos/w1/comments");
        expect(options.method).toBe("POST");
        expect(options.headers.Authorization).toBe("Bearer token-real");
        expect(JSON.parse(options.body)).toEqual({ text: "Bien ahí!" });

    });

    it("con un error de validación del backend (400), lanza con el mensaje real", async () => {

        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "El comentario no puede estar vacío." }, false, 400)));

        const { postComunidadComment } = await import("./communityApi.js");

        await expect(postComunidadComment("w1", "", "token-real")).rejects.toThrow("El comentario no puede estar vacío.");

    });

    it("sin red, lanza un error legible en vez de dejar la promesa colgada", async () => {

        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

        const { postComunidadComment } = await import("./communityApi.js");

        await expect(postComunidadComment("w1", "hola", "token-real")).rejects.toThrow("No se pudo conectar con el servidor");

    });

});

describe("getComunidadEntrenoComments -- cliente de GET /api/community/entrenos/:id/comments", () => {

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("manda GET a la ruta del id concreto y devuelve la lista", async () => {

        const comments = [{ id: 1, alias: "Ana", text: "Genial", createdAt: "2026-09-22T10:00:00.000Z", isMine: false }];
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ comments }));
        vi.stubGlobal("fetch", fetchMock);

        const { getComunidadEntrenoComments } = await import("./communityApi.js");
        const result = await getComunidadEntrenoComments("w1", "token-real");

        expect(result).toEqual({ comments });

        const [url, options] = fetchMock.mock.calls[0];
        expect(url).toBe("https://api.corredorsolido.es/api/community/entrenos/w1/comments");
        expect(options.method).toBe("GET");

    });

    it("sin red, lanza un error legible en vez de dejar la promesa colgada", async () => {

        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

        const { getComunidadEntrenoComments } = await import("./communityApi.js");

        await expect(getComunidadEntrenoComments("w1", "token-real")).rejects.toThrow("No se pudo conectar con el servidor");

    });

});

describe("deleteComunidadComment -- cliente de DELETE /api/community/entrenos/:id/comments/:commentId", () => {

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("manda DELETE a la ruta del comentario concreto", async () => {

        const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ deleted: true }));
        vi.stubGlobal("fetch", fetchMock);

        const { deleteComunidadComment } = await import("./communityApi.js");
        const result = await deleteComunidadComment("w1", 42, "token-real");

        expect(result).toEqual({ deleted: true });

        const [url, options] = fetchMock.mock.calls[0];
        expect(url).toBe("https://api.corredorsolido.es/api/community/entrenos/w1/comments/42");
        expect(options.method).toBe("DELETE");

    });

    it("un 403 (comentario ajeno) lanza con el mensaje real del backend", async () => {

        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "Solo puedes borrar tus propios comentarios." }, false, 403)));

        const { deleteComunidadComment } = await import("./communityApi.js");

        await expect(deleteComunidadComment("w1", 42, "token-real")).rejects.toThrow("Solo puedes borrar tus propios comentarios.");

    });

    it("sin red, lanza un error legible en vez de dejar la promesa colgada", async () => {

        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

        const { deleteComunidadComment } = await import("./communityApi.js");

        await expect(deleteComunidadComment("w1", 42, "token-real")).rejects.toThrow("No se pudo conectar con el servidor");

    });

});
