// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { buildShoeMileageText } from "./Running.js";
import { shoeBarPercent } from "./components/RunningShoesScreen.js";

// "104,01 km / 700,00 km" + "12% de uso" -- antes esta fila compacta
// mostraba "104,01 km · 12%" sin decir de qué era el % ni cuál era el
// objetivo real configurado (ver ShoeMileageRow en Running.js).
describe("buildShoeMileageText -- fila compacta de kilometraje de zapatillas (Running, Capa 3)", () => {

    it("sin km objetivo configurado, solo el km real -- nunca una fracción ni un % inventados", () => {

        const shoe = { lifetimeKm: null };
        const bar = shoeBarPercent(shoe, 82.98);

        expect(bar).toBeNull();

        const text = buildShoeMileageText(bar, shoe, 82.98);

        expect(text.fraction).toBe("82,98 km");
        expect(text.percentLabel).toBeNull();

    });

    it("con km objetivo real, muestra la fracción km real / km objetivo y el % ya etiquetado como 'de uso'", () => {

        const shoe = { lifetimeKm: 700 };
        const bar = shoeBarPercent(shoe, 104.01);

        const text = buildShoeMileageText(bar, shoe, 104.01);

        expect(text.fraction).toBe("104,01 km / 700,00 km");
        expect(text.percentLabel).toBe("15% de uso");

    });

    it("el % mostrado coincide con km real ÷ km objetivo × 100, redondeado", () => {

        const shoe = { lifetimeKm: 900 };
        const bar = shoeBarPercent(shoe, 730);

        const text = buildShoeMileageText(bar, shoe, 730);

        expect(text.percentLabel).toBe("81% de uso"); // 730/900 = 81,11%

    });

    it("por encima del 100% real, el % mostrado no se recorta (aunque la barra sí, ver shoeBarPercent)", () => {

        const shoe = { lifetimeKm: 900 };
        const bar = shoeBarPercent(shoe, 950);

        const text = buildShoeMileageText(bar, shoe, 950);

        expect(text.percentLabel).toBe("106% de uso");
        expect(bar.fillPercent).toBe(100);

    });

});
