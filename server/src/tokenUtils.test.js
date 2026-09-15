import { describe, it, expect } from "vitest";
import { generateAuthToken, hashAuthToken } from "./tokenUtils.js";

describe("tokenUtils -- tokens opacos de un solo uso", () => {

    it("genera tokens distintos en cada llamada", () => {

        expect(generateAuthToken()).not.toBe(generateAuthToken());

    });

    it("el hash es determinista (mismo token -> mismo hash, para poder buscarlo luego)", () => {

        const token = generateAuthToken();

        expect(hashAuthToken(token)).toBe(hashAuthToken(token));

    });

    it("el hash nunca es igual al token en claro", () => {

        const token = generateAuthToken();

        expect(hashAuthToken(token)).not.toBe(token);

    });

    it("tokens distintos producen hashes distintos", () => {

        const tokenA = generateAuthToken();
        const tokenB = generateAuthToken();

        expect(hashAuthToken(tokenA)).not.toBe(hashAuthToken(tokenB));

    });

});
