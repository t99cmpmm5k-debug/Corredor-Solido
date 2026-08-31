import { describe, it, expect } from "vitest";
import { parse } from "./parser-intervals-road.js";

describe("parser-intervals-road", () => {

    it("identifica la pantalla como 'intervals-road' sin extraer ninguna vuelta", () => {

        const { fields, extras } = parse();

        expect(fields.screen_type.value).toBe("intervals-road");
        expect(extras.laps).toEqual([]);

    });

});
