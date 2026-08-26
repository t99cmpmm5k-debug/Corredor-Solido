import { describe, it, expect } from "vitest";
import { parse } from "./parser-summary.js";

// Bug real 2026-08-26: cuando la palabra de actividad viene en medio del
// título OCR ("Puerto Lumbreras Carrera A"), quitarla dejaba un
// fragmento suelto de 1-2 letras al final ("Puerto Lumbreras A")
// guardado tal cual en location -- ver stripTrailingLetterFragment() en
// parser-summary.js. Cero tests cubrían esta rama antes de esto.
describe("parser-summary — extracción de location (bug \"Puerto Lumbreras A\")", () => {

    it("quita la letra suelta que sobrevive a retirar la palabra de actividad del medio del título", () => {

        const text = [
            "Puerto Lumbreras Carrera A",
            "23 jul @ 07:37",
            "10,00 km"
        ].join("\n");

        const { fields } = parse(text);

        expect(fields.location.value).toBe("Puerto Lumbreras");
        expect(fields.activity.value.toLowerCase()).toBe("carrera");

    });

    it("mismo patrón con otro topónimo -- no es un caso aislado de un solo texto", () => {

        const text = [
            "Aguilas Carrera A",
            "15 ago @ 08:00",
            "5,00 km"
        ].join("\n");

        const { fields } = parse(text);

        expect(fields.location.value).toBe("Aguilas");

    });

    it("un título sin ninguna letra suelta al final no pierde ningún carácter real", () => {

        const text = [
            "Ojos Rodaje",
            "10 jun @ 07:00",
            "8,00 km"
        ].join("\n");

        const { fields } = parse(text);

        expect(fields.location.value).toBe("Ojos");

    });

    it("sin ninguna palabra de actividad reconocible en ninguna línea, no hay título que devolver -- location se queda null, nunca inventado", () => {

        const text = [
            "Puerto Lumbreras",
            "23 jul @ 07:37",
            "10,00 km"
        ].join("\n");

        const { fields } = parse(text);

        expect(fields.title.value).toBeNull();
        expect(fields.location.value).toBeNull();

    });

});
