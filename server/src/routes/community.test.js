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
                data: { id: "w1", type: "easy", date: "2026-09-20", distanceKm: 8, avgPaceSecPerKm: 320, durationSec: 2560, avgHr: 145 },
                likes_count: 0, liked_by_me: 0
            }
        ]]);

        const { getCommunityEntrenos } = await import("./community.js");
        const res = mockRes();

        await getCommunityEntrenos({ userId: 1 }, res);

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

        await expect(getCommunityEntrenos({ userId: 1 }, res)).resolves.not.toThrow();
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
                },
                likes_count: 0, liked_by_me: 0, comments_count: 0
            }
        ]]);

        const { getCommunityEntrenos } = await import("./community.js");
        const res = mockRes();

        await getCommunityEntrenos({ userId: 1 }, res);

        const [entreno] = res.json.mock.calls[0][0].entrenos;

        expect(entreno).toEqual({
            alias: "user",
            id: "w1",
            type: "long",
            date: "2026-09-19",
            distanceKm: 21,
            avgPaceSecPerKm: 300,
            durationSec: 6300,
            likesCount: 0,
            likedByMe: false,
            commentsCount: 0
        });

    });

    it("routeTrace solo se incluye si el entreno tiene un recorrido GPS real (2+ puntos)", async () => {

        executeMock.mockResolvedValue([[
            { email: "a@example.com", data: { id: "w1", type: "long", routeTrace: [{ lat: 1, lon: 1 }, { lat: 2, lon: 2 }] }, likes_count: 0, liked_by_me: 0 },
            { email: "b@example.com", data: { id: "w2", type: "long", routeTrace: [{ lat: 1, lon: 1 }] }, likes_count: 0, liked_by_me: 0 },
            { email: "c@example.com", data: { id: "w3", type: "long" }, likes_count: 0, liked_by_me: 0 }
        ]]);

        const { getCommunityEntrenos } = await import("./community.js");
        const res = mockRes();

        await getCommunityEntrenos({ userId: 1 }, res);

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

        await getCommunityEntrenos({ userId: 1 }, res);

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

        await getCommunityEntrenos({ userId: 1 }, res);

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

        await getCommunityEntrenos({ userId: 1 }, res);

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

        await getCommunityEntrenos({ userId: 1 }, res);

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

        await getCommunityEntrenos({ userId: 1 }, res);

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

        await getCommunityEntrenos({ userId: 1 }, res);

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

        await getCommunityEntrenos({ userId: 1 }, res);

        const { entrenos } = res.json.mock.calls[0][0];
        expect(entrenos[0].alias).toBe("novia");

    });

    it("likesCount/likedByMe (Fase 3b) van SIEMPRE, incluso a 0/false -- no son un dato que esconder como avgHr/z2", async () => {

        executeMock.mockResolvedValue([[
            { email: "a@example.com", data: { id: "w1", type: "long" }, likes_count: 0, liked_by_me: 0 }
        ]]);

        const { getCommunityEntrenos } = await import("./community.js");
        const res = mockRes();

        await getCommunityEntrenos({ userId: 1 }, res);

        const { entrenos } = res.json.mock.calls[0][0];
        expect(entrenos[0].likesCount).toBe(0);
        expect(entrenos[0].likedByMe).toBe(false);

    });

    it("likesCount refleja varios usuarios distintos dando like al mismo entreno, likedByMe distingue si soy uno de ellos", async () => {

        executeMock.mockResolvedValue([[
            // La query real agrega con LEFT JOIN + GROUP BY -- aquí se simula
            // ya agregada (como llegaría de MariaDB), no fila por cada like.
            { email: "a@example.com", data: { id: "w1", type: "long" }, likes_count: 3, liked_by_me: 1 },
            { email: "b@example.com", data: { id: "w2", type: "long" }, likes_count: 2, liked_by_me: 0 }
        ]]);

        const { getCommunityEntrenos } = await import("./community.js");
        const res = mockRes();

        await getCommunityEntrenos({ userId: 7 }, res);

        const { entrenos } = res.json.mock.calls[0][0];

        expect(entrenos[0]).toMatchObject({ likesCount: 3, likedByMe: true });
        expect(entrenos[1]).toMatchObject({ likesCount: 2, likedByMe: false });

        // El userId de quien pregunta va como parámetro real de la query
        // (para el MAX(CASE WHEN wl.user_id = ? ...) que calcula likedByMe).
        expect(executeMock).toHaveBeenCalledWith(expect.any(String), [7]);

    });

    it("commentsCount (Fase 3c) va SIEMPRE, incluso a 0, y no se infla al combinarse con el JOIN de likes", async () => {

        executeMock.mockResolvedValue([[
            // Simula lo que produciría de verdad un entreno con 3 likes y 2
            // comentarios si el conteo NO usara DISTINCT -- aquí ya llega
            // agregado correctamente (COUNT(DISTINCT ...) real), como
            // llegaría de MariaDB.
            { email: "a@example.com", data: { id: "w1", type: "long" }, likes_count: 3, liked_by_me: 1, comments_count: 2 },
            { email: "b@example.com", data: { id: "w2", type: "long" }, likes_count: 0, liked_by_me: 0, comments_count: 0 }
        ]]);

        const { getCommunityEntrenos } = await import("./community.js");
        const res = mockRes();

        await getCommunityEntrenos({ userId: 1 }, res);

        const { entrenos } = res.json.mock.calls[0][0];

        expect(entrenos[0].commentsCount).toBe(2);
        expect(entrenos[1].commentsCount).toBe(0);

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

describe("POST /api/community/entrenos/:id/like -- dar like a CUALQUIER entreno", () => {

    afterEach(() => {
        executeMock.mockReset();
    });

    it("inserta el like real (workout_id + user_id de quien pregunta) y devuelve el conteo actualizado", async () => {

        executeMock
            .mockResolvedValueOnce([{}]) // INSERT
            .mockResolvedValueOnce([[{ total: 1 }]]); // COUNT tras el insert

        const { likeEntreno } = await import("./community.js");
        const req = { params: { id: "w1" }, userId: 5 };
        const res = mockRes();

        await likeEntreno(req, res);

        expect(executeMock).toHaveBeenNthCalledWith(1, expect.stringContaining("INSERT INTO workout_likes"), ["w1", 5]);
        expect(res.json).toHaveBeenCalledWith({ liked: true, likesCount: 1 });

    });

    it("un segundo like del MISMO usuario al MISMO entreno no rompe -- la restricción real es el UNIQUE de la base de datos (ER_DUP_ENTRY), tratado como éxito idempotente", async () => {

        const dupError = new Error("Duplicate entry");
        dupError.code = "ER_DUP_ENTRY";

        executeMock
            .mockRejectedValueOnce(dupError) // INSERT choca con el UNIQUE real
            .mockResolvedValueOnce([[{ total: 1 }]]); // el like ya existía, sigue siendo 1

        const { likeEntreno } = await import("./community.js");
        const req = { params: { id: "w1" }, userId: 5 };
        const res = mockRes();

        await expect(likeEntreno(req, res)).resolves.not.toThrow();
        expect(res.json).toHaveBeenCalledWith({ liked: true, likesCount: 1 });

    });

    it("un error real de base de datos (no ER_DUP_ENTRY) sí se propaga, no se traga en silencio", async () => {

        const realError = new Error("connection lost");
        executeMock.mockRejectedValueOnce(realError);

        const { likeEntreno } = await import("./community.js");
        const req = { params: { id: "w1" }, userId: 5 };
        const res = mockRes();

        await expect(likeEntreno(req, res)).rejects.toThrow("connection lost");

    });

});

describe("DELETE /api/community/entrenos/:id/like -- quitar el like propio", () => {

    afterEach(() => {
        executeMock.mockReset();
    });

    it("borra solo el like de quien pregunta (workout_id + su propio user_id) y devuelve el conteo actualizado", async () => {

        executeMock
            .mockResolvedValueOnce([{}]) // DELETE
            .mockResolvedValueOnce([[{ total: 2 }]]); // otros 2 usuarios seguían con like

        const { unlikeEntreno } = await import("./community.js");
        const req = { params: { id: "w1" }, userId: 5 };
        const res = mockRes();

        await unlikeEntreno(req, res);

        expect(executeMock).toHaveBeenNthCalledWith(1, expect.stringContaining("DELETE FROM workout_likes"), ["w1", 5]);
        expect(res.json).toHaveBeenCalledWith({ liked: false, likesCount: 2 });

    });

    it("quitar un like que ya no existía no rompe -- DELETE es idempotente por definición", async () => {

        executeMock
            .mockResolvedValueOnce([{ affectedRows: 0 }])
            .mockResolvedValueOnce([[{ total: 0 }]]);

        const { unlikeEntreno } = await import("./community.js");
        const req = { params: { id: "w1" }, userId: 5 };
        const res = mockRes();

        await expect(unlikeEntreno(req, res)).resolves.not.toThrow();
        expect(res.json).toHaveBeenCalledWith({ liked: false, likesCount: 0 });

    });

});

describe("POST /api/community/entrenos/:id/comments -- comentar CUALQUIER entreno", () => {

    afterEach(() => {
        executeMock.mockReset();
    });

    it("guarda el comentario real y devuelve el creado, con isMine siempre true (lo acabas de escribir tú)", async () => {

        executeMock
            .mockResolvedValueOnce([{ insertId: 42 }]) // INSERT
            .mockResolvedValueOnce([[ // SELECT del comentario recién creado
                { id: 42, text: "Menudo ritmazo!", created_at: "2026-09-22T10:00:00.000Z", email: "ana@example.com", alias_publico: "Ana" }
            ]]);

        const { postComunidadComment } = await import("./community.js");
        const req = { params: { id: "w1" }, userId: 5, body: { text: "  Menudo ritmazo!  " } };
        const res = mockRes();

        await postComunidadComment(req, res);

        expect(executeMock).toHaveBeenNthCalledWith(1, expect.stringContaining("INSERT INTO workout_comments"), ["w1", 5, "Menudo ritmazo!"]);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            id: 42,
            alias: "Ana",
            text: "Menudo ritmazo!",
            createdAt: "2026-09-22T10:00:00.000Z",
            isMine: true
        });

    });

    it("recorta espacios (trim) antes de guardar y de comprobar si está vacío", async () => {

        const { postComunidadComment } = await import("./community.js");
        const req = { params: { id: "w1" }, userId: 5, body: { text: "   " } };
        const res = mockRes();

        await postComunidadComment(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(executeMock).not.toHaveBeenCalled();

    });

    it("un texto vacío (o sin campo text) devuelve 400 con un mensaje claro, no un 500", async () => {

        const { postComunidadComment } = await import("./community.js");
        const res = mockRes();

        await postComunidadComment({ params: { id: "w1" }, userId: 5, body: {} }, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: expect.any(String) });

    });

    it("un texto por encima de 500 caracteres devuelve 400, no se guarda", async () => {

        const { postComunidadComment } = await import("./community.js");
        const req = { params: { id: "w1" }, userId: 5, body: { text: "a".repeat(501) } };
        const res = mockRes();

        await postComunidadComment(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(executeMock).not.toHaveBeenCalled();

    });

    it("un texto de exactamente 500 caracteres sí se acepta (el límite es inclusive)", async () => {

        executeMock
            .mockResolvedValueOnce([{ insertId: 1 }])
            .mockResolvedValueOnce([[{ id: 1, text: "a".repeat(500), created_at: "2026-09-22T10:00:00.000Z", email: "a@example.com", alias_publico: null }]]);

        const { postComunidadComment } = await import("./community.js");
        const req = { params: { id: "w1" }, userId: 5, body: { text: "a".repeat(500) } };
        const res = mockRes();

        await postComunidadComment(req, res);

        expect(res.status).toHaveBeenCalledWith(201);

    });

});

describe("GET /api/community/entrenos/:id/comments -- lista de comentarios de UN entreno", () => {

    afterEach(() => {
        executeMock.mockReset();
    });

    it("devuelve alias/texto/fecha de cada comentario, en orden cronológico ascendente", async () => {

        executeMock.mockResolvedValue([[
            { id: 1, text: "Primero", created_at: "2026-09-20T10:00:00.000Z", email: "ana@example.com", alias_publico: "Ana", is_mine: 0 },
            { id: 2, text: "Segundo", created_at: "2026-09-21T10:00:00.000Z", email: "rafasanrom10@icloud.com", alias_publico: null, is_mine: 1 }
        ]]);

        const { getComunidadComments } = await import("./community.js");
        const req = { params: { id: "w1" }, userId: 5 };
        const res = mockRes();

        await getComunidadComments(req, res);

        expect(res.json).toHaveBeenCalledWith({
            comments: [
                { id: 1, alias: "Ana", text: "Primero", createdAt: "2026-09-20T10:00:00.000Z", isMine: false },
                { id: 2, alias: "rafasanrom10", text: "Segundo", createdAt: "2026-09-21T10:00:00.000Z", isMine: true }
            ]
        });

        // ORDER BY cronológico ascendente -- el más antiguo primero (a
        // diferencia de la lista de entrenos, que es descendente).
        expect(executeMock).toHaveBeenCalledWith(expect.stringMatching(/ORDER BY wc\.created_at ASC/), [5, "w1"]);

    });

    it("un entreno sin comentarios devuelve una lista vacía, no un error", async () => {

        executeMock.mockResolvedValue([[]]);

        const { getComunidadComments } = await import("./community.js");
        const res = mockRes();

        await expect(getComunidadComments({ params: { id: "w1" }, userId: 5 }, res)).resolves.not.toThrow();
        expect(res.json).toHaveBeenCalledWith({ comments: [] });

    });

    it("nunca incluye email ni password -- misma disciplina que el resto de esta ruta", async () => {

        executeMock.mockResolvedValue([[
            { id: 1, text: "hola", created_at: "2026-09-20T10:00:00.000Z", email: "rafasanrom10@icloud.com", alias_publico: null, is_mine: 0 }
        ]]);

        const { getComunidadComments } = await import("./community.js");
        const res = mockRes();

        await getComunidadComments({ params: { id: "w1" }, userId: 999 }, res);

        const serialized = JSON.stringify(res.json.mock.calls[0][0]);
        expect(serialized).not.toContain("icloud.com");
        expect(serialized.toLowerCase()).not.toContain("password");

    });

});

describe("DELETE /api/community/entrenos/:id/comments/:commentId -- SOLO el autor puede borrar el suyo", () => {

    afterEach(() => {
        executeMock.mockReset();
    });

    it("el autor real borra su propio comentario", async () => {

        executeMock
            .mockResolvedValueOnce([[{ user_id: 5 }]]) // SELECT de comprobación
            .mockResolvedValueOnce([{}]); // DELETE

        const { deleteComunidadComment } = await import("./community.js");
        const req = { params: { id: "w1", commentId: "42" }, userId: 5 };
        const res = mockRes();

        await deleteComunidadComment(req, res);

        expect(executeMock).toHaveBeenNthCalledWith(2, expect.stringContaining("DELETE FROM workout_comments"), ["42"]);
        expect(res.json).toHaveBeenCalledWith({ deleted: true });

    });

    it("OTRO usuario (ni siquiera el dueño del entreno) NO puede borrar un comentario ajeno -- 403, nunca lo borra", async () => {

        executeMock.mockResolvedValueOnce([[{ user_id: 5 }]]); // el comentario es de user_id 5

        const { deleteComunidadComment } = await import("./community.js");
        const req = { params: { id: "w1", commentId: "42" }, userId: 999 }; // pregunta otro usuario distinto
        const res = mockRes();

        await deleteComunidadComment(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(executeMock).toHaveBeenCalledTimes(1); // nunca llega a ejecutar el DELETE

    });

    it("un comentario que ya no existe devuelve 404, no un 500 ni un falso 403", async () => {

        executeMock.mockResolvedValueOnce([[]]); // SELECT no encuentra nada

        const { deleteComunidadComment } = await import("./community.js");
        const req = { params: { id: "w1", commentId: "no-existe" }, userId: 5 };
        const res = mockRes();

        await deleteComunidadComment(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(executeMock).toHaveBeenCalledTimes(1);

    });

});
