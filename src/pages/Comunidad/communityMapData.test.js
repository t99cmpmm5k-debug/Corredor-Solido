import { describe, it, expect } from "vitest";
import { buildCommunitySegments, buildCommunityLegendEntries } from "./communityMapData.js";
import { colorForAlias } from "./communityMapColors.js";

const withTrace = (alias, id) => ({
    alias,
    id,
    routeTrace: [{ lat: 37.9, lon: -1.1 }, { lat: 37.91, lon: -1.11 }, { lat: 37.92, lon: -1.12 }]
});

const withoutTrace = alias => ({ alias, id: `${alias}-no-gps`, routeTrace: null });

describe("buildCommunitySegments -- un segmento de polilínea por entreno con GPS", () => {

    it("descarta entrenos sin routeTrace, con un único punto, o sin el campo", () => {

        const entrenos = [
            withoutTrace("Rafa"),
            { alias: "Ana", id: "w1", routeTrace: [{ lat: 1, lon: 1 }] },
            { alias: "Luis", id: "w2" }
        ];

        expect(buildCommunitySegments(entrenos)).toEqual([]);

    });

    it("un usuario con varios entrenos con GPS produce varios segmentos, todos con su mismo color", () => {

        const entrenos = [withTrace("Rafa", "w1"), withTrace("Rafa", "w2")];
        const segments = buildCommunitySegments(entrenos);

        expect(segments).toHaveLength(2);
        expect(segments[0].color).toBe(colorForAlias("Rafa"));
        expect(segments[1].color).toBe(colorForAlias("Rafa"));

    });

    it("convierte {lat,lon} a pares [lat,lon] en el orden real del recorrido", () => {

        const segments = buildCommunitySegments([withTrace("Rafa", "w1")]);

        expect(segments[0].latlngs).toEqual([[37.9, -1.1], [37.91, -1.11], [37.92, -1.12]]);

    });

    it("dos usuarios distintos obtienen colores distintos", () => {

        const segments = buildCommunitySegments([withTrace("Rafa", "w1"), withTrace("annamateoalca", "w2")]);

        expect(segments[0].color).not.toBe(segments[1].color);

    });

});

describe("buildCommunityLegendEntries -- una fila por alias, nunca por entreno", () => {

    it("un usuario con varios entrenos con GPS aparece una sola vez en la leyenda", () => {

        const entries = buildCommunityLegendEntries([withTrace("Rafa", "w1"), withTrace("Rafa", "w2")]);

        expect(entries).toEqual([{ alias: "Rafa", color: colorForAlias("Rafa") }]);

    });

    it("un usuario sin ningún entreno con GPS no aparece -- ni hueco ni error", () => {

        const entries = buildCommunityLegendEntries([withTrace("Rafa", "w1"), withoutTrace("SinGPS")]);

        expect(entries.map(e => e.alias)).toEqual(["Rafa"]);

    });

    it("orden alfabético, estable entre llamadas", () => {

        const entries = buildCommunityLegendEntries([withTrace("Zoe", "w1"), withTrace("Ana", "w2"), withTrace("Luis", "w3")]);

        expect(entries.map(e => e.alias)).toEqual(["Ana", "Luis", "Zoe"]);

    });

    it("sin ningún entreno con GPS en toda la comunidad, devuelve una lista vacía", () => {

        expect(buildCommunityLegendEntries([withoutTrace("Rafa"), withoutTrace("Ana")])).toEqual([]);

    });

});
