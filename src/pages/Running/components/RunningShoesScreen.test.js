import { describe, it, expect, vi } from "vitest";

// km por zapatilla fijos para los tests de getPrimaryShoe (el resto de este
// archivo no llama a getShoeTotalKm).
vi.mock("../../../data/workoutStore.js", () => ({
    getShoeTotalKm: id => ({ s1: 250, s2: 70, s3: 60, s4: 900 })[id] ?? 0
}));

import { shoeBarPercent, formatKm, getPrimaryShoe, shoesContextLine, RunningShoesScreen } from "./RunningShoesScreen.js";

describe("shoeBarPercent -- vida útil configurable de zapatillas (fase 5 del pulido de Running)", () => {

    it("sin lifetimeKm configurado (el usuario nunca lo puso), devuelve null -- nunca un % inventado", () => {

        expect(shoeBarPercent({ lifetimeKm: null }, 82.98)).toBeNull();

    });

    it("con lifetimeKm real, calcula el % de uso real", () => {

        const bar = shoeBarPercent({ lifetimeKm: 900 }, 82.98);

        expect(bar).not.toBeNull();
        expect(bar.percent).toBeCloseTo(9.22, 1);
        expect(bar.fillPercent).toBeCloseTo(9.22, 1);
        expect(bar.tier).toBe("normal");

    });

    it("a partir del 80% real, sube a nivel de aviso", () => {

        const bar = shoeBarPercent({ lifetimeKm: 900 }, 730);
        expect(bar.tier).toBe("warning");

    });

    it("al superar el 100% real, nivel de peligro -- fillPercent se recorta a 100 para no desbordar la barra, pero percent real se mantiene sin recortar", () => {

        const bar = shoeBarPercent({ lifetimeKm: 900 }, 950);

        expect(bar.tier).toBe("danger");
        expect(bar.fillPercent).toBe(100);
        expect(bar.percent).toBeGreaterThan(100);

    });

});

describe("formatKm", () => {

    it("formatea con coma decimal, 2 decimales", () => {

        expect(formatKm(82.98)).toBe("82,98 km");
        expect(formatKm(900)).toBe("900,00 km");

    });

});


describe("Zapatilla principal y estados (pulido 2026-09-29)", () => {

    const shoes = [
        { id: "s1", brand: "Nike", model: "Pegasus", status: "active" },
        { id: "s2", brand: "Saucony", model: "Speed", status: "active" },
        { id: "s3", brand: "Asics", model: "Nova", status: "active" },
        { id: "s4", brand: "Adidas", model: "Boston", status: "retired", isPrimary: true }
    ];

    it("sin ninguna marcada, la principal es la activa con más km (criterio de antes) -- nunca una retirada", () => {

        expect(getPrimaryShoe(shoes).id).toBe("s1");

    });

    it("con una activa marcada como principal, esa manda aunque tenga menos km", () => {

        const marked = shoes.map(s => s.id === "s3" ? { ...s, isPrimary: true } : s);
        expect(getPrimaryShoe(marked).id).toBe("s3");

    });

    it("sin ninguna activa, null", () => {

        expect(getPrimaryShoe([shoes[3]])).toBeNull();

    });

    it("contexto: solo conteos reales, omite las partes a cero", () => {

        expect(shoesContextLine(3, true)).toBe("3 zapatillas activas · 1 principal · 2 en rotación");
        expect(shoesContextLine(1, true)).toBe("1 zapatilla activa · 1 principal");
        expect(shoesContextLine(0, false)).toBe("");

    });

    it("cada tarjeta lleva su badge y un menú •••, sin los botones grandes Editar/Retirar", () => {

        const html = RunningShoesScreen({ shoes, addingNewShoe: false, editingShoeId: null, newShoePhoto: null });

        expect(html).toContain("Principal");
        expect((html.match(/>Rotación</g) ?? []).length).toBe(2);
        expect(html).toContain("Retirada");
        expect((html.match(/data-action="toggle-shoe-menu"/g) ?? []).length).toBe(4);
        expect(html).not.toContain("shoe-card-actions");

    });

    it("el menú abierto de una de rotación ofrece Editar / Marcar como principal / Retirar; el de la principal no ofrece marcarla otra vez", () => {

        const rotationOpen = RunningShoesScreen({ shoes, addingNewShoe: false, editingShoeId: null, newShoePhoto: null, shoeMenuOpenId: "s2" });
        expect(rotationOpen).toContain("set-primary-shoe");
        expect(rotationOpen).toContain("retire-shoe");

        const primaryOpen = RunningShoesScreen({ shoes, addingNewShoe: false, editingShoeId: null, newShoePhoto: null, shoeMenuOpenId: "s1" });
        expect(primaryOpen).not.toContain("set-primary-shoe");

    });

});
