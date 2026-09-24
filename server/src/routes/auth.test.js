import { describe, it, expect, vi, afterEach } from "vitest";

const executeMock = vi.fn();

vi.mock("../db.js", () => ({
    pool: { execute: (...args) => executeMock(...args) }
}));

function mockRes() {
    const res = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
}

describe("PATCH/GET /api/auth/perfil -- requireAuth sigue siendo obligatorio", () => {

    it("authRouter tiene requireAuth montado en /perfil (GET y PATCH)", async () => {

        const { authRouter } = await import("./auth.js");
        const { requireAuth } = await import("../middleware/requireAuth.js");

        const perfilLayers = authRouter.stack.filter(layer => layer.route?.path === "/perfil");

        expect(perfilLayers).toHaveLength(2); // GET y PATCH, cada uno su propia entrada en el stack

        perfilLayers.forEach(layer => {
            const hasRequireAuth = layer.route.stack.some(routeLayer => routeLayer.handle === requireAuth);
            expect(hasRequireAuth).toBe(true);
        });

    });

});

describe("getPerfil -- devuelve alias, localidad y fecha de creación de la cuenta", () => {

    afterEach(() => {
        executeMock.mockReset();
    });

    it("con alias y localidad ya guardados, los devuelve -- createdAt siempre como ISO string", async () => {

        executeMock.mockResolvedValue([[{ alias_publico: "Rafa", localidad: "Murcia", created_at: new Date("2026-01-15T10:00:00.000Z") }]]);

        const { getPerfil } = await import("./auth.js");
        const res = mockRes();

        await getPerfil({ userId: 7 }, res);

        expect(executeMock).toHaveBeenCalledWith(expect.stringContaining("WHERE id = ?"), [7]);
        expect(res.json).toHaveBeenCalledWith({ aliasPublico: "Rafa", localidad: "Murcia", createdAt: "2026-01-15T10:00:00.000Z" });

    });

    it("sin alias ni localidad todavía (NULL), devuelve null explícito para cada uno -- nunca un valor inventado", async () => {

        executeMock.mockResolvedValue([[{ alias_publico: null, localidad: null, created_at: new Date("2026-01-15T10:00:00.000Z") }]]);

        const { getPerfil } = await import("./auth.js");
        const res = mockRes();

        await getPerfil({ userId: 7 }, res);

        expect(res.json).toHaveBeenCalledWith({ aliasPublico: null, localidad: null, createdAt: "2026-01-15T10:00:00.000Z" });

    });

    // created_at es NOT NULL en el esquema (ver 001_init.sql) -- este caso
    // (fila sin ninguna coincidencia) es defensivo, no se espera en
    // producción con requireAuth ya verificado.
    it("sin fila (caso defensivo), createdAt también null en vez de romper", async () => {

        executeMock.mockResolvedValue([[]]);

        const { getPerfil } = await import("./auth.js");
        const res = mockRes();

        await getPerfil({ userId: 7 }, res);

        expect(res.json).toHaveBeenCalledWith({ aliasPublico: null, localidad: null, createdAt: null });

    });

    // req.userId sale siempre del JWT ya verificado (requireAuth), nunca
    // del cuerpo/query de la petición -- este test confirma que la
    // consulta usa ESE id, así que no hay forma de pedir el perfil de
    // otro usuario aunque se intentara mandar un id distinto en algún
    // otro sitio de la petición.
    it("consulta siempre por req.userId (del JWT), nunca por un id que pudiera venir del cliente", async () => {

        executeMock.mockResolvedValue([[{ alias_publico: "X" }]]);

        const { getPerfil } = await import("./auth.js");
        const res = mockRes();

        await getPerfil({ userId: 42, body: { userId: 999 }, query: { userId: 999 } }, res);

        expect(executeMock).toHaveBeenCalledWith(expect.any(String), [42]);

    });

});

