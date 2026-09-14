import { describe, it, expect, beforeAll, vi } from "vitest";

beforeAll(() => {
    process.env.JWT_SECRET = "test-secret-solo-para-tests";
});

function mockRes() {
    const res = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
}

describe("requireAuth -- middleware de sesión", () => {

    it("sin cabecera Authorization, responde 401 y no llama a next()", async () => {

        const { requireAuth } = await import("./requireAuth.js");

        const req = { headers: {} };
        const res = mockRes();
        const next = vi.fn();

        requireAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();

    });

    it("con un token válido, deja pasar y expone req.userId", async () => {

        const { signToken } = await import("../authUtils.js");
        const { requireAuth } = await import("./requireAuth.js");

        const token = signToken(7);
        const req = { headers: { authorization: `Bearer ${token}` } };
        const res = mockRes();
        const next = vi.fn();

        requireAuth(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(req.userId).toBe(7);

    });

    it("con un token inválido, responde 401 y no llama a next()", async () => {

        const { requireAuth } = await import("./requireAuth.js");

        const req = { headers: { authorization: "Bearer esto-no-es-un-token-valido" } };
        const res = mockRes();
        const next = vi.fn();

        requireAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();

    });

});
