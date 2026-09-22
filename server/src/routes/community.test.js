import { describe, it, expect, vi, afterEach } from "vitest";

const executeMock = vi.fn();

vi.mock("../db.js", () => ({
    pool: { execute: (...args) => executeMock(...args) }
}));

function mockRes() {
    const res = {};
    res.json = vi.fn().mockReturnValue(res);
    res.status = vi.fn().mockReturnValue(res);
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

    it("z2TimeInZonePercent (Ranking Fase 2) solo se incluye para entrenos tipo \"easy\", aunque otro tipo tenga splits con FC", async () => {

        const splits = [
            { distanceKm: 1, paceSecPerKm: 300, avgHr: 140 },
            { distanceKm: 1, paceSecPerKm: 300, avgHr: 170 }
        ];

        executeMock.mockResolvedValue([[
            { email: "a@example.com", data: { id: "w1", type: "easy", splits } },
            { email: "a@example.com", data: { id: "w2", type: "series", splits } }
        ]]);

        const { getCommunityEntrenos } = await import("./community.js");
        const res = mockRes();

        await getCommunityEntrenos({}, res);

        const { entrenos } = res.json.mock.calls[0][0];

        expect(entrenos[0].z2TimeInZonePercent).toBe(50);
        expect(entrenos[1].z2TimeInZonePercent).toBeUndefined();

    });

    it("z2TimeInZonePercent pesa cada split por su duración estimada (distanceKm * paceSecPerKm), no cuenta splits a secas", async () => {

        const splits = [
            // 1km a 5:00/km = 300s dentro de zona (140 ppm)
            { distanceKm: 1, paceSecPerKm: 300, avgHr: 140 },
            // 2km a 6:00/km = 720s fuera de zona (170 ppm) -- más tiempo real
            // que el split de arriba, aunque sea "solo un split más"
            { distanceKm: 2, paceSecPerKm: 360, avgHr: 170 }
        ];

        executeMock.mockResolvedValue([[
            { email: "a@example.com", data: { id: "w1", type: "easy", splits } }
        ]]);

        const { getCommunityEntrenos } = await import("./community.js");
        const res = mockRes();

        await getCommunityEntrenos({}, res);

        const { entrenos } = res.json.mock.calls[0][0];

        // 300 / (300 + 720) = 29.4%, no 50% (que sería contar splits a secas)
        expect(entrenos[0].z2TimeInZonePercent).toBe(29.4);

    });

    it("un entreno easy sin splits, o con splits sin FC real, no inventa un valor -- simplemente no trae z2TimeInZonePercent", async () => {

        executeMock.mockResolvedValue([[
            { email: "a@example.com", data: { id: "w1", type: "easy" } },
            { email: "a@example.com", data: { id: "w2", type: "easy", splits: [{ distanceKm: 1, paceSecPerKm: 300, avgHr: null }] } }
        ]]);

        const { getCommunityEntrenos } = await import("./community.js");
        const res = mockRes();

        await getCommunityEntrenos({}, res);

        const { entrenos } = res.json.mock.calls[0][0];

        expect(entrenos[0].z2TimeInZonePercent).toBeUndefined();
        expect(entrenos[1].z2TimeInZonePercent).toBeUndefined();

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

describe("GET /api/community/entrenos/:id -- detalle completo, de CUALQUIER usuario", () => {

    afterEach(() => {
        executeMock.mockReset();
    });

    it("a diferencia de /api/sync (restringido a req.userId), un usuario puede pedir el detalle de un entreno que NO es suyo", async () => {

        executeMock.mockResolvedValue([[
            { email: "otro@example.com", alias_publico: null, data: { id: "w1", type: "long", distanceKm: 15 } }
        ]]);

        const { getCommunityEntrenoDetail } = await import("./community.js");
        const req = { params: { id: "w1" }, userId: 999 };
        const res = mockRes();

        await getCommunityEntrenoDetail(req, res);

        // La query no debe llevar el userId de quien pregunta como filtro --
        // solo el id del entreno pedido.
        expect(executeMock).toHaveBeenCalledWith(expect.any(String), ["w1"]);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ alias: "otro", distanceKm: 15 }));

    });

    it("un id de entreno inexistente devuelve 404 con un error claro, no un 500", async () => {

        executeMock.mockResolvedValue([[]]);

        const { getCommunityEntrenoDetail } = await import("./community.js");
        const req = { params: { id: "no-existe" }, userId: 1 };
        const res = mockRes();

        await expect(getCommunityEntrenoDetail(req, res)).resolves.not.toThrow();

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: expect.any(String) });

    });

    it("incluye splits -- lap/distanceKm/paceSecPerKm/avgHr/maxHr/segmentType -- para colorear el mapa por ritmo real", async () => {

        executeMock.mockResolvedValue([[
            {
                email: "a@example.com",
                alias_publico: null,
                data: {
                    id: "w1", type: "series", distanceKm: 8,
                    splits: [
                        { lap: 1, distanceKm: 1, paceSecPerKm: 300, avgHr: 150, maxHr: 160, segmentType: "work" },
                        { lap: 2, distanceKm: 1, paceSecPerKm: 400, avgHr: 130, segmentType: "rest" }
                    ]
                }
            }
        ]]);

        const { getCommunityEntrenoDetail } = await import("./community.js");
        const res = mockRes();

        await getCommunityEntrenoDetail({ params: { id: "w1" } }, res);

        const body = res.json.mock.calls[0][0];

        expect(body.splits).toEqual([
            { lap: 1, distanceKm: 1, paceSecPerKm: 300, avgHr: 150, maxHr: 160, segmentType: "work" },
            { lap: 2, distanceKm: 1, paceSecPerKm: 400, avgHr: 130, maxHr: null, segmentType: "rest" }
        ]);

    });

    it("sin splits guardados, devuelve un array vacío en vez de romper", async () => {

        executeMock.mockResolvedValue([[
            { email: "a@example.com", alias_publico: null, data: { id: "w1", type: "long" } }
        ]]);

        const { getCommunityEntrenoDetail } = await import("./community.js");
        const res = mockRes();

        await getCommunityEntrenoDetail({ params: { id: "w1" } }, res);

        expect(res.json.mock.calls[0][0].splits).toEqual([]);

    });

    it("sigue excluyendo email, password y tokens -- misma disciplina que la lista", async () => {

        executeMock.mockResolvedValue([[
            { email: "rafasanrom10@icloud.com", alias_publico: null, data: { id: "w1", type: "long", splits: [] } }
        ]]);

        const { getCommunityEntrenoDetail } = await import("./community.js");
        const res = mockRes();

        await getCommunityEntrenoDetail({ params: { id: "w1" } }, res);

        const serialized = JSON.stringify(res.json.mock.calls[0][0]);

        expect(serialized).not.toContain("icloud.com");
        expect(serialized.toLowerCase()).not.toContain("password");
        expect(serialized.toLowerCase()).not.toContain("token");

    });

});
