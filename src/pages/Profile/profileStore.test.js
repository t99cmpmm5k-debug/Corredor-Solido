import { describe, it, expect, vi, beforeEach } from "vitest";

const getPerfilMock = vi.fn();
const rerenderMock = vi.fn();
let loggedIn = true;

vi.mock("../../data/authApi.js", () => ({
    getPerfil: (...args) => getPerfilMock(...args)
}));

vi.mock("../../data/authStore.js", () => ({
    getToken: () => "token-real",
    isLoggedIn: () => loggedIn
}));

vi.mock("../../core/router.js", () => ({
    rerender: (...args) => rerenderMock(...args)
}));

// vi.resetModules() + reimport en cada test -- myProfile vive en estado a
// nivel de módulo (mismo motivo que reverseGeocode.js/currentWeatherStore.js
// en sesiones anteriores), con módulo fresco cada vez cada test arranca
// desde "idle" de verdad.
describe("profileStore -- perfil real (alias público + localidad + fecha de creación)", () => {

    beforeEach(() => {
        vi.resetModules();
        getPerfilMock.mockReset();
        rerenderMock.mockReset();
        loggedIn = true;
    });

    it("sin sesión iniciada, no llama a la API -- no hay nada que pedir sin cuenta", async () => {

        loggedIn = false;

        const { loadMyProfile, getMyProfile } = await import("./profileStore.js");

        loadMyProfile();

        expect(getPerfilMock).not.toHaveBeenCalled();
        expect(getMyProfile().status).toBe("idle");

    });

    it("con sesión, carga el perfil real (alias + localidad + fecha) y pasa a status ready", async () => {

        getPerfilMock.mockResolvedValue({ aliasPublico: "Rafa", localidad: "Murcia", createdAt: "2026-01-15T10:00:00.000Z" });

        const { loadMyProfile, getMyProfile } = await import("./profileStore.js");

        loadMyProfile();
        expect(getMyProfile().status).toBe("loading");

        await vi.waitFor(() => expect(getMyProfile().status).toBe("ready"));

        expect(getMyProfile()).toEqual({ status: "ready", aliasPublico: "Rafa", localidad: "Murcia", createdAt: "2026-01-15T10:00:00.000Z" });
        expect(rerenderMock).toHaveBeenCalled();

    });

    it("sin alias/localidad todavía, quedan null explícito -- nunca un valor inventado", async () => {

        getPerfilMock.mockResolvedValue({ aliasPublico: null, localidad: null, createdAt: "2026-01-15T10:00:00.000Z" });

        const { loadMyProfile, getMyProfile } = await import("./profileStore.js");

        loadMyProfile();
        await vi.waitFor(() => expect(getMyProfile().status).toBe("ready"));

        expect(getMyProfile().aliasPublico).toBeNull();
        expect(getMyProfile().localidad).toBeNull();

    });

    it("es idempotente -- llamar dos veces seguidas no dispara una segunda petición", async () => {

        getPerfilMock.mockResolvedValue({ aliasPublico: "Rafa", localidad: null, createdAt: "2026-01-15T10:00:00.000Z" });

        const { loadMyProfile } = await import("./profileStore.js");

        loadMyProfile();
        loadMyProfile();

        expect(getPerfilMock).toHaveBeenCalledTimes(1);

    });

    it("si falla la petición (sin red, error del servidor...), pasa a unavailable -- nunca deja loading colgado ni rompe nada", async () => {

        getPerfilMock.mockRejectedValue(new Error("network down"));

        const { loadMyProfile, getMyProfile } = await import("./profileStore.js");

        loadMyProfile();
        await vi.waitFor(() => expect(getMyProfile().status).toBe("unavailable"));

        expect(getMyProfile().aliasPublico).toBeNull();
        expect(getMyProfile().localidad).toBeNull();

    });

    it("setMyProfile() refleja de inmediato lo que el servidor acaba de confirmar, sin esperar a una nueva petición GET", async () => {

        const { setMyProfile, getMyProfile } = await import("./profileStore.js");

        setMyProfile({ aliasPublico: "Rafa Runner" });

        expect(getMyProfile()).toEqual({ status: "ready", aliasPublico: "Rafa Runner", localidad: null, createdAt: null });

    });

    // Un PATCH solo de localidad (ver actualizarPerfil en authApi.js) no
    // trae aliasPublico en su respuesta -- setMyProfile() tiene que
    // conservar el que ya hubiera, nunca borrarlo por un merge incompleto.
    it("setMyProfile() con un campo suelto conserva los demás ya cargados (merge, no reemplazo)", async () => {

        const { setMyProfile, getMyProfile } = await import("./profileStore.js");

        setMyProfile({ aliasPublico: "Rafa", localidad: "Murcia", createdAt: "2026-01-15T10:00:00.000Z" });
        setMyProfile({ localidad: "Cartagena" });

        expect(getMyProfile()).toEqual({ status: "ready", aliasPublico: "Rafa", localidad: "Cartagena", createdAt: "2026-01-15T10:00:00.000Z" });

    });

});

describe("profileStore -- formulario 'Editar perfil' del hero", () => {

    beforeEach(() => {
        vi.resetModules();
    });

    it("empieza cerrado", async () => {

        const { isEditOpen } = await import("./profileStore.js");
        expect(isEditOpen()).toBe(false);

    });

    it("setEditOpen(true)/(false) lo abre y lo cierra", async () => {

        const { isEditOpen, setEditOpen } = await import("./profileStore.js");

        setEditOpen(true);
        expect(isEditOpen()).toBe(true);

        setEditOpen(false);
        expect(isEditOpen()).toBe(false);

    });

    it("al abrirlo se limpia cualquier error de un intento anterior", async () => {

        const { setEditOpen, setEditError, getEditError } = await import("./profileStore.js");

        setEditError("Alias no válido.");
        setEditOpen(true);

        expect(getEditError()).toBeNull();

    });

});

describe("profileStore -- pantalla secundaria 'Ajustes'", () => {

    beforeEach(() => {
        vi.resetModules();
    });

    it("empieza en 'idle' (pantalla principal)", async () => {

        const { getProfileStep } = await import("./profileStore.js");
        expect(getProfileStep()).toBe("idle");

    });

    it("setProfileStep() cambia el paso", async () => {

        const { getProfileStep, setProfileStep } = await import("./profileStore.js");

        setProfileStep("settings");
        expect(getProfileStep()).toBe("settings");

    });

});
