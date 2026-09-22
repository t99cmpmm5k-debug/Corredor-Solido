import { describe, it, expect } from "vitest";
import { colorForAlias } from "./communityMapColors.js";

describe("colorForAlias -- color determinista por alias, sin backend", () => {

    it("el mismo alias produce siempre el mismo color", () => {

        expect(colorForAlias("Rafa")).toBe(colorForAlias("Rafa"));
        expect(colorForAlias("annamateoalca")).toBe(colorForAlias("annamateoalca"));

    });

    it("devuelve un color hsl() válido", () => {

        expect(colorForAlias("Rafa")).toMatch(/^hsl\(\d{1,3}, 72%, 58%\)$/);

    });

    it("aliases distintos tienden a producir colores distintos", () => {

        expect(colorForAlias("Rafa")).not.toBe(colorForAlias("annamateoalca"));

    });

});
