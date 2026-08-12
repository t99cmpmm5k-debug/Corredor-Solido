import { describe, it, expect } from "vitest";
import { maxHeartRate, cadence, maxCadence, calories, distance } from "./extractor-engine.js";

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

describe("calories", () => {

    it("no coge el tiempo total como si fueran calorías en el layout de dos columnas", () => {

        // Caso real: normalizeLabel() le quita los ":" a "42:19" antes de
        // que corra el regex ("4219"), y sin el patrón de dos columnas
        // ese "4219" se colaba como si fueran las calorías reales (420).
        const text = [
            "137 ppm @ 7:05 /km @",
            "Frecuencia cardiaca media Ritmo medio",
            "42:19 420",
            "Tiempo total Calorías totales"
        ].join("\n");

        expect(calories(text).value).toBe(420);

    });

    it("sigue leyendo bien el caso normal, con la etiqueta pegada al número", () => {

        expect(calories("Total de calorias quemadas 420").value).toBe(420);

    });

    it("ignora las calorías en reposo y coge las totales cuando aparecen las tres juntas", () => {

        const text = "Calorias en reposo 56 Calorias activas 364 Total de calorias quemadas 420";

        expect(calories(text).value).toBe(420);

    });

});

describe("distance", () => {

    it("cae al patrón de reserva en metros cuando el OCR pierde la coma decimal (bug real, Resumen de un Entrenamiento en pista)", () => {

        // Fragmento real: "4770." — entero en metros pegado a un punto
        // suelto sin dígitos detrás, en vez de "5,98 km" — DISTANCE_NUM
        // (que exige separador + dígitos) no lo coge, de ahí la reserva.
        const text = [
            "Puerto Lumbreras - Series",
            "Añadir notas...",
            "4770.",
            "Distancia",
            "164 ppm Y 5:24 km @",
            "Frecuencia cardiaca media Ritmo medio"
        ].join("\n");

        const result = distance(text);

        expect(result.value).toBeCloseTo(4.77);
        expect(result.confidence).toBe(.85);

    });

    it("prefiere el patrón en km normal (coma decimal real) antes que la reserva en metros", () => {

        const result = distance("Distancia recorrida 5,98 km");

        expect(result.value).toBe(5.98);
        expect(result.confidence).toBe(.98);

    });

    it("devuelve null si no hay ninguna etiqueta de distancia cerca", () => {

        expect(distance("164 ppm 25:46 394 kcal")).toBeNull();

    });

});
