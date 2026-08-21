import { describe, it, expect } from "vitest";
import { djb2Hash, getRaceImage } from "./raceImage.js";
import { RACE_RU_IMAGES, RACE_FALLBACK_IMAGE } from "../assets/races/index.js";

describe("getRaceImage", () => {

    it("devuelve siempre la misma imagen para la misma carrera", () => {

        const race = { type: "RU", name: "Carrera Popular de Ojós", date: "2026-08-22" };

        const first = getRaceImage(race);
        const second = getRaceImage({ ...race });

        expect(first).toBe(second);

    });

    it("devuelve una de las 4 imágenes de asfalto para type RU", () => {

        const race = { type: "RU", name: "Carrera Popular de Ojós", date: "2026-08-22" };

        expect(RACE_RU_IMAGES).toContain(getRaceImage(race));

    });

    it("dos carreras con distinto nombre pueden caer en fotos distintas", () => {

        const images = [
            "Carrera Popular de Ojós",
            "Carrera Nocturna Fiestas de Las Torres",
            "Chit@ Beer Run Cieza",
            "Cross Subida a la fuente del Sapo"
        ].map(name => getRaceImage({ type: "RU", name, date: "2026-08-22" }));

        expect(new Set(images).size).toBeGreaterThan(1);

    });

    it("usa el degradado de fallback si type no es RU", () => {

        expect(getRaceImage({ type: "TR", name: "Trail de prueba", date: "2026-08-22" })).toBe(RACE_FALLBACK_IMAGE);

    });

    it("usa el degradado de fallback si no hay type", () => {

        expect(getRaceImage({ name: "x", date: "2026-08-22" })).toBe(RACE_FALLBACK_IMAGE);

    });

});

describe("djb2Hash", () => {

    it("es determinista", () => {

        expect(djb2Hash("hola")).toBe(djb2Hash("hola"));

    });

    it("distingue cadenas distintas", () => {

        expect(djb2Hash("hola")).not.toBe(djb2Hash("adios"));

    });

});
