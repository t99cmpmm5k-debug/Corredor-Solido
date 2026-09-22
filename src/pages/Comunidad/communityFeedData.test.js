import { describe, it, expect } from "vitest";
import { buildCommunityFeedCards } from "./communityFeedData.js";

const entreno = (overrides) => ({ alias: "alguien", id: "w", type: "series", date: "2026-09-15", ...overrides });

describe("buildCommunityFeedCards -- TODOS los entrenos, con o sin GPS", () => {

    it("incluye entrenos sin routeTrace -- a diferencia de Mapas, aquí no se descartan", () => {

        const entrenos = [entreno({ id: "w1", routeTrace: null }), entreno({ id: "w2" })];
        expect(buildCommunityFeedCards(entrenos).map(e => e.id)).toEqual(["w1", "w2"]);

    });

    it("ordena por fecha descendente, mezclando entrenos de todos los usuarios", () => {

        const entrenos = [
            entreno({ alias: "Ana", date: "2026-09-01" }),
            entreno({ alias: "Rafa", date: "2026-09-10" }),
            entreno({ alias: "Luis", date: "2026-09-05" })
        ];

        expect(buildCommunityFeedCards(entrenos).map(e => e.alias)).toEqual(["Rafa", "Luis", "Ana"]);

    });

    it("sin typeFilter (\"\" o sin pasar el argumento), no filtra nada", () => {

        const entrenos = [entreno({ id: "w1", type: "easy" }), entreno({ id: "w2", type: "long" })];

        expect(buildCommunityFeedCards(entrenos)).toHaveLength(2);
        expect(buildCommunityFeedCards(entrenos, "")).toHaveLength(2);

    });

    it("con typeFilter, solo deja los entrenos de ese tipo exacto", () => {

        const entrenos = [
            entreno({ id: "w1", type: "easy" }),
            entreno({ id: "w2", type: "long" }),
            entreno({ id: "w3", type: "easy" })
        ];

        expect(buildCommunityFeedCards(entrenos, "easy").map(e => e.id)).toEqual(["w1", "w3"]);

    });

    it("sin ningún entreno de la comunidad, devuelve una lista vacía", () => {

        expect(buildCommunityFeedCards([])).toEqual([]);

    });

});
