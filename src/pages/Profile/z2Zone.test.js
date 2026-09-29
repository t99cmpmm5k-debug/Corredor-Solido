import { describe, it, expect } from "vitest";
import { parseZ2Inputs, describeZ2Range } from "./z2Zone.js";

describe("parseZ2Inputs -- Zona 2 personal en Editar perfil", () => {

    it("dos enteros válidos -> rango personal", () => {
        expect(parseZ2Inputs("125", " 142 ")).toEqual({ value: { z2MinBpm: 125, z2MaxBpm: 142 } });
    });

    it("los dos vacíos -> sin zona personal (null/null, vuelve al rango general)", () => {
        expect(parseZ2Inputs("", "  ")).toEqual({ value: { z2MinBpm: null, z2MaxBpm: null } });
    });

    it.each([
        ["130", ""],
        ["", "150"],
        ["150", "140"],
        ["140", "140"],
        ["60", "140"],
        ["150", "240"],
        ["130.5", "150"],
        ["abc", "150"]
    ])("rechaza %s / %s con un mensaje, sin inventar valores", (min, max) => {
        const result = parseZ2Inputs(min, max);
        expect(result.value).toBeUndefined();
        expect(typeof result.error).toBe("string");
    });

});

describe("describeZ2Range", () => {

    it("con rango personal lo muestra tal cual", () => {
        expect(describeZ2Range(125, 142)).toEqual({ text: "125–142 ppm", isPersonal: true });
    });

    it("sin configurar (o a medias) muestra el general 130–150", () => {
        expect(describeZ2Range(null, null)).toEqual({ text: "130–150 ppm", isPersonal: false });
        expect(describeZ2Range(125, null)).toEqual({ text: "130–150 ppm", isPersonal: false });
    });

});
