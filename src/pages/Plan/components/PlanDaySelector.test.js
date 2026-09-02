import { describe, it, expect } from "vitest";
import { PlanDaySelector } from "./PlanDaySelector.js";

describe("PlanDaySelector -- pestañas para alternar entre sesiones del mismo día", () => {

    it("una pestaña por item, con data-item-id apuntando a su id", () => {

        const items = [
            { id: "run1", type: "z2" },
            { id: "gym-2026-08-18", gymOnly: true }
        ];

        const html = PlanDaySelector(items, "run1");
        const matches = html.match(/data-item-id="[^"]+"/g) || [];

        expect(matches).toHaveLength(2);
        expect(html).toContain('data-item-id="run1"');
        expect(html).toContain('data-item-id="gym-2026-08-18"');

    });

    it("marca is-active solo en la pestaña del item activo", () => {

        const items = [
            { id: "run1", type: "z2" },
            { id: "gym-2026-08-18", gymOnly: true }
        ];

        const html = PlanDaySelector(items, "gym-2026-08-18");

        const runTab = html.split("</button>")[0];
        const gymTab = html.split("</button>")[1];

        expect(runTab).not.toContain("is-active");
        expect(gymTab).toContain("is-active");
        expect(gymTab).toContain("is-gym");

    });

    it("etiqueta el item de gimnasio como 'Gimnasio' y una sesión real por su tipo (WORKOUT_TYPES)", () => {

        const items = [
            { id: "run1", type: "intervals" },
            { id: "gym-2026-08-18", gymOnly: true }
        ];

        const html = PlanDaySelector(items, "run1");

        expect(html).toContain("Series"); // label de "intervals" en workoutTypes.js
        expect(html).toContain("Gimnasio");

    });

    it("dos sesiones reales del mismo tipo el mismo día se distinguen con un número", () => {

        const items = [
            { id: "s1", type: "z2" },
            { id: "s2", type: "z2" }
        ];

        const html = PlanDaySelector(items, "s1");

        expect(html).toContain("Rodaje (Z2) 1");
        expect(html).toContain("Rodaje (Z2) 2");

    });

});
