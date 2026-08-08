import { describe, it, expect } from "vitest";
import { maxHeartRate, cadence, maxCadence } from "./extractor-engine.js";

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

describe("cadence / maxCadence", () => {

    it("cadence() lee la media aunque la máxima aparezca justo debajo (bug real: se colaba la máx.)", () => {

        const text = [
            "Cadencia media de carrera (mW 162 ppm",
            "Cadencia máx. de carrera 183 pom"
        ].join("\n");

        expect(cadence(text).value).toBe(162);
        expect(maxCadence(text).value).toBe(183);

    });

    it("cadence() no coge el valor de la máxima en el layout de dos columnas", () => {

        const text = [
            "Cadencia media Cadencia máxima de carrera",
            "162 ppm 183 pom"
        ].join("\n");

        expect(cadence(text).value).toBe(162);
        expect(maxCadence(text).value).toBe(183);

    });

    it("cadence() devuelve null si no hay ninguna etiqueta de cadencia media", () => {

        const text = "Cadencia máx. de carrera 183 pom";

        expect(cadence(text)).toBeNull();

    });

    it("maxCadence() devuelve null si no hay ninguna etiqueta de cadencia máxima", () => {

        const text = "Cadencia media de carrera 162 ppm";

        expect(maxCadence(text)).toBeNull();

    });

});
