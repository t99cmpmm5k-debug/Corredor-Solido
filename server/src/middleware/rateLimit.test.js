import { describe, it, expect, vi } from "vitest";

function mockRes() {
    const res = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    res.end = vi.fn().mockReturnValue(res);
    return res;
}

describe("tileRateLimit -- middleware de abuso para el proxy de tiles de satélite", () => {

    it("deja pasar peticiones normales de la misma IP", async () => {

        const { tileRateLimit } = await import("./rateLimit.js");

        const req = { ip: `1.2.3.${Math.random()}` };
        const res = mockRes();
        const next = vi.fn();

        tileRateLimit(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();

    });

    it("una IP distinta no se ve afectada por el límite de otra", async () => {

        const { tileRateLimit } = await import("./rateLimit.js");
        const ipA = `9.9.9.${Math.random()}`;
        const ipB = `8.8.8.${Math.random()}`;

        for (let i = 0; i < 180; i++) {
            tileRateLimit({ ip: ipA }, mockRes(), vi.fn());
        }

        const res = mockRes();
        const next = vi.fn();
        tileRateLimit({ ip: ipB }, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();

    });

    it("por encima del límite en la ventana, responde 429 y no llama a next()", async () => {

        const { tileRateLimit } = await import("./rateLimit.js");
        const ip = `5.5.5.${Math.random()}`;

        for (let i = 0; i < 180; i++) {
            tileRateLimit({ ip }, mockRes(), vi.fn());
        }

        const res = mockRes();
        const next = vi.fn();
        tileRateLimit({ ip }, res, next);

        expect(res.status).toHaveBeenCalledWith(429);
        expect(next).not.toHaveBeenCalled();

    });

});
