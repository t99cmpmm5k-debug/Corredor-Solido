import { describe, it, expect } from "vitest";
import { buildWeekInsight } from "./weekInsight.js";

const WEDNESDAY = new Date(2026, 7, 26); // miércoles 26 ago 2026

function session(date, type, volume, status = "pending") {
    return { date, type, volume, status };
}

function insight(week, opts = {}) {
    return buildWeekInsight(week, { referenceDate: WEDNESDAY, ...opts });
}

describe("buildWeekInsight -- redacción natural (ronda final de Inicio, 2026-08-26)", () => {

    it("sin sesiones o sin objetivo semanal, no hay texto", () => {
        expect(insight([], { goal: 20 })).toBe("");
        expect(insight([session("2026-08-26", "z2", 8)], { goal: 0 })).toBe("");
    });

    it("hoy con km reales: 'Hoy: TIPO · X km.'", () => {

        const week = [session("2026-08-26", "z2", 8)];
        expect(insight(week, { goal: 21 })).toBe("Hoy: Z2 · 8 km.");

    });

    it("hoy sin km pero de tipo fuerza/descanso/libre: solo el tipo, sin '0 km'", () => {

        const week = [session("2026-08-26", "strength", 0)];
        expect(insight(week, { goal: 21 })).toBe("Hoy: fuerza.");

    });

    it("hoy sin km y de un tipo sin dato concreto que decir: no inventa una línea", () => {

        const week = [session("2026-08-26", "z2", 0)];
        expect(insight(week, { goal: 21 })).toBe("");

    });

    // Ajuste de cierre (B1): un día de series real casi nunca trae
    // distanceKm (se mide en repeticiones/tiempo) -- antes se omitía en
    // silencio como si no fuera un entreno real de hoy.
    it("hoy series (intervals) sin km real: muestra el tipo igual que fuerza/descanso/libre", () => {

        const week = [session("2026-08-26", "intervals", 0)];
        expect(insight(week, { goal: 21 })).toBe("Hoy: series.");

    });

    it("hoy series sin km, además del hito real de la semana: se combinan las dos frases", () => {

        const week = [
            session("2026-08-26", "intervals", 0),
            session("2026-08-29", "longRun", 13)
        ];

        expect(insight(week, { goal: 21 })).toBe("Hoy: series. Sábado: tirada larga · 13 km.");

    });

    it("añade la sesión clave de más adelante en la semana (más km, aún pendiente)", () => {

        const week = [
            session("2026-08-26", "z2", 8),
            session("2026-08-29", "longRun", 13)
        ];

        expect(insight(week, { goal: 21 })).toBe("Hoy: Z2 · 8 km. Sábado: tirada larga · 13 km.");

    });

    it("si la sesión clave es la de hoy, no la repite en una segunda frase", () => {

        const week = [
            session("2026-08-24", "z2", 5, "completed"),
            session("2026-08-26", "longRun", 13)
        ];

        expect(insight(week, { goal: 21 })).toBe("Hoy: tirada larga · 13 km.");

    });

    it("una sesión clave ya completada no cuenta como clave (no hay nada pendiente que destacar)", () => {

        const week = [
            session("2026-08-26", "z2", 8),
            session("2026-08-29", "longRun", 13, "completed")
        ];

        expect(insight(week, { goal: 21 })).toBe("Hoy: Z2 · 8 km.");

    });

    // Bug de coherencia real 2026-08-26: antes "hoy" se resolvía por
    // posición en el array (week[0]) cuando no había running programado
    // hoy -- podía mostrar el lunes como si fuera el jueves real.
    describe("coherencia con Plan -- sin running hoy", () => {

        it("sin running hoy, con gimnasio programado hoy (Plan): lo dice explícitamente, no otro día", () => {

            const week = [
                session("2026-08-24", "z2", 5), // lunes -- NO es hoy
                session("2026-08-29", "longRun", 13) // sábado -- clave real
            ];

            const todayGymMatch = { day: { id: "d1", title: "Pierna" } };

            expect(insight(week, { goal: 21, todayGymMatch })).toBe("Hoy: Pierna · Gym. Sábado: tirada larga · 13 km.");

        });

        it("sin running hoy y sin gimnasio programado hoy tampoco: omite 'Hoy' del todo, nunca otro día", () => {

            const week = [
                session("2026-08-24", "z2", 5), // lunes -- pasado, no debería aparecer como "hoy" ni como clave
                session("2026-08-29", "longRun", 13)
            ];

            const html = insight(week, { goal: 21, todayGymMatch: null });

            expect(html).not.toContain("lunes");
            expect(html).not.toContain("Lunes");
            expect(html).toBe("Sábado: tirada larga · 13 km.");

        });

        it("running Y gimnasio programados hoy a la vez: combina las dos piezas con \"+\", nunca solo una", () => {

            const week = [session("2026-08-26", "z2", 8)];
            const todayGymMatch = { day: { id: "d1", title: "Pierna" } };

            expect(insight(week, { goal: 8, todayGymMatch })).toBe("Hoy: Z2 · 8 km + Pierna · Gym.");

        });

        it("una sesión de un día YA PASADO nunca cuenta como 'sesión clave' aunque tenga más km que las futuras", () => {

            const week = [
                session("2026-08-24", "longRun", 30), // lunes, pasado -- no debe elegirse
                session("2026-08-29", "z2", 5) // sábado, futuro -- esta sí
            ];

            expect(insight(week, { goal: 35, todayGymMatch: null })).toBe("Sábado: Z2 · 5 km.");

        });

    });

});
