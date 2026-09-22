import { describe, it, expect, vi, afterEach } from "vitest";

const executeMock = vi.fn();

vi.mock("../db.js", () => ({
    pool: { execute: (...args) => executeMock(...args) }
}));

function mockRes() {
    const res = {};
    res.json = vi.fn().mockReturnValue(res);
    return res;
}

describe("GET /api/community/entrenos -- requireAuth sigue siendo obligatorio", () => {

    it("communityRouter tiene requireAuth montado (JWT obligatorio en toda la ruta)", async () => {

        const { communityRouter } = await import("./community.js");
        const { requireAuth } = await import("../middleware/requireAuth.js");

        const hasRequireAuth = communityRouter.stack.some(layer => layer.handle === requireAuth);
        expect(hasRequireAuth).toBe(true);

    });

});

describe("getCommunityEntrenos -- lista blanca de campos, nunca datos personales", () => {

    afterEach(() => {
        executeMock.mockReset();
    });

    it("nunca incluye email, password_hash, ni ningún token en la respuesta -- solo un alias derivado de la parte local del email", async () => {

        executeMock.mockResolvedValue([[
            {
                email: "rafasanrom10@icloud.com",
                data: { id: "w1", type: "easy", date: "2026-09-20", distanceKm: 8, avgPaceSecPerKm: 320, durationSec: 2560, avgHr: 145 }
            }
        ]]);

        const { getCommunityEntrenos } = await import("./community.js");
        const res = mockRes();

        await getCommunityEntrenos({}, res);

        const body = res.json.mock.calls[0][0];
        const serialized = JSON.stringify(body);

        expect(serialized).not.toContain("icloud.com");
        expect(serialized).not.toContain("rafasanrom10@icloud.com");
        expect(serialized.toLowerCase()).not.toContain("password");
        expect(serialized.toLowerCase()).not.toContain("token");

        expect(body.entrenos[0].alias).toBe("rafasanrom10");

    });

    it("un usuario sin ningún entreno no rompe la respuesta -- simplemente no aporta ninguna fila (JOIN normal)", async () => {

        // Ningún entreno en absoluto (el JOIN de la query real ya excluye
        // usuarios sin filas en workouts) -- la ruta debe responder igual,
        // con una lista vacía, sin lanzar.
        executeMock.mockResolvedValue([[]]);

        const { getCommunityEntrenos } = await import("./community.js");
        const res = mockRes();

        await expect(getCommunityEntrenos({}, res)).resolves.not.toThrow();
        expect(res.json).toHaveBeenCalledWith({ entrenos: [] });

    });

    it("solo incluye los campos permitidos -- cualquier otro campo del workout (dayState, fieldMeta, calorías...) queda fuera", async () => {

        executeMock.mockResolvedValue([[
            {
                email: "user@example.com",
                data: {
                    id: "w1", type: "long", date: "2026-09-19", distanceKm: 21, avgPaceSecPerKm: 300, durationSec: 6300,
                    // Campos que NO deben salir:
                    dayState: { sleepHours: 7, sessionRating: 8 },
                    fieldMeta: { type: { confidence: 0.9 } },
                    calories: 1400,
                    location: "Ojós",
                    shoeId: "shoe1",
                    importWarnings: ["algo"]
                }
            }
        ]]);

        const { getCommunityEntrenos } = await import("./community.js");
        const res = mockRes();

        await getCommunityEntrenos({}, res);

        const [entreno] = res.json.mock.calls[0][0].entrenos;

        expect(entreno).toEqual({
            alias: "user",
            id: "w1",
            type: "long",
            date: "2026-09-19",
            distanceKm: 21,
            avgPaceSecPerKm: 300,
            durationSec: 6300
        });

    });

    it("routeTrace solo se incluye si el entreno tiene un recorrido GPS real (2+ puntos)", async () => {

        executeMock.mockResolvedValue([[
            { email: "a@example.com", data: { id: "w1", type: "long", routeTrace: [{ lat: 1, lon: 1 }, { lat: 2, lon: 2 }] } },
            { email: "b@example.com", data: { id: "w2", type: "long", routeTrace: [{ lat: 1, lon: 1 }] } },
            { email: "c@example.com", data: { id: "w3", type: "long" } }
        ]]);

        const { getCommunityEntrenos } = await import("./community.js");
        const res = mockRes();

        await getCommunityEntrenos({}, res);

        const { entrenos } = res.json.mock.calls[0][0];

        expect(entrenos[0].routeTrace).toEqual([{ lat: 1, lon: 1 }, { lat: 2, lon: 2 }]);
        expect(entrenos[1].routeTrace).toBeUndefined();
        expect(entrenos[2].routeTrace).toBeUndefined();

    });

    it("avgHr (datos de Z2) solo se incluye para entrenos tipo \"easy\" -- nunca para otros tipos, aunque el dato exista", async () => {

        executeMock.mockResolvedValue([[
            { email: "a@example.com", data: { id: "w1", type: "easy", avgHr: 140 } },
            { email: "a@example.com", data: { id: "w2", type: "series", avgHr: 165 } }
        ]]);

        const { getCommunityEntrenos } = await import("./community.js");
        const res = mockRes();

        await getCommunityEntrenos({}, res);

        const { entrenos } = res.json.mock.calls[0][0];

        expect(entrenos[0].avgHr).toBe(140);
        expect(entrenos[1].avgHr).toBeUndefined();

    });

    it("un entreno de tipo easy pero sin FC real no inventa un valor -- simplemente no trae avgHr", async () => {

        executeMock.mockResolvedValue([[
            { email: "a@example.com", data: { id: "w1", type: "easy" } }
        ]]);

        const { getCommunityEntrenos } = await import("./community.js");
        const res = mockRes();

        await getCommunityEntrenos({}, res);

        const { entrenos } = res.json.mock.calls[0][0];
        expect(entrenos[0].avgHr).toBeUndefined();

    });

    it("con alias_publico ya configurado, lo usa en vez del derivado del email", async () => {

        executeMock.mockResolvedValue([[
            { email: "rafasanrom10@icloud.com", alias_publico: "Rafa Runner", data: { id: "w1", type: "long" } }
        ]]);

        const { getCommunityEntrenos } = await import("./community.js");
        const res = mockRes();

        await getCommunityEntrenos({}, res);

        const { entrenos } = res.json.mock.calls[0][0];
        expect(entrenos[0].alias).toBe("Rafa Runner");
        expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain("icloud.com");

    });

    it("sin alias_publico (NULL, todavía sin configurar en Perfil), cae al derivado del email -- nadie se queda sin alias visible", async () => {

        executeMock.mockResolvedValue([[
            { email: "novia@example.com", alias_publico: null, data: { id: "w1", type: "long" } }
        ]]);

        const { getCommunityEntrenos } = await import("./community.js");
        const res = mockRes();

        await getCommunityEntrenos({}, res);

        const { entrenos } = res.json.mock.calls[0][0];
        expect(entrenos[0].alias).toBe("novia");

    });

});
