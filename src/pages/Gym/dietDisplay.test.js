import { describe, it, expect, vi } from "vitest";

// Vite resuelve los .png a URLs; aquí basta con el nombre del archivo.
vi.mock("../../assets/food/banana.png", () => ({ default: "banana.png" }));

import { getMealImages, splitMealText } from "./dietDisplay.js";

const names = images => images.map(i => i.alt);

describe("getMealImages", () => {

    it("elige por palabras del texto real, en orden, dos como mucho", () => {

        expect(names(getMealImages("Plátano 120 g + café. Para tiradas de 12-15 km puedes añadir pan blanco 40 g"))).toEqual(["plátano", "café"]);
        expect(names(getMealImages("Arroz 60 g en crudo + pollo 160 g + aceite 10 g + ensalada 150 g"))).toEqual(["arroz", "pollo"]);
        expect(names(getMealImages("Tortilla de 2 huevos + 200 ml claras + verdura 250 g"))).toEqual(["tortilla", "huevo"]);
        expect(names(getMealImages("Queso fresco batido 0% 200 g"))).toEqual(["bol"]);
        expect(names(getMealImages("Boniato 300 g + atún 110 g escurrido"))).toEqual(["boniato", "atún"]);
        // "Proteína 30 g" es el batido; "proteína 180 g", una proteína sin especificar.
        expect(names(getMealImages("Proteína 30 g + crema de arroz 50 g"))).toEqual(["batido"]);
        expect(names(getMealImages("Arroz o pasta 80 g en crudo + proteína 180 g + verduras 200 g"))).toEqual(["arroz", "verdura"]);

    });

    it("sin ninguna palabra conocida, un plato genérico", () => {

        expect(names(getMealImages("Cena libre controlada; prioriza proteína"))).toEqual(["plato"]);
        expect(names(getMealImages("Algo que no está en la lista"))).toEqual(["plato"]);

    });

});

describe("splitMealText", () => {

    it("primera frase como principal y el resto como secundario, sin cambiar el texto", () => {

        const text = "Plátano 120 g + café. Para tiradas de 12-15 km puedes añadir pan blanco 40 g + mermelada 15 g si sales con hambre o llevas varias horas despierto";
        const { main, detail } = splitMealText(text);

        expect(main).toBe("Plátano 120 g + café.");
        expect(detail).toBe("Para tiradas de 12-15 km puedes añadir pan blanco 40 g + mermelada 15 g si sales con hambre o llevas varias horas despierto");
        expect(`${main} ${detail}`).toBe(text);

    });

    it("una sola frase, o un punto que no separa frases (3.0 L, 1/2), no se corta", () => {

        expect(splitMealText("Proteína 30 g + crema de arroz 50 g")).toEqual({ main: "Proteína 30 g + crema de arroz 50 g", detail: null });
        expect(splitMealText("3.0 L aprox.")).toEqual({ main: "3.0 L aprox.", detail: null });

    });

});
