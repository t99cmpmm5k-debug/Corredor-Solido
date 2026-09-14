import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
    process.env.JWT_SECRET = "test-secret-solo-para-tests";
});

describe("authUtils -- hashing y verificación de contraseñas", () => {

    it("una contraseña real verifica correctamente contra su propio hash", async () => {

        const { hashPassword, verifyPassword } = await import("./authUtils.js");

        const hash = await hashPassword("miContraseñaReal123");
        expect(await verifyPassword("miContraseñaReal123", hash)).toBe(true);

    });

    it("una contraseña incorrecta no verifica", async () => {

        const { hashPassword, verifyPassword } = await import("./authUtils.js");

        const hash = await hashPassword("miContraseñaReal123");
        expect(await verifyPassword("otra-cosa", hash)).toBe(false);

    });

    it("el hash nunca es igual al texto plano ni se repite igual entre dos llamadas (salt distinta)", async () => {

        const { hashPassword } = await import("./authUtils.js");

        const hashA = await hashPassword("miContraseñaReal123");
        const hashB = await hashPassword("miContraseñaReal123");

        expect(hashA).not.toBe("miContraseñaReal123");
        expect(hashA).not.toBe(hashB);

    });

});

describe("authUtils -- tokens de sesión (JWT)", () => {

    it("firma un token y lo verifica de vuelta al mismo userId", async () => {

        const { signToken, verifyToken } = await import("./authUtils.js");

        const token = signToken(42);
        const payload = verifyToken(token);

        expect(payload.userId).toBe(42);

    });

    it("un token manipulado (firma inválida) lanza al verificar", async () => {

        const { signToken, verifyToken } = await import("./authUtils.js");

        const token = signToken(1);
        const tampered = token.slice(0, -2) + "xx";

        expect(() => verifyToken(tampered)).toThrow();

    });

});
