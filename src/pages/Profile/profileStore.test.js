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

// vi.resetModules() + reimport en cada test -- myAlias vive en estado a
// nivel de módulo (mismo motivo que reverseGeocode.js/currentWeatherStore.js
// en sesiones anteriores), con módulo fresco cada vez cada test arranca
// desde "idle" de verdad.
describe("profileStore -- alias público (Comunidad)", () => {

    beforeEach(() => {
        vi.resetModules();
        getPerfilMock.mockReset();
        rerenderMock.mockReset();
        loggedIn = true;
    });

    it("sin sesión iniciada, no llama a la API -- no hay nada que pedir sin cuenta", async () => {

        loggedIn = false;

        const { loadMyAlias, getMyAlias } = await import("./profileStore.js");

        loadMyAlias();

        expect(getPerfilMock).not.toHaveBeenCalled();
        expect(getMyAlias().status).toBe("idle");

    });

    it("con sesión, carga el alias real y pasa a status ready", async () => {

        getPerfilMock.mockResolvedValue({ aliasPublico: "Rafa" });

        const { loadMyAlias, getMyAlias } = await import("./profileStore.js");

        loadMyAlias();
        expect(getMyAlias().status).toBe("loading");

        await vi.waitFor(() => expect(getMyAlias().status).toBe("ready"));

        expect(getMyAlias()).toEqual({ status: "ready", value: "Rafa" });
        expect(rerenderMock).toHaveBeenCalled();

    });

    it("es idempotente -- llamar dos veces seguidas no dispara una segunda petición", async () => {

        getPerfilMock.mockResolvedValue({ aliasPublico: "Rafa" });

        const { loadMyAlias } = await import("./profileStore.js");

        loadMyAlias();
        loadMyAlias();

        expect(getPerfilMock).toHaveBeenCalledTimes(1);

    });

    it("si falla la petición (sin red, error del servidor...), pasa a unavailable -- nunca deja loading colgado ni rompe nada", async () => {

        getPerfilMock.mockRejectedValue(new Error("network down"));

        const { loadMyAlias, getMyAlias } = await import("./profileStore.js");

        loadMyAlias();
        await vi.waitFor(() => expect(getMyAlias().status).toBe("unavailable"));

        expect(getMyAlias()).toEqual({ status: "unavailable", value: null });

    });

    it("setMyAlias() refleja de inmediato el alias recién guardado, sin esperar a una nueva petición GET", async () => {

        const { setMyAlias, getMyAlias } = await import("./profileStore.js");

        setMyAlias("Rafa Runner");

        expect(getMyAlias()).toEqual({ status: "ready", value: "Rafa Runner" });

    });

});
