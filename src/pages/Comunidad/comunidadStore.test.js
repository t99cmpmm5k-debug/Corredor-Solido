import { describe, it, expect, vi, beforeEach } from "vitest";

const getEntrenosComunidadMock = vi.fn();
const getEntrenoComunidadDetailMock = vi.fn();
const likeComunidadEntrenoMock = vi.fn();
const unlikeComunidadEntrenoMock = vi.fn();
const postComunidadCommentMock = vi.fn();
const getComunidadEntrenoCommentsMock = vi.fn();
const deleteComunidadCommentMock = vi.fn();
const getMyAliasMock = vi.fn();
const rerenderMock = vi.fn();

vi.mock("../../data/communityApi.js", () => ({
    getEntrenosComunidad: (...args) => getEntrenosComunidadMock(...args),
    getEntrenoComunidadDetail: (...args) => getEntrenoComunidadDetailMock(...args),
    likeComunidadEntreno: (...args) => likeComunidadEntrenoMock(...args),
    unlikeComunidadEntreno: (...args) => unlikeComunidadEntrenoMock(...args),
    postComunidadComment: (...args) => postComunidadCommentMock(...args),
    getComunidadEntrenoComments: (...args) => getComunidadEntrenoCommentsMock(...args),
    deleteComunidadComment: (...args) => deleteComunidadCommentMock(...args)
}));

vi.mock("../../data/authStore.js", () => ({
    getToken: () => "token-real"
}));

