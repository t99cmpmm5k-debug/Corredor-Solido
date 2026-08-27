import { describe, it, expect } from "vitest";
import { BottomSheet } from "./BottomSheet.js";

describe("BottomSheet -- action sheet genérico (fase 5 del pulido de Plan)", () => {

    it("pinta el título y cada opción con su icono/etiqueta/data-action", () => {

        const html = BottomSheet({
            title: "Añadir a la semana",
            closeAction: "close-plan-add-sheet",
            options: [
                { icon: "solar:upload-square-bold-duotone", label: "Importar plan", action: "add-sheet-import-plan" },
                { icon: "solar:add-circle-bold-duotone", label: "Crear entrenamiento", action: "add-sheet-create-workout" }
            ]
        });

        expect(html).toContain("Añadir a la semana");
        expect(html).toContain("Importar plan");
        expect(html).toContain('data-action="add-sheet-import-plan"');
        expect(html).toContain("Crear entrenamiento");
        expect(html).toContain('data-action="add-sheet-create-workout"');
        expect(html).toContain("solar:upload-square-bold-duotone");

    });

    it("el backdrop lleva el data-action de cierre que se le pase", () => {

        const html = BottomSheet({ options: [], closeAction: "close-plan-add-sheet" });

        expect(html).toContain('data-action="close-plan-add-sheet"');

    });

    it("sin título, no pinta el <h3>", () => {

        const html = BottomSheet({ options: [], closeAction: "close-plan-add-sheet" });

        expect(html).not.toContain("bottom-sheet-title");

    });

    it("pinta el hint opcional de una opción cuando lo trae", () => {

        const html = BottomSheet({
            closeAction: "close-plan-add-sheet",
            options: [{ icon: "solar:moon-bold-duotone", label: "Añadir descanso", hint: "Recuperación para hoy", action: "add-sheet-add-rest" }]
        });

        expect(html).toContain("Recuperación para hoy");

    });

});
