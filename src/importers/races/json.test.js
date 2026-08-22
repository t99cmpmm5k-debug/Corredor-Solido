import { describe, it, expect } from "vitest";
import { parseRacesFromJson } from "./json.js";

describe("parseRacesFromJson", () => {

    it("parsea una carrera válida completa sin inventar nada", () => {

        const result = parseRacesFromJson(JSON.stringify({
            planName: "Carreras de asfalto",
            races: [
                {
                    date: "2026-08-22",
                    type: "RU",
                    name: "VIII Carrera Popular Villa de Ojós 2026",
                    location: "Ojós, Murcia",
                    registrationDeadline: "2026-08-19T20:00:00",
                    url: "https://www.alcanzatumeta.es/calendario.php"
                }
            ]
        }));

        expect(result.planName).toBe("Carreras de asfalto");
        expect(result.races).toHaveLength(1);

        const race = result.races[0];
        expect(race.date).toBe("2026-08-22");
        expect(race.type).toBe("RU");
        expect(race.name).toBe("VIII Carrera Popular Villa de Ojós 2026");
        expect(race.location).toBe("Ojós, Murcia");
        expect(race.registrationDeadline).toBe("2026-08-19T20:00:00");
        expect(race.url).toBe("https://www.alcanzatumeta.es/calendario.php");
        expect(race.importWarnings).toHaveLength(0);
        expect(result.planWarnings).toHaveLength(0);

    });

    it("acepta el campo region (texto libre, sin catálogo cerrado, para el filtro Andalucía/Murcia de Carreras)", () => {

        const result = parseRacesFromJson(JSON.stringify({
            races: [{ date: "2026-08-22", name: "x", region: "Andalucía" }]
        }));

        expect(result.races[0].region).toBe("Andalucía");
        expect(result.races[0].importWarnings).toHaveLength(0);

    });

    it("deja region a null si el archivo no lo trae, sin inventarlo", () => {

        const result = parseRacesFromJson(JSON.stringify({
            races: [{ date: "2026-08-22", name: "x" }]
        }));

        expect(result.races[0].region).toBeNull();

    });

    it("acepta cualquier texto libre en type, sin validarlo contra ningún catálogo", () => {

        const result = parseRacesFromJson(JSON.stringify({
            races: [{ date: "2026-08-22", type: "TR", name: "Trail de prueba" }]
        }));

        expect(result.races[0].type).toBe("TR");
        expect(result.races[0].importWarnings).toHaveLength(0);

    });

    it("deja null los campos opcionales ausentes, nunca los inventa", () => {

        const result = parseRacesFromJson(JSON.stringify({
            races: [{ date: "2026-08-22" }]
        }));

        const race = result.races[0];
        expect(race.type).toBeNull();
        expect(race.name).toBeNull();
        expect(race.location).toBeNull();
        expect(race.registrationDeadline).toBeNull();
        expect(race.url).toBeNull();

    });

    it("marca una fecha con formato inválido como null en vez de intentar interpretarla", () => {

        const result = parseRacesFromJson(JSON.stringify({
            races: [{ date: "22/08/2026", name: "x" }]
        }));

        expect(result.races[0].date).toBeNull();
        expect(result.races[0].importWarnings.some(w => w.includes("Fecha"))).toBe(true);

    });

    it("marca una fecha límite de inscripción con formato inválido como null", () => {

        const result = parseRacesFromJson(JSON.stringify({
            races: [{ date: "2026-08-22", name: "x", registrationDeadline: "19/08/2026" }]
        }));

        expect(result.races[0].registrationDeadline).toBeNull();
        expect(result.races[0].importWarnings.some(w => w.includes("inscripción"))).toBe(true);

    });

    it("acepta registrationDeadline sin segundos", () => {

        const result = parseRacesFromJson(JSON.stringify({
            races: [{ date: "2026-08-22", name: "x", registrationDeadline: "2026-08-19T20:00" }]
        }));

        expect(result.races[0].registrationDeadline).toBe("2026-08-19T20:00");

    });

    it("null explícito en registrationDeadline no genera aviso", () => {

        const result = parseRacesFromJson(JSON.stringify({
            races: [{ date: "2026-08-22", name: "x", registrationDeadline: null }]
        }));

        expect(result.races[0].registrationDeadline).toBeNull();
        expect(result.races[0].importWarnings).toHaveLength(0);

    });

    it("conserva la carrera sin fecha en vez de descartarla, con aviso", () => {

        const result = parseRacesFromJson(JSON.stringify({
            races: [{ name: "x" }]
        }));

        expect(result.races).toHaveLength(1);
        expect(result.races[0].date).toBeNull();
        expect(result.planWarnings.some(w => w.includes("sin fecha"))).toBe(true);

    });

    it("avisa a nivel de plan si falta el nombre", () => {

        const result = parseRacesFromJson(JSON.stringify({
            races: [{ date: "2026-08-22" }]
        }));

        expect(result.planWarnings.some(w => w.includes("sin nombre"))).toBe(true);

    });

    it("lanza un error claro si el JSON está mal formado", () => {

        expect(() => parseRacesFromJson("{ esto no es json")).toThrow(/JSON válido/);

    });

    it("lanza un error claro si falta el array races", () => {

        expect(() => parseRacesFromJson(JSON.stringify({ planName: "x" }))).toThrow(/races/);

    });

    it("ignora con tipo inválido un campo de texto que llega como número", () => {

        const result = parseRacesFromJson(JSON.stringify({
            races: [{ date: "2026-08-22", name: 123 }]
        }));

        expect(result.races[0].name).toBeNull();
        expect(result.races[0].importWarnings.some(w => w.includes("name"))).toBe(true);

    });

});
