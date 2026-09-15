import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// createWorker() nunca resuelve ni rechaza por su cuenta -- simula el
// hang real de tesseract.js en modo avión (un fetch que no puede ni
// resolver DNS se queda colgado en vez de rechazar rápido).
vi.mock("tesseract.js", () => ({
    default: {
        createWorker: vi.fn(() => new Promise(() => {})),
        OEM: { LSTM_ONLY: 1 }
    }
}));

import { parseGarminScreenshots } from "./recognize.js";

describe("recognize.js - timeout de arranque del worker", () => {

    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("rechaza con un mensaje claro si createWorker() se cuelga (bug real de modo avión)", async () => {

        const promise = parseGarminScreenshots([]);
        const assertion = expect(promise).rejects.toThrow(/conexión a internet/i);

        await vi.advanceTimersByTimeAsync(20000);

        await assertion;

    });

});
