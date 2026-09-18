import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

function mockRes() {
    const res = {};
    res.status = vi.fn().mockReturnValue(res);
    res.set = vi.fn().mockReturnValue(res);
    res.send = vi.fn().mockReturnValue(res);
    res.end = vi.fn().mockReturnValue(res);
    return res;
}

describe("isValidTileCoord", () => {

    it("acepta coordenadas enteras no negativas dentro del zoom máximo", async () => {

        const { isValidTileCoord } = await import("./tiles.js");
        expect(isValidTileCoord(10, 300, 500)).toBe(true);
        expect(isValidTileCoord(0, 0, 0)).toBe(true);

    });

    it("rechaza zoom negativo, por encima del máximo, o coordenadas no enteras", async () => {

        const { isValidTileCoord } = await import("./tiles.js");
        expect(isValidTileCoord(-1, 0, 0)).toBe(false);
        expect(isValidTileCoord(24, 0, 0)).toBe(false);
        expect(isValidTileCoord(10, -1, 0)).toBe(false);
        expect(isValidTileCoord(10.5, 0, 0)).toBe(false);
        expect(isValidTileCoord(10, 0, NaN)).toBe(false);

    });

});

describe("handleSatelliteTile -- proxy de relay puro hacia Esri, sin guardar nada en el servidor", () => {

    const originalKey = process.env.ESRI_API_KEY;

    beforeEach(() => {
        process.env.ESRI_API_KEY = "test-key";
    });

    afterEach(() => {
        process.env.ESRI_API_KEY = originalKey;
        vi.unstubAllGlobals();
        vi.resetModules();
    });

    it("coordenadas inválidas responden 400 sin llegar a llamar a fetch", async () => {

        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);

        const { handleSatelliteTile } = await import("./tiles.js");
        const res = mockRes();

        await handleSatelliteTile({ params: { z: "-1", y: "0", x: "0" } }, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(fetchMock).not.toHaveBeenCalled();

    });

    it("sin ESRI_API_KEY configurada, responde 503 sin llamar a fetch (capa opcional, no debe tumbar el arranque)", async () => {

        delete process.env.ESRI_API_KEY;

        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);

        const { handleSatelliteTile } = await import("./tiles.js");
        const res = mockRes();

        await handleSatelliteTile({ params: { z: "10", y: "300", x: "500" } }, res);

        expect(res.status).toHaveBeenCalledWith(503);
        expect(fetchMock).not.toHaveBeenCalled();

    });

    it("pide a Esri con el orden z/y/x real (MapServer/tile) y la clave nunca sale en ninguna respuesta al cliente", async () => {

        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            headers: { get: () => "image/jpeg" },
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(4))
        });
        vi.stubGlobal("fetch", fetchMock);

        const { handleSatelliteTile } = await import("./tiles.js");
        const res = mockRes();

        await handleSatelliteTile({ params: { z: "10", y: "300", x: "500" } }, res);

        const [calledUrl] = fetchMock.mock.calls[0];
        expect(calledUrl).toBe("https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/10/300/500?token=test-key");

        expect(res.set).toHaveBeenCalledWith("Content-Type", "image/jpeg");
        expect(res.set).toHaveBeenCalledWith("Cache-Control", expect.stringContaining("public"));
        expect(res.send).toHaveBeenCalled();

        // La clave real solo viaja en la petición saliente A ESRI -- nunca
        // en ninguna cabecera ni cuerpo que este endpoint le mande al
        // cliente (eso sería exactamente el problema que el proxy existe
        // para evitar).
        const sentHeaderCalls = res.set.mock.calls.flat();
        expect(sentHeaderCalls.some(v => typeof v === "string" && v.includes("test-key"))).toBe(false);

    });

    it("si Esri responde con error, reenvía ese mismo status sin inventar uno propio", async () => {

        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));

        const { handleSatelliteTile } = await import("./tiles.js");
        const res = mockRes();

        await handleSatelliteTile({ params: { z: "10", y: "300", x: "500" } }, res);

        expect(res.status).toHaveBeenCalledWith(404);

    });

    it("sin red (fetch rechaza), responde 502 en vez de tumbar el proceso", async () => {

        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

        const { handleSatelliteTile } = await import("./tiles.js");
        const res = mockRes();

        await handleSatelliteTile({ params: { z: "10", y: "300", x: "500" } }, res);

        expect(res.status).toHaveBeenCalledWith(502);

    });

});
