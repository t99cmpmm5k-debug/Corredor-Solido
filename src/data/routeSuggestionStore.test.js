import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { describe, it, expect, beforeEach, vi } from "vitest";

function resetFakeIndexedDB() {
    globalThis.indexedDB = new IDBFactory();
}

describe("routeSuggestionStore — descartes de sugerencia de recorrido", () => {

    beforeEach(() => {
        resetFakeIndexedDB();
        vi.resetModules();
    });

    it("routeSuggestionPairKey da la misma clave sin importar el orden de los ids", async () => {

        const { routeSuggestionPairKey } = await import("./routeSuggestionStore.js");

        expect(routeSuggestionPairKey("a", "b")).toBe(routeSuggestionPairKey("b", "a"));

    });

    it("un par recién hidratado no está descartado", async () => {

        const { hydrate, isSuggestionDismissed } = await import("./routeSuggestionStore.js");
        await hydrate();

        expect(isSuggestionDismissed("workout-1", "workout-2")).toBe(false);

    });

    it("descartar un par lo marca como descartado en cualquier orden", async () => {

        const { hydrate, dismissRouteSuggestion, isSuggestionDismissed } = await import("./routeSuggestionStore.js");
        await hydrate();

        dismissRouteSuggestion("workout-1", "workout-2");

        expect(isSuggestionDismissed("workout-1", "workout-2")).toBe(true);
        expect(isSuggestionDismissed("workout-2", "workout-1")).toBe(true);

    });

    it("descartar un par no afecta a otro par distinto", async () => {

        const { hydrate, dismissRouteSuggestion, isSuggestionDismissed } = await import("./routeSuggestionStore.js");
        await hydrate();

        dismissRouteSuggestion("workout-1", "workout-2");

        expect(isSuggestionDismissed("workout-1", "workout-3")).toBe(false);

    });

    it("un descarte sobrevive a una re-hidratación (persiste de verdad en IndexedDB)", async () => {

        const { hydrate, dismissRouteSuggestion } = await import("./routeSuggestionStore.js");
        await hydrate();
        dismissRouteSuggestion("workout-1", "workout-2");

        vi.resetModules();

        const { hydrate: hydrateAgain, isSuggestionDismissed } = await import("./routeSuggestionStore.js");
        await hydrateAgain();

        expect(isSuggestionDismissed("workout-1", "workout-2")).toBe(true);

    });

    it("getDismissedPairKeys() devuelve un Set usable directamente para filtrar sugerencias", async () => {

        const { hydrate, dismissRouteSuggestion, getDismissedPairKeys, routeSuggestionPairKey } = await import("./routeSuggestionStore.js");
        await hydrate();

        dismissRouteSuggestion("workout-1", "workout-2");

        const keys = getDismissedPairKeys();
        expect(keys.has(routeSuggestionPairKey("workout-1", "workout-2"))).toBe(true);
        expect(keys.size).toBe(1);

    });

});