vi.mock("../Profile/profileStore.js", () => ({
    getMyAlias: () => getMyAliasMock()
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
        getComunidadEntrenoCommentsMock.mockReset().mockResolvedValue({ comments: [] });
        rerenderMock.mockReset();
    });

    it("empieza closed, sin error", async () => {

        const { getComunidadRouteDetail, getComunidadRouteDetailError } = await import("./comunidadStore.js");

        expect(getComunidadRouteDetail()).toEqual({ status: "closed" });
        expect(getComunidadRouteDetailError()).toBeNull();

    });

    it("openComunidadRouteDetail pasa a loading con el alias, luego a ready con el detalle real (y encadena la carga de comentarios)", async () => {

        const detail = { alias: "Rafa", id: "w1", splits: [] };
        getEntrenoComunidadDetailMock.mockResolvedValue(detail);

        const { openComunidadRouteDetail, getComunidadRouteDetail } = await import("./comunidadStore.js");

        openComunidadRouteDetail({ id: "w1", alias: "Rafa" });
        expect(getComunidadRouteDetail()).toEqual({ status: "loading", alias: "Rafa" });

        await vi.waitFor(() => expect(getComunidadRouteDetail().status).toBe("ready"));
        await vi.waitFor(() => expect(getComunidadRouteDetail().comments?.status).toBe("ready"));

        expect(getComunidadRouteDetail()).toEqual({
            status: "ready", alias: "Rafa", detail,
            comments: { status: "ready", items: [] },
            commentsPanelExpanded: false
        });
        expect(getEntrenoComunidadDetailMock).toHaveBeenCalledWith("w1", "token-real");
        expect(getComunidadEntrenoCommentsMock).toHaveBeenCalledWith("w1", "token-real");

    });

    it("closeComunidadRouteDetail vuelve a closed", async () => {

        getEntrenoComunidadDetailMock.mockResolvedValue({ alias: "Rafa", id: "w1", splits: [] });

        const { openComunidadRouteDetail, closeComunidadRouteDetail, getComunidadRouteDetail } = await import("./comunidadStore.js");

        openComunidadRouteDetail({ id: "w1", alias: "Rafa" });
        await vi.waitFor(() => expect(getComunidadRouteDetail().status).toBe("ready"));

        closeComunidadRouteDetail();
        expect(getComunidadRouteDetail()).toEqual({ status: "closed" });

    });

    it("si falla SOLO la carga de comentarios, el detalle/mapa se queda abierto -- comments pasa a unavailable", async () => {

        getEntrenoComunidadDetailMock.mockResolvedValue({ alias: "Rafa", id: "w1", splits: [] });
        getComunidadEntrenoCommentsMock.mockRejectedValue(new Error("network down"));

        const { openComunidadRouteDetail, getComunidadRouteDetail } = await import("./comunidadStore.js");

        openComunidadRouteDetail({ id: "w1", alias: "Rafa" });

        await vi.waitFor(() => expect(getComunidadRouteDetail().comments?.status).toBe("unavailable"));

        expect(getComunidadRouteDetail().status).toBe("ready");

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

describe("comunidadStore -- comentarios del detalle (Fase 3c, update optimista)", () => {

    beforeEach(() => {
        vi.resetModules();
        getEntrenosComunidadMock.mockReset();
        getEntrenoComunidadDetailMock.mockReset();
        getComunidadEntrenoCommentsMock.mockReset();
        postComunidadCommentMock.mockReset();
        deleteComunidadCommentMock.mockReset();
        getMyAliasMock.mockReset().mockReturnValue({ status: "ready", value: "Rafa" });
        rerenderMock.mockReset();
    });

    async function withOpenDetail(initialComments = []) {

        const store = await import("./comunidadStore.js");

        getEntrenosComunidadMock.mockResolvedValue({ entrenos: [{ id: "w1", alias: "Ana", commentsCount: initialComments.length }] });
        store.loadComunidadEntrenos();
        await vi.waitFor(() => expect(store.getComunidadEntrenos().status).toBe("ready"));

        getEntrenoComunidadDetailMock.mockResolvedValue({ id: "w1", alias: "Ana", splits: [] });
        getComunidadEntrenoCommentsMock.mockResolvedValue({ comments: initialComments });

        store.openComunidadRouteDetail({ id: "w1", alias: "Ana" });
        await vi.waitFor(() => expect(store.getComunidadDetailComments().status).toBe("ready"));

        return store;

    }

    it("toggleComunidadCommentsPanel arranca colapsado y alterna", async () => {

        const store = await withOpenDetail();

        expect(store.getComunidadCommentsPanelExpanded()).toBe(false);

        store.toggleComunidadCommentsPanel();
        expect(store.getComunidadCommentsPanelExpanded()).toBe(true);

        store.toggleComunidadCommentsPanel();
        expect(store.getComunidadCommentsPanelExpanded()).toBe(false);

    });

    it("publicar un comentario lo añade al instante (optimista), con isMine true y mi alias", async () => {

        const store = await withOpenDetail();

        let resolveRequest;
        postComunidadCommentMock.mockReturnValue(new Promise(resolve => { resolveRequest = resolve; }));

        store.submitComunidadComment("Menudo ritmo!");

        const { items } = store.getComunidadDetailComments();
        expect(items).toHaveLength(1);
        expect(items[0]).toMatchObject({ alias: "Rafa", text: "Menudo ritmo!", isMine: true, pending: true });

        resolveRequest({ id: 99, alias: "Rafa", text: "Menudo ritmo!", createdAt: "2026-09-22T10:00:00.000Z", isMine: true });

    });

    it("recorta espacios y no publica un comentario vacío", async () => {

        const store = await withOpenDetail();

        store.submitComunidadComment("    ");

        expect(store.getComunidadDetailComments().items).toHaveLength(0);
        expect(postComunidadCommentMock).not.toHaveBeenCalled();

    });

    it("al confirmar el servidor, sustituye el comentario optimista por el real (mismo id que el servidor)", async () => {

        const store = await withOpenDetail();

        postComunidadCommentMock.mockResolvedValue({ id: 99, alias: "Rafa", text: "Menudo ritmo!", createdAt: "2026-09-22T10:00:00.000Z", isMine: true });

        store.submitComunidadComment("Menudo ritmo!");

        await vi.waitFor(() => {
            const { items } = store.getComunidadDetailComments();
            expect(items).toEqual([{ id: 99, alias: "Rafa", text: "Menudo ritmo!", createdAt: "2026-09-22T10:00:00.000Z", isMine: true }]);
        });

    });

    it("publicar un comentario también sube commentsCount en la tarjeta del feed", async () => {

        const store = await withOpenDetail();

        postComunidadCommentMock.mockResolvedValue({ id: 99, alias: "Rafa", text: "hola", createdAt: "2026-09-22T10:00:00.000Z", isMine: true });

        store.submitComunidadComment("hola");

        const [entreno] = store.getComunidadEntrenos().entrenos;
        expect(entreno.commentsCount).toBe(1);

    });

    it("si publicar falla, retira el comentario optimista y revierte commentsCount en la tarjeta", async () => {

        const store = await withOpenDetail();

        postComunidadCommentMock.mockRejectedValue(new Error("network down"));

        store.submitComunidadComment("hola");

        await vi.waitFor(() => expect(store.getComunidadDetailComments().items).toHaveLength(0));

        const [entreno] = store.getComunidadEntrenos().entrenos;
        expect(entreno.commentsCount).toBe(0);

    });

    it("borrar un comentario propio lo quita al instante y baja commentsCount en la tarjeta", async () => {

        const store = await withOpenDetail([{ id: 1, alias: "Rafa", text: "mío", createdAt: "2026-09-20T10:00:00.000Z", isMine: true }]);

        deleteComunidadCommentMock.mockResolvedValue({ deleted: true });

        store.deleteComunidadCommentEntry(1);

        expect(store.getComunidadDetailComments().items).toHaveLength(0);

        const [entreno] = store.getComunidadEntrenos().entrenos;
        expect(entreno.commentsCount).toBe(0);

        await vi.waitFor(() => expect(deleteComunidadCommentMock).toHaveBeenCalledWith("w1", 1, "token-real"));

    });

    it("si borrar falla, el comentario vuelve a aparecer y commentsCount se revierte", async () => {

        const initial = [{ id: 1, alias: "Rafa", text: "mío", createdAt: "2026-09-20T10:00:00.000Z", isMine: true }];
        const store = await withOpenDetail(initial);

        deleteComunidadCommentMock.mockRejectedValue(new Error("network down"));

        store.deleteComunidadCommentEntry(1);
        expect(store.getComunidadDetailComments().items).toHaveLength(0);

        await vi.waitFor(() => expect(store.getComunidadDetailComments().items).toEqual(initial));

        const [entreno] = store.getComunidadEntrenos().entrenos;
        expect(entreno.commentsCount).toBe(1);

    });

    it("borrar un id que no está en la lista no rompe nada", async () => {

        const store = await withOpenDetail();

        expect(() => store.deleteComunidadCommentEntry(999)).not.toThrow();
        expect(deleteComunidadCommentMock).not.toHaveBeenCalled();

    });

});
