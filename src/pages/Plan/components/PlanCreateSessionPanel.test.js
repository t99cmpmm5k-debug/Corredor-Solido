import { describe, it, expect } from "vitest";
import { PlanCreateSessionPanel } from "./PlanCreateSessionPanel.js";

describe("PlanCreateSessionPanel -- modo crear vs. editar (fase 4 del pulido de Plan)", () => {

    it("por defecto (isEditing sin pasar), se comporta como creación", () => {

        const html = PlanCreateSessionPanel("2026-08-27", "z2", "");

        expect(html).toContain("Nueva sesión");
        expect(html).toContain("GUARDAR SESIÓN");
        expect(html).not.toContain("Editar sesión");
        expect(html).not.toContain("GUARDAR CAMBIOS");

    });

    it("isEditing=true cambia la cabecera y el texto del botón, mismos campos", () => {

        const html = PlanCreateSessionPanel("2026-08-27", "intervals", "Series reales", true);

        expect(html).toContain("Editar sesión");
        expect(html).toContain("GUARDAR CAMBIOS");
        expect(html).not.toContain("Nueva sesión ·");
        expect(html).not.toContain("GUARDAR SESIÓN");
        // Mismos campos reales precargados que al crear -- tipo preseleccionado y notas reales
        expect(html).toContain('value="intervals" selected');
        expect(html).toContain("Series reales");

    });

});
