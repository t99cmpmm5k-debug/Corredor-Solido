import { describe, it, expect } from "vitest";
import { PlanMovePanel } from "./PlanMovePanel.js";

const session = { id: "s1", title: "Rodaje suave" };

describe("PlanMovePanel -- modo mover vs. duplicar (fase 4 del pulido de Plan)", () => {

    it("por defecto (o mode=\"move\"), instrucciones de mover + cancelar mover", () => {

        const html = PlanMovePanel(session);

        expect(html).toContain("mover");
        expect(html).toContain("Rodaje suave");
        expect(html).toContain('data-action="cancel-move-session"');
        expect(html).not.toContain('data-action="cancel-duplicate-session"');

    });

    it("mode=\"duplicate\": instrucciones de duplicar + cancelar duplicado", () => {

        const html = PlanMovePanel(session, "duplicate");

        expect(html).toContain("duplicar");
        expect(html).toContain("Rodaje suave");
        expect(html).toContain('data-action="cancel-duplicate-session"');
        expect(html).not.toContain('data-action="cancel-move-session"');

    });

});
