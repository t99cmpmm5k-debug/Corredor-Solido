import { describe, it, expect } from "vitest";
import { maxHeartRate } from "./extractor-engine.js";

describe("maxHeartRate", () => {

    it("lee el valor máximo cuando etiqueta y número están en la misma línea", () => {

        const text = [
            "Frecuencia cardiaca media",
            "146 ppm",
            "Frec. cardiaca máx.",
            "172 ppm"
        ].join("\n");

        expect(maxHeartRate(text).value).toBe(172);

    });

    it("no coge el valor de la media en el layout de dos columnas (media y máx. en la misma fila, valores debajo)", () => {

        // Reproduce el bug real: Garmin muestra ambas etiquetas seguidas
        // y ambos valores en la fila siguiente. Sin la etiqueta combinada,
        // el "número más cercano" a "máx." era el de la media (146),
        // no el suyo propio (172).
        const text = [
            "Frecuencia cardiaca media Frec. cardiaca máx.",
            "146 ppm 172 ppm"
        ].join("\n");

        expect(maxHeartRate(text).value).toBe(172);

    });

    it("devuelve null si no hay ninguna etiqueta de FC máxima", () => {

        const text = ["Frecuencia cardiaca media", "146 ppm"].join("\n");

        expect(maxHeartRate(text)).toBeNull();

    });

});
