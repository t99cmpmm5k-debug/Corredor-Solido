import { describe, it, expect, vi, beforeEach } from "vitest";

const getEntrenosComunidadMock = vi.fn();
const rerenderMock = vi.fn();

vi.mock("../../data/communityApi.js", () => ({
    getEntrenosComunidad: (...args) => getEntrenosComunidadMock(...args)
}));

vi.mock("../../data/authStore.js", () => ({
    getToken: () => "token-real"
}));

vi.mock("../../core/router.js", () => ({
    rerender: (...args) => rerenderMock(...args)
}));

// vi.resetModules() + reimport en cada test -- mismo motivo que
// profileStore.test.js: activeTab/entrenosState viven a nivel de módulo.
describe("comunidadStore", () => {

    beforeEach(() => {
        vi.resetModules();
        getEntrenosComunidadMock.mockReset();
        rerenderMock.mockReset();
    });

    it("arranca en la tab Mapas", async () => {

        const { getComunidadTab } = await import("./comunidadStore.js");
        expect(getComunidadTab()).toBe("mapas");

    });

    it("setComunidadTab ignora un valor que no sea una tab real", async () => {

        const { setComunidadTab, getComunidadTab } = await import("./comunidadStore.js");

        setComunidadTab("clasificacion");
        expect(getComunidadTab()).toBe("mapas");

        setComunidadTab("ranking");
        expect(getComunidadTab()).toBe("ranking");

    });

    it("acepta actividad -- ya visible en el selector, aunque su contenido siga siendo Próximamente", async () => {

        const { setComunidadTab, getComunidadTab } = await import("./comunidadStore.js");

        setComunidadTab("actividad");
        expect(getComunidadTab()).toBe("actividad");

    });

    it("resetComunidadView vuelve a Mapas sin tocar los datos ya cargados", async () => {

        getEntrenosComunidadMock.mockResolvedValue({ entrenos: [{ alias: "Rafa" }] });

        const { setComunidadTab, resetComunidadView, getComunidadTab, loadComunidadEntrenos, getComunidadEntrenos } = await import("./comunidadStore.js");

        loadComunidadEntrenos();
        await vi.waitFor(() => expect(getComunidadEntrenos().status).toBe("ready"));

        setComunidadTab("ranking");
        resetComunidadView();

        expect(getComunidadTab()).toBe("mapas");
        expect(getComunidadEntrenos().status).toBe("ready");

    });

    it("loadComunidadEntrenos carga la lista real y pasa a status ready", async () => {

        const entrenos = [{ alias: "Rafa", routeTrace: [{ lat: 1, lon: 1 }, { lat: 2, lon: 2 }] }];
        getEntrenosComunidadMock.mockResolvedValue({ entrenos });

        const { loadComunidadEntrenos, getComunidadEntrenos } = await import("./comunidadStore.js");

        loadComunidadEntrenos();
        expect(getComunidadEntrenos().status).toBe("loading");

        await vi.waitFor(() => expect(getComunidadEntrenos().status).toBe("ready"));

        expect(getComunidadEntrenos()).toEqual({ status: "ready", entrenos });
        expect(rerenderMock).toHaveBeenCalled();

    });

    it("es idempotente -- llamarla dos veces seguidas no dispara una segunda petición", async () => {

        getEntrenosComunidadMock.mockResolvedValue({ entrenos: [] });

        const { loadComunidadEntrenos } = await import("./comunidadStore.js");

        loadComunidadEntrenos();
        loadComunidadEntrenos();

        expect(getEntrenosComunidadMock).toHaveBeenCalledTimes(1);

    });

    it("si falla (sin red, error del servidor...), pasa a unavailable sin romper nada", async () => {

        getEntrenosComunidadMock.mockRejectedValue(new Error("network down"));

        const { loadComunidadEntrenos, getComunidadEntrenos } = await import("./comunidadStore.js");

        loadComunidadEntrenos();
        await vi.waitFor(() => expect(getComunidadEntrenos().status).toBe("unavailable"));

        expect(getComunidadEntrenos()).toEqual({ status: "unavailable", entrenos: [] });

    });

    it("retryComunidadEntrenos vuelve a idle para permitir una petición real nueva", async () => {

        getEntrenosComunidadMock.mockRejectedValueOnce(new Error("network down"));
        getEntrenosComunidadMock.mockResolvedValueOnce({ entrenos: [] });

        const { loadComunidadEntrenos, retryComunidadEntrenos, getComunidadEntrenos } = await import("./comunidadStore.js");

        loadComunidadEntrenos();
        await vi.waitFor(() => expect(getComunidadEntrenos().status).toBe("unavailable"));

        retryComunidadEntrenos();
        expect(getComunidadEntrenos().status).toBe("idle");

        loadComunidadEntrenos();
        await vi.waitFor(() => expect(getComunidadEntrenos().status).toBe("ready"));

        expect(getEntrenosComunidadMock).toHaveBeenCalledTimes(2);

    });

});
