import { describe, it, expect } from "vitest";
import { PlanMoveDayPicker } from "./PlanMoveDayPicker.js";

const MONDAY = "2026-08-24";
const session = { id: "s1", date: "2026-08-25" }; // martes

describe("PlanMoveDayPicker -- modo mover vs. duplicar (fase 4 del pulido de Plan)", () => {

    it("modo mover (por defecto): el día de origen no es tocable (AQUÍ, sin data-action)", () => {

        const html = PlanMoveDayPicker(MONDAY, [session], session, "move");

        expect(html).toContain("AQUÍ");
        expect(html).toContain('data-action="move-session-to"');
        expect(html).not.toContain('data-action="duplicate-session-to"');

    });

    it("modo duplicar: el día de origen SÍ es tocable (duplicar dentro del mismo día es un caso real)", () => {

        const html = PlanMoveDayPicker(MONDAY, [session], session, "duplicate");

        expect(html).not.toContain("AQUÍ");
        expect(html).toContain('data-action="duplicate-session-to"');
        expect(html).not.toContain('data-action="move-session-to"');

        // Las 7 columnas llevan la acción de duplicar, incluida la del propio día de origen
        const matches = html.match(/data-action="duplicate-session-to"/g) || [];
        expect(matches).toHaveLength(7);

    });

});
