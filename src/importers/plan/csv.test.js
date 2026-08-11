import { describe, it, expect } from "vitest";
import { parsePlanFromCsv } from "./csv.js";

describe("parsePlanFromCsv", () => {

    it("parsea un CSV válido con delimitador ; (plantilla recomendada)", () => {

        const csv = [
            "fecha;tipo;titulo;distancia_km;duracion;ritmo_objetivo;zona_fc;descripcion",
            "2026-08-17;z2;Rodaje suave;8;;5:30;;Sensaciones cómodas"
        ].join("\n");

        const result = parsePlanFromCsv(csv);

        expect(result.planName).toBeNull();
        expect(result.sessions).toHaveLength(1);

        const s = result.sessions[0];
        expect(s.date).toBe("2026-08-17");
        expect(s.type).toBe("z2");
        expect(s.title).toBe("Rodaje suave");
        expect(s.distanceKm).toBe(8);
        expect(s.durationSec).toBeNull();
        expect(s.targetPaceSecPerKm).toBe(330);
        expect(s.targetHrZone).toBeNull();
        expect(s.description).toBe("Sensaciones cómodas");

    });

    it("parsea un CSV válido con delimitador ,", () => {

        const csv = [
            "fecha,tipo,titulo",
            "2026-08-17,z2,Rodaje suave"
        ].join("\n");

        const result = parsePlanFromCsv(csv);

        expect(result.sessions[0].date).toBe("2026-08-17");
        expect(result.sessions[0].type).toBe("z2");
        expect(result.sessions[0].title).toBe("Rodaje suave");

    });

    it("reconoce cabeceras con mayúsculas y tildes distintas", () => {

        const csv = [
            "FECHA;Tipo;TÍTULO;Distancia_KM;Duración;Ritmo_Objetivo;Zona_FC;Descripción",
            "2026-08-17;z2;Rodaje;8;;;;"
        ].join("\n");

        const result = parsePlanFromCsv(csv);

        expect(result.sessions[0].date).toBe("2026-08-17");
        expect(result.sessions[0].title).toBe("Rodaje");
        expect(result.sessions[0].distanceKm).toBe(8);

    });

    it("ignora una columna no reconocida sin bloquear, con aviso", () => {

        const csv = [
            "fecha;notas",
            "2026-08-17;algo"
        ].join("\n");

        const result = parsePlanFromCsv(csv);

        expect(result.sessions).toHaveLength(1);
        expect(result.planWarnings.some(w => w.includes("notas"))).toBe(true);

    });

    it("lanza un error claro si falta la columna fecha", () => {

        const csv = [
            "tipo;titulo",
            "z2;Rodaje"
        ].join("\n");

        expect(() => parsePlanFromCsv(csv)).toThrow(/fecha/);

    });

    it("acepta duracion/ritmo_objetivo en formato reloj y en segundos planos", () => {

        const csv = [
            "fecha;duracion;ritmo_objetivo",
            "2026-08-17;45:00;5:30",
            "2026-08-18;2700;330"
        ].join("\n");

        const result = parsePlanFromCsv(csv);

        expect(result.sessions[0].durationSec).toBe(2700);
        expect(result.sessions[0].targetPaceSecPerKm).toBe(330);
        expect(result.sessions[1].durationSec).toBe(2700);
        expect(result.sessions[1].targetPaceSecPerKm).toBe(330);

    });

    it("acepta distancia_km con coma decimal y con sufijo km", () => {

        const csv = [
            "fecha;distancia_km",
            "2026-08-17;8,5",
            "2026-08-18;8km",
            "2026-08-19;8 km"
        ].join("\n");

        const result = parsePlanFromCsv(csv);

        expect(result.sessions[0].distanceKm).toBe(8.5);
        expect(result.sessions[1].distanceKm).toBe(8);
        expect(result.sessions[2].distanceKm).toBe(8);

    });

    it("deja null una distancia inválida, con aviso citando el valor original", () => {

        const csv = [
            "fecha;distancia_km",
            "2026-08-17;8km carrera"
        ].join("\n");

        const result = parsePlanFromCsv(csv);

        expect(result.sessions[0].distanceKm).toBeNull();
        expect(result.sessions[0].importWarnings.some(w => w.includes("8km carrera"))).toBe(true);

    });

    it("reconoce el tipo por id", () => {

        const csv = [
            "fecha;tipo",
            "2026-08-17;intervals"
        ].join("\n");

        expect(parsePlanFromCsv(csv).sessions[0].type).toBe("intervals");

    });

    it("reconoce el tipo por etiqueta en español, con o sin tilde", () => {

        const csv = [
            "fecha;tipo",
            "2026-08-17;Rodaje (Z2)",
            "2026-08-18;recuperacion",
            "2026-08-19;RECUPERACIÓN"
        ].join("\n");

        const result = parsePlanFromCsv(csv);

        expect(result.sessions[0].type).toBe("z2");
        expect(result.sessions[1].type).toBe("recovery");
        expect(result.sessions[2].type).toBe("recovery");

    });

    it("deja null un tipo no reconocido, con aviso", () => {

        const csv = [
            "fecha;tipo",
            "2026-08-17;correr rapido"
        ].join("\n");

        const result = parsePlanFromCsv(csv);

        expect(result.sessions[0].type).toBeNull();
        expect(result.sessions[0].importWarnings.some(w => w.includes("correr rapido"))).toBe(true);
        expect(result.planWarnings.some(w => w.includes("tipo no reconocido"))).toBe(true);

    });

    it("respeta un campo entre comillas que contiene el delimitador", () => {

        const csv = [
            "fecha;descripcion",
            '2026-08-17;"Series de 400m; recuperación 90s"'
        ].join("\n");

        const result = parsePlanFromCsv(csv);

        expect(result.sessions[0].description).toBe("Series de 400m; recuperación 90s");

    });

    it("avisa si una fila tiene menos columnas de las esperadas", () => {

        const csv = [
            "fecha;tipo;titulo",
            "2026-08-17"
        ].join("\n");

        const result = parsePlanFromCsv(csv);

        expect(result.sessions[0].date).toBe("2026-08-17");
        expect(result.sessions[0].importWarnings.some(w => w.includes("menos columnas"))).toBe(true);

    });

    it("ignora líneas en blanco entre filas", () => {

        const csv = [
            "fecha;tipo",
            "2026-08-17;z2",
            "",
            "2026-08-19;tempo",
            ""
        ].join("\n");

        const result = parsePlanFromCsv(csv);

        expect(result.sessions).toHaveLength(2);

    });

});
