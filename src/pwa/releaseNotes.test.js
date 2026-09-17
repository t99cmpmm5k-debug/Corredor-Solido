import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// BUILD_ID en vitest siempre es "dev" (ver buildInfo.js -- __BUILD_ID__ solo
// existe tras pasar por vite.config.js define) -- se mockea para poder
// probar la rama real que sí llama a la API de GitHub.
vi.mock("../utils/buildInfo.js", () => ({ BUILD_ID: "abc1234" }));

describe("fetchReleaseNotes() -- resumen automático de commits para el aviso de actualización", () => {

    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("pide el compare entre el BUILD_ID actual y master, y devuelve la primera línea de cada commit, más reciente primero", async () => {

        const commits = [
            { commit: { message: "Running: mapa de ritmo - popup por km\n\nDetalle largo que no interesa" } },
            { commit: { message: "Plan: corrige overflow del selector de días" } }
        ];

        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ commits })
        });
        vi.stubGlobal("fetch", fetchMock);

        const { fetchReleaseNotes } = await import("./releaseNotes.js");
        const notes = await fetchReleaseNotes();

        expect(fetchMock).toHaveBeenCalledWith(
            "https://api.github.com/repos/t99cmpmm5k-debug/Corredor-Solido/compare/abc1234...master"
        );

        // Invertido: GitHub devuelve del más antiguo al más nuevo.
        expect(notes).toEqual([
            "Plan: corrige overflow del selector de días",
            "Running: mapa de ritmo - popup por km"
        ]);

    });

    it("descarta mensajes puramente técnicos (merge/wip/chore/revert)", async () => {

        const commits = [
            { commit: { message: "Merge branch 'main' into feature" } },
            { commit: { message: "chore: bump deps" } },
            { commit: { message: "Running: arregla mapa siempre naranja" } }
        ];

        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ commits })
        }));

        const { fetchReleaseNotes } = await import("./releaseNotes.js");
        const notes = await fetchReleaseNotes();

        expect(notes).toEqual(["Running: arregla mapa siempre naranja"]);

    });

    it("limita a un máximo fijo aunque haya más commits (hoy 50, excepción temporal del despliegue 2026-09-18 -- ver comentario junto a MAX_COMMITS_SHOWN)", async () => {

        const commits = Array.from({ length: 60 }, (_, i) => ({ commit: { message: `Commit real ${i}` } }));

        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ commits })
        }));

        const { fetchReleaseNotes } = await import("./releaseNotes.js");
        const notes = await fetchReleaseNotes();

        expect(notes).toHaveLength(50);

    });

    it("sin red o con la API caída, devuelve un array vacío en vez de lanzar", async () => {

        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

        const { fetchReleaseNotes } = await import("./releaseNotes.js");

        await expect(fetchReleaseNotes()).resolves.toEqual([]);

    });

    it("respuesta HTTP no-ok (p. ej. 404 por un hash que ya no existe en el historial) devuelve vacío", async () => {

        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

        const { fetchReleaseNotes } = await import("./releaseNotes.js");

        await expect(fetchReleaseNotes()).resolves.toEqual([]);

    });

});

describe("fetchReleaseNotes() -- sin BUILD_ID real (entorno de desarrollo/tests)", () => {

    it("con BUILD_ID 'dev', no llama a la red -- no hay ninguna build real que comparar", async () => {

        vi.resetModules();
        vi.doMock("../utils/buildInfo.js", () => ({ BUILD_ID: "dev" }));

        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);

        const { fetchReleaseNotes } = await import("./releaseNotes.js");
        const notes = await fetchReleaseNotes();

        expect(notes).toEqual([]);
        expect(fetchMock).not.toHaveBeenCalled();

        vi.unstubAllGlobals();
        vi.doUnmock("../utils/buildInfo.js");

    });

});
