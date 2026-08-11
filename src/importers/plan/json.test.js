import { describe, it, expect } from "vitest";
import { parsePlanFromJson } from "./json.js";

describe("parsePlanFromJson", () => {

    it("parsea un plan válido completo sin inventar nada", () => {

        const result = parsePlanFromJson(JSON.stringify({
            planName: "Plan 10K",
            sessions: [
                {
                    date: "2026-08-17",
                    type: "z2",
                    title: "Rodaje suave",
                    distanceKm: 8,
                    durationSec: null,
                    targetPaceSecPerKm: 330,
                    targetHrZone: null,
                    description: "Sensaciones cómodas."
                }
            ]
        }));

        expect(result.planName).toBe("Plan 10K");
        expect(result.sessions).toHaveLength(1);

        const session = result.sessions[0];
        expect(session.date).toBe("2026-08-17");
        expect(session.type).toBe("z2");
        expect(session.distanceKm).toBe(8);
        expect(session.durationSec).toBeNull();
        expect(session.targetPaceSecPerKm).toBe(330);
        expect(session.description).toBe("Sensaciones cómodas.");
        expect(session.fieldMeta.distanceKm).toEqual({ confidence: 1, corrected: false });
        expect(session.fieldMeta.durationSec).toEqual({ confidence: null, corrected: false });
        expect(session.importWarnings).toHaveLength(0);
        expect(result.planWarnings).toHaveLength(0);

    });

    it("deja null los campos opcionales ausentes, nunca los inventa", () => {

        const result = parsePlanFromJson(JSON.stringify({
            sessions: [{ date: "2026-08-17" }]
        }));

        const session = result.sessions[0];
        expect(session.type).toBeNull();
        expect(session.title).toBeNull();
        expect(session.distanceKm).toBeNull();
        expect(session.durationSec).toBeNull();
        expect(session.targetPaceSecPerKm).toBeNull();
        expect(session.targetHrZone).toBeNull();
        expect(session.description).toBeNull();
        expect(result.planName).toBeNull();

    });

    it("marca un type desconocido como null con aviso, sin adivinar", () => {

        const result = parsePlanFromJson(JSON.stringify({
            sessions: [{ date: "2026-08-17", type: "runeasy" }]
        }));

        const session = result.sessions[0];
        expect(session.type).toBeNull();
        expect(session.importWarnings.some(w => w.includes("runeasy"))).toBe(true);
        expect(result.planWarnings.some(w => w.includes("tipo no reconocido"))).toBe(true);

    });

    it("conserva la sesión sin fecha en vez de descartarla, con aviso", () => {

        const result = parsePlanFromJson(JSON.stringify({
            sessions: [{ type: "z2" }]
        }));

        expect(result.sessions).toHaveLength(1);
        expect(result.sessions[0].date).toBeNull();
        expect(result.sessions[0].importWarnings.length).toBeGreaterThan(0);
        expect(result.planWarnings.some(w => w.includes("sin fecha"))).toBe(true);

    });

    it("marca una fecha con formato inválido como null en vez de intentar interpretarla", () => {

        const result = parsePlanFromJson(JSON.stringify({
            sessions: [{ date: "17/08/2026" }]
        }));

        expect(result.sessions[0].date).toBeNull();

    });

    it("lanza un error claro si el JSON está mal formado", () => {

        expect(() => parsePlanFromJson("{ esto no es json")).toThrow(/JSON válido/);

    });

    it("lanza un error claro si falta el array sessions", () => {

        expect(() => parsePlanFromJson(JSON.stringify({ planName: "x" }))).toThrow(/sessions/);

    });

    it("ignora con tipo inválido un campo numérico que llega como string", () => {

        const result = parsePlanFromJson(JSON.stringify({
            sessions: [{ date: "2026-08-17", distanceKm: "8km" }]
        }));

        expect(result.sessions[0].distanceKm).toBeNull();
        expect(result.sessions[0].importWarnings.some(w => w.includes("distanceKm"))).toBe(true);

    });

});
