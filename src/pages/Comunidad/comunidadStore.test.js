import { describe, it, expect, vi, beforeEach } from "vitest";

const getEntrenosComunidadMock = vi.fn();
const getEntrenoComunidadDetailMock = vi.fn();
const likeComunidadEntrenoMock = vi.fn();
const unlikeComunidadEntrenoMock = vi.fn();
const rerenderMock = vi.fn();

vi.mock("../../data/communityApi.js", () => ({
    getEntrenosComunidad: (...args) => getEntrenosComunidadMock(...args),
    getEntrenoComunidadDetail: (...args) => getEntrenoComunidadDetailMock(...args),
    likeComunidadEntreno: (...args) => likeComunidadEntrenoMock(...args),
    unlikeComunidadEntreno: (...args) => unlikeComunidadEntrenoMock(...args)
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
        getEntrenoComunidadDetailMock.mockReset();
        rerenderMock.mockReset();
    });

    it("arranca en la tab Actividad", async () => {

        const { getComunidadTab } = await import("./comunidadStore.js");
        expect(getComunidadTab()).toBe("actividad");

    });

    it("setComunidadTab ignora un valor que no sea una tab real", async () => {

        const { setComunidadTab, getComunidadTab } = await import("./comunidadStore.js");

        setComunidadTab("clasificacion");
        expect(getComunidadTab()).toBe("actividad");

        setComunidadTab("ranking");
        expect(getComunidadTab()).toBe("ranking");

    });

    it("acepta actividad como tab real", async () => {

        const { setComunidadTab, getComunidadTab } = await import("./comunidadStore.js");

        setComunidadTab("actividad");
        expect(getComunidadTab()).toBe("actividad");

    });

    it("resetComunidadView vuelve a Actividad sin tocar los datos ya cargados", async () => {

        getEntrenosComunidadMock.mockResolvedValue({ entrenos: [{ alias: "Rafa" }] });

        const { setComunidadTab, resetComunidadView, getComunidadTab, loadComunidadEntrenos, getComunidadEntrenos } = await import("./comunidadStore.js");

        loadComunidadEntrenos();
        await vi.waitFor(() => expect(getComunidadEntrenos().status).toBe("ready"));

        setComunidadTab("ranking");
        resetComunidadView();

        expect(getComunidadTab()).toBe("actividad");
        expect(getComunidadEntrenos().status).toBe("ready");

    });

    it("el filtro de tipo de Actividad empieza en \"\" (Todos)", async () => {

        const { getComunidadActivityTypeFilter } = await import("./comunidadStore.js");
        expect(getComunidadActivityTypeFilter()).toBe("");

    });

    it("setComunidadActivityTypeFilter guarda el tipo elegido, y un valor vacío/nulo vuelve a \"Todos\"", async () => {

        const { setComunidadActivityTypeFilter, getComunidadActivityTypeFilter } = await import("./comunidadStore.js");

        setComunidadActivityTypeFilter("long");
        expect(getComunidadActivityTypeFilter()).toBe("long");

        setComunidadActivityTypeFilter("");
        expect(getComunidadActivityTypeFilter()).toBe("");

    });

    it("resetComunidadView también limpia el filtro de Actividad -- nada persiste al salir de Comunidad", async () => {

        const { setComunidadActivityTypeFilter, getComunidadActivityTypeFilter, resetComunidadView } = await import("./comunidadStore.js");

        setComunidadActivityTypeFilter("race");
        resetComunidadView();

        expect(getComunidadActivityTypeFilter()).toBe("");

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

describe("comunidadStore -- detalle de un entreno (mapa fullscreen al pulsar una tarjeta)", () => {

    beforeEach(() => {
        vi.resetModules();
        getEntrenoComunidadDetailMock.mockReset();
        rerenderMock.mockReset();
    });

    it("empieza closed, sin error", async () => {

        const { getComunidadRouteDetail, getComunidadRouteDetailError } = await import("./comunidadStore.js");

        expect(getComunidadRouteDetail()).toEqual({ status: "closed" });
        expect(getComunidadRouteDetailError()).toBeNull();

    });

    it("openComunidadRouteDetail pasa a loading con el alias, luego a ready con el detalle real", async () => {

        const detail = { alias: "Rafa", id: "w1", splits: [] };
        getEntrenoComunidadDetailMock.mockResolvedValue(detail);

        const { openComunidadRouteDetail, getComunidadRouteDetail } = await import("./comunidadStore.js");

        openComunidadRouteDetail({ id: "w1", alias: "Rafa" });
        expect(getComunidadRouteDetail()).toEqual({ status: "loading", alias: "Rafa" });

        await vi.waitFor(() => expect(getComunidadRouteDetail().status).toBe("ready"));

        expect(getComunidadRouteDetail()).toEqual({ status: "ready", alias: "Rafa", detail });
        expect(getEntrenoComunidadDetailMock).toHaveBeenCalledWith("w1", "token-real");

    });

    it("closeComunidadRouteDetail vuelve a closed", async () => {

        getEntrenoComunidadDetailMock.mockResolvedValue({ alias: "Rafa", id: "w1", splits: [] });

        const { openComunidadRouteDetail, closeComunidadRouteDetail, getComunidadRouteDetail } = await import("./comunidadStore.js");

        openComunidadRouteDetail({ id: "w1", alias: "Rafa" });
        await vi.waitFor(() => expect(getComunidadRouteDetail().status).toBe("ready"));

        closeComunidadRouteDetail();
        expect(getComunidadRouteDetail()).toEqual({ status: "closed" });

    });

    it("si falla, vuelve a closed (sin abrir nada) y deja un aviso breve, no un status de error persistente", async () => {

        getEntrenoComunidadDetailMock.mockRejectedValue(new Error("No se encontró ese entreno."));

        const { openComunidadRouteDetail, getComunidadRouteDetail, getComunidadRouteDetailError } = await import("./comunidadStore.js");

        openComunidadRouteDetail({ id: "no-existe", alias: "Rafa" });

        await vi.waitFor(() => expect(getComunidadRouteDetailError()).not.toBeNull());

        expect(getComunidadRouteDetail()).toEqual({ status: "closed" });
        expect(getComunidadRouteDetailError()).toBe("No se encontró ese entreno.");

    });

    it("el aviso de error se limpia solo pasado el timeout", async () => {

        getEntrenoComunidadDetailMock.mockRejectedValue(new Error("network down"));

        const { openComunidadRouteDetail, getComunidadRouteDetailError } = await import("./comunidadStore.js");

        openComunidadRouteDetail({ id: "w1", alias: "Rafa" });
        await vi.waitFor(() => expect(getComunidadRouteDetailError()).not.toBeNull());

        await vi.waitFor(() => expect(getComunidadRouteDetailError()).toBeNull(), { timeout: 4000 });

    }, 6000);

});

describe("comunidadStore -- likes de Actividad (Fase 3b, update optimista)", () => {

    beforeEach(() => {
        vi.resetModules();
        getEntrenosComunidadMock.mockReset();
        likeComunidadEntrenoMock.mockReset();
        unlikeComunidadEntrenoMock.mockReset();
        rerenderMock.mockReset();
    });

    async function withLoadedEntreno(entreno) {

        const store = await import("./comunidadStore.js");

        getEntrenosComunidadMock.mockResolvedValue({ entrenos: [entreno] });
        store.loadComunidadEntrenos();
        await vi.waitFor(() => expect(store.getComunidadEntrenos().status).toBe("ready"));

        return store;

    }

    it("dar like cambia likedByMe/likesCount al instante, antes de que el servidor responda", async () => {

        const { toggleLikeComunidadEntreno, getComunidadEntrenos } = await withLoadedEntreno({ id: "w1", alias: "Rafa", likedByMe: false, likesCount: 2 });

        let resolveRequest;
        likeComunidadEntrenoMock.mockReturnValue(new Promise(resolve => { resolveRequest = resolve; }));

        toggleLikeComunidadEntreno("w1");

        const [entreno] = getComunidadEntrenos().entrenos;
        expect(entreno.likedByMe).toBe(true);
        expect(entreno.likesCount).toBe(3);

        resolveRequest({ liked: true, likesCount: 3 });

    });

    it("quitar like resta 1 en vez de sumar, y llama a unlikeComunidadEntreno (no a like)", async () => {

        const { toggleLikeComunidadEntreno, getComunidadEntrenos } = await withLoadedEntreno({ id: "w1", alias: "Rafa", likedByMe: true, likesCount: 5 });

        unlikeComunidadEntrenoMock.mockResolvedValue({ liked: false, likesCount: 4 });

        toggleLikeComunidadEntreno("w1");

        const [entreno] = getComunidadEntrenos().entrenos;
        expect(entreno.likedByMe).toBe(false);
        expect(entreno.likesCount).toBe(4);

        await vi.waitFor(() => expect(unlikeComunidadEntrenoMock).toHaveBeenCalledWith("w1", "token-real"));
        expect(likeComunidadEntrenoMock).not.toHaveBeenCalled();

    });

    it("al confirmar el servidor, se queda con el likesCount REAL devuelto, no con el +1/-1 local", async () => {

        const { toggleLikeComunidadEntreno, getComunidadEntrenos } = await withLoadedEntreno({ id: "w1", alias: "Rafa", likedByMe: false, likesCount: 2 });

        // El servidor dice 5 (otros 2 usuarios dieron like mientras tanto),
        // no el 3 que habría calculado el optimista local por su cuenta.
        likeComunidadEntrenoMock.mockResolvedValue({ liked: true, likesCount: 5 });

        toggleLikeComunidadEntreno("w1");

        await vi.waitFor(() => expect(getComunidadEntrenos().entrenos[0].likesCount).toBe(5));

    });

    it("si la petición falla, revierte likedByMe/likesCount a como estaban antes", async () => {

        const { toggleLikeComunidadEntreno, getComunidadEntrenos } = await withLoadedEntreno({ id: "w1", alias: "Rafa", likedByMe: false, likesCount: 2 });

        likeComunidadEntrenoMock.mockRejectedValue(new Error("network down"));

        toggleLikeComunidadEntreno("w1");

        await vi.waitFor(() => {
            const [entreno] = getComunidadEntrenos().entrenos;
            expect(entreno.likedByMe).toBe(false);
            expect(entreno.likesCount).toBe(2);
        });

    });

    it("un segundo toggle mientras el primero sigue en marcha no dispara una segunda petición", async () => {

        const { toggleLikeComunidadEntreno } = await withLoadedEntreno({ id: "w1", alias: "Rafa", likedByMe: false, likesCount: 0 });

        likeComunidadEntrenoMock.mockReturnValue(new Promise(() => {})); // nunca resuelve

        toggleLikeComunidadEntreno("w1");
        toggleLikeComunidadEntreno("w1");
        toggleLikeComunidadEntreno("w1");

        expect(likeComunidadEntrenoMock).toHaveBeenCalledTimes(1);

    });

    it("un entrenoId que no existe en la lista no rompe nada", async () => {

        const { toggleLikeComunidadEntreno } = await withLoadedEntreno({ id: "w1", alias: "Rafa", likedByMe: false, likesCount: 0 });

        expect(() => toggleLikeComunidadEntreno("no-existe")).not.toThrow();
        expect(likeComunidadEntrenoMock).not.toHaveBeenCalled();

    });

});
