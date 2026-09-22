import { describe, it, expect } from "vitest";
import { buildCommunityRouteCards } from "./communityMapData.js";

const withTrace = (alias, id, date) => ({
    alias,
    id,
    date,
    routeTrace: [{ lat: 37.9, lon: -1.1 }, { lat: 37.91, lon: -1.11 }, { lat: 37.92, lon: -1.12 }]
});

const withoutTrace = alias => ({ alias, id: `${alias}-no-gps`, date: "2026-09-01", routeTrace: null });

describe("buildCommunityRouteCards -- una tarjeta por entreno con GPS, de cualquier usuario", () => {

    it("descarta entrenos sin routeTrace, con un único punto, o sin el campo", () => {

        const entrenos = [
            withoutTrace("Rafa"),
            { alias: "Ana", id: "w1", date: "2026-09-01", routeTrace: [{ lat: 1, lon: 1 }] },
            { alias: "Luis", id: "w2", date: "2026-09-01" }
        ];

        expect(buildCommunityRouteCards(entrenos)).toEqual([]);

    });

    it("un usuario con varios entrenos con GPS produce varias tarjetas", () => {

        const entrenos = [withTrace("Rafa", "w1", "2026-09-01"), withTrace("Rafa", "w2", "2026-09-02")];

        expect(buildCommunityRouteCards(entrenos)).toHaveLength(2);

    });

    it("ordena por fecha descendente, mezclando entrenos de todos los usuarios", () => {

        const entrenos = [
            withTrace("Ana", "w1", "2026-09-01"),
            withTrace("Rafa", "w2", "2026-09-05"),
            withTrace("Luis", "w3", "2026-09-03")
        ];

        expect(buildCommunityRouteCards(entrenos).map(e => e.alias)).toEqual(["Rafa", "Luis", "Ana"]);

    });

    it("un usuario sin ningún entreno con GPS no aparece -- ni hueco ni error", () => {

        const entrenos = [withTrace("Rafa", "w1", "2026-09-01"), withoutTrace("SinGPS")];

        expect(buildCommunityRouteCards(entrenos).map(e => e.alias)).toEqual(["Rafa"]);

    });

    it("sin ningún entreno con GPS en toda la comunidad, devuelve una lista vacía", () => {

        expect(buildCommunityRouteCards([withoutTrace("Rafa"), withoutTrace("Ana")])).toEqual([]);

    });

});
