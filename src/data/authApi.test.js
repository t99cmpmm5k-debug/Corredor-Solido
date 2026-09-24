import { describe, it, expect, vi, afterEach } from "vitest";

function jsonResponse(body, ok = true, status = 200) {
    return { ok, status, json: () => Promise.resolve(body) };
}

describe("getPerfil/actualizarPerfil -- cliente de GET/PATCH /api/auth/perfil", () => {

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("getPerfil manda GET con el Authorization Bearer real, sin body", async () => {

        const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ aliasPublico: "Rafa" }));
        vi.stubGlobal("fetch", fetchMock);

        const { getPerfil } = await import("./authApi.js");
        const result = await getPerfil("token-real");

        expect(result).toEqual({ aliasPublico: "Rafa" });

        const [url, options] = fetchMock.mock.calls[0];
        expect(url).toBe("https://api.corredorsolido.es/api/auth/perfil");
        expect(options.method).toBe("GET");
        expect(options.headers.Authorization).toBe("Bearer token-real");
        expect(options.body).toBeUndefined();

    });

    it("actualizarPerfil manda PATCH solo con el alias en el cuerpo si es lo único que se pasa", async () => {

        const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ aliasPublico: "Rafa Runner" }));
        vi.stubGlobal("fetch", fetchMock);

        const { actualizarPerfil } = await import("./authApi.js");
        const result = await actualizarPerfil("token-real", { aliasPublico: "Rafa Runner" });

        expect(result).toEqual({ aliasPublico: "Rafa Runner" });

        const [, options] = fetchMock.mock.calls[0];
        expect(options.method).toBe("PATCH");
        expect(options.headers.Authorization).toBe("Bearer token-real");
        expect(JSON.parse(options.body)).toEqual({ aliasPublico: "Rafa Runner" });

    });

    it("actualizarPerfil manda PATCH solo con la localidad si es lo único que se pasa -- sin aliasPublico en el body", async () => {

        const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ localidad: "Murcia" }));
        vi.stubGlobal("fetch", fetchMock);

        const { actualizarPerfil } = await import("./authApi.js");
        await actualizarPerfil("token-real", { localidad: "Murcia" });

        const [, options] = fetchMock.mock.calls[0];
        expect(JSON.parse(options.body)).toEqual({ localidad: "Murcia" });

    });

    it("actualizarPerfil manda los dos campos juntos cuando los dos se pasan", async () => {

        const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ aliasPublico: "Rafa", localidad: "Murcia" }));
        vi.stubGlobal("fetch", fetchMock);

        const { actualizarPerfil } = await import("./authApi.js");
        await actualizarPerfil("token-real", { aliasPublico: "Rafa", localidad: "Murcia" });

        const [, options] = fetchMock.mock.calls[0];
        expect(JSON.parse(options.body)).toEqual({ aliasPublico: "Rafa", localidad: "Murcia" });

    });

    it("con un 400 real del servidor (alias inválido), lanza con el mensaje real del backend", async () => {

        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "El alias debe tener entre 2 y 50 caracteres." }, false, 400)));

        const { actualizarPerfil } = await import("./authApi.js");

        await expect(actualizarPerfil("token-real", { aliasPublico: "A" })).rejects.toThrow("El alias debe tener entre 2 y 50 caracteres.");

    });

    it("sin red, lanza un error legible en vez de dejar la promesa colgada", async () => {

        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

        const { getPerfil } = await import("./authApi.js");

        await expect(getPerfil("token-real")).rejects.toThrow("No se pudo conectar con el servidor");

    });

});
