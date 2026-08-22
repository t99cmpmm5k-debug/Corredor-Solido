import { describe, it, expect } from "vitest";
import { formatDeadline, isDeadlineUrgent, formatUrlHost, formatDistance, formatDisciplineType } from "./raceFormat.js";

describe("formatDeadline", () => {

    it("formatea fecha y hora", () => {

        expect(formatDeadline("2026-08-19T20:00:00")).toBe("19 ago, 20:00");

    });

    it("formatea solo la fecha si no hay hora", () => {

        expect(formatDeadline("2026-08-19")).toBe("19 ago");

    });

});

describe("isDeadlineUrgent", () => {

    it("no es urgente una fecha ya pasada", () => {

        expect(isDeadlineUrgent("2020-01-01T00:00:00")).toBe(false);

    });

    it("no es urgente una fecha muy lejana", () => {

        const future = new Date();
        future.setDate(future.getDate() + 30);
        const iso = future.toISOString().slice(0, 10) + "T00:00:00";

        expect(isDeadlineUrgent(iso)).toBe(false);

    });

    it("es urgente dentro de las próximas 72 horas", () => {

        const soon = new Date(Date.now() + 60 * 60 * 1000);
        const iso = `${soon.getFullYear()}-${String(soon.getMonth() + 1).padStart(2, "0")}-${String(soon.getDate()).padStart(2, "0")}T${String(soon.getHours()).padStart(2, "0")}:${String(soon.getMinutes()).padStart(2, "0")}:00`;

        expect(isDeadlineUrgent(iso)).toBe(true);

    });

});

describe("formatUrlHost", () => {

    it("extrae el host sin www", () => {

        expect(formatUrlHost("https://www.alcanzatumeta.es/calendario.php")).toBe("alcanzatumeta.es");

    });

    it("devuelve el texto tal cual si no es una URL válida", () => {

        expect(formatUrlHost("no-es-una-url")).toBe("no-es-una-url");

    });

});

describe("formatDistance", () => {

    it("usa siempre 2 decimales con coma", () => {

        expect(formatDistance(10)).toBe("10,00 km");
        expect(formatDistance(10.2)).toBe("10,20 km");
        expect(formatDistance(10.256)).toBe("10,26 km");

    });

});

describe("formatDisciplineType", () => {

    it("RU -> Asfalto", () => {

        expect(formatDisciplineType("RU")).toBe("Asfalto");

    });

    it("TRS -> Trail", () => {

        expect(formatDisciplineType("TRS")).toBe("Trail");

    });

    it("un type sin etiqueta propia se muestra tal cual, sin inventar una", () => {

        expect(formatDisciplineType("TR")).toBe("TR");

    });

    it("sin type devuelve null, no un texto vacío ni inventado", () => {

        expect(formatDisciplineType(null)).toBeNull();
        expect(formatDisciplineType(undefined)).toBeNull();

    });

});