describe("updatePerfil -- un usuario solo puede modificar su propio alias/localidad", () => {

    afterEach(() => {
        executeMock.mockReset();
    });

    it("guarda el alias recortado (trim) para el usuario del JWT (req.userId), nunca para otro id", async () => {

        executeMock.mockResolvedValue([{}]);

        const { updatePerfil } = await import("./auth.js");
        const res = mockRes();

        // userId=5 en el request real (del JWT); el cuerpo NO trae ningún
        // id -- no hay forma de que este endpoint reciba "qué usuario"
        // editar, solo "qué alias poner", y siempre se aplica a quien
        // demuestra su sesión con el token.
        await updatePerfil({ userId: 5, body: { aliasPublico: "  Rafa Runner  " } }, res);

        expect(executeMock).toHaveBeenCalledWith(
            expect.stringContaining("UPDATE users SET alias_publico"),
            ["Rafa Runner", 5]
        );
        expect(res.json).toHaveBeenCalledWith({ aliasPublico: "Rafa Runner" });

    });

    it("rechaza un alias vacío tras trim (400), sin llegar a tocar la base de datos", async () => {

        const { updatePerfil } = await import("./auth.js");
        const res = mockRes();

        await updatePerfil({ userId: 5, body: { aliasPublico: "   " } }, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(executeMock).not.toHaveBeenCalled();

    });

    it("rechaza un alias de un solo carácter (por debajo del mínimo)", async () => {

        const { updatePerfil } = await import("./auth.js");
        const res = mockRes();

        await updatePerfil({ userId: 5, body: { aliasPublico: "A" } }, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(executeMock).not.toHaveBeenCalled();

    });

    it("rechaza un alias de más de 50 caracteres", async () => {

        const { updatePerfil } = await import("./auth.js");
        const res = mockRes();

        await updatePerfil({ userId: 5, body: { aliasPublico: "a".repeat(51) } }, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(executeMock).not.toHaveBeenCalled();

    });

    it("rechaza un cuerpo sin aliasPublico (o de tipo distinto a string)", async () => {

        const { updatePerfil } = await import("./auth.js");
        const res = mockRes();

        await updatePerfil({ userId: 5, body: {} }, res);
        expect(res.status).toHaveBeenCalledWith(400);

        await updatePerfil({ userId: 5, body: { aliasPublico: 12345 } }, res);
        expect(res.status).toHaveBeenCalledWith(400);

    });

    // Localidad (Perfil, rediseño 2026-09-25) -- se actualiza
    // independientemente del alias: un PATCH solo con localidad (p. ej.
    // borrarla sin tocar el alias) tiene que funcionar sin más.
    it("guarda solo la localidad (recortada) sin tocar el alias, si el body no trae aliasPublico", async () => {

        executeMock.mockResolvedValue([{}]);

        const { updatePerfil } = await import("./auth.js");
        const res = mockRes();

        await updatePerfil({ userId: 5, body: { localidad: "  Murcia  " } }, res);

        expect(executeMock).toHaveBeenCalledWith(
            expect.stringMatching(/^UPDATE users SET localidad = \? WHERE id = \?$/),
            ["Murcia", 5]
        );
        expect(res.json).toHaveBeenCalledWith({ localidad: "Murcia" });

    });

    it("guarda alias y localidad juntos en un solo PATCH", async () => {

        executeMock.mockResolvedValue([{}]);

        const { updatePerfil } = await import("./auth.js");
        const res = mockRes();

        await updatePerfil({ userId: 5, body: { aliasPublico: "Rafa", localidad: "Cartagena" } }, res);

        expect(executeMock).toHaveBeenCalledWith(
            expect.stringMatching(/^UPDATE users SET alias_publico = \?, localidad = \? WHERE id = \?$/),
            ["Rafa", "Cartagena", 5]
        );
        expect(res.json).toHaveBeenCalledWith({ aliasPublico: "Rafa", localidad: "Cartagena" });

    });

    // Vaciar la localidad (el usuario borra el campo en Editar perfil y
    // guarda) se guarda como NULL, no como cadena vacía -- "" nunca es un
    // dato real en el resto de la app.
    it("una localidad vacía (tras recortar) se guarda como NULL, no como cadena vacía", async () => {

        executeMock.mockResolvedValue([{}]);

        const { updatePerfil } = await import("./auth.js");
        const res = mockRes();

        await updatePerfil({ userId: 5, body: { localidad: "   " } }, res);

        expect(executeMock).toHaveBeenCalledWith(expect.any(String), [null, 5]);
        expect(res.json).toHaveBeenCalledWith({ localidad: null });

    });

    it("rechaza una localidad de más de 100 caracteres, sin llegar a tocar la base de datos", async () => {

        const { updatePerfil } = await import("./auth.js");
        const res = mockRes();

        await updatePerfil({ userId: 5, body: { localidad: "a".repeat(101) } }, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(executeMock).not.toHaveBeenCalled();

    });

    it("rechaza una localidad de tipo distinto a string", async () => {

        const { updatePerfil } = await import("./auth.js");
        const res = mockRes();

        await updatePerfil({ userId: 5, body: { localidad: 12345 } }, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(executeMock).not.toHaveBeenCalled();

    });

    it("rechaza un cuerpo completamente vacío -- nada que actualizar", async () => {

        const { updatePerfil } = await import("./auth.js");
        const res = mockRes();

        await updatePerfil({ userId: 5, body: {} }, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(executeMock).not.toHaveBeenCalled();

    });

    // Todo o nada: si el alias es inválido, la localidad (aunque válida)
    // tampoco se guarda -- una sola petición, un solo resultado.
    it("si el alias falla su validación, no guarda tampoco la localidad aunque sea válida", async () => {

        const { updatePerfil } = await import("./auth.js");
        const res = mockRes();

        await updatePerfil({ userId: 5, body: { aliasPublico: "A", localidad: "Murcia" } }, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(executeMock).not.toHaveBeenCalled();

    });

});
