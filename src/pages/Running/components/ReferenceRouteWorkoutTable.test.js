import { describe, it, expect } from "vitest";
import { ReferenceRouteWorkoutTable } from "./ReferenceRouteWorkoutTable.js";

function workout(overrides = {}) {
    return {
        id: "w1", date: "2026-08-01",
        avgPaceSecPerKm: 349, avgHr: 151, temperatureC: 29, avgCadence: 172,
        type: "easy", splits: [],
        ...overrides
    };
}

describe("ReferenceRouteWorkoutTable -- tabla ordenable de un recorrido", () => {

    it("sin entrenos, no pinta nada", () => {

        expect(ReferenceRouteWorkoutTable([], "date", "desc")).toBe("");

    });

    it("una fila por entreno, con las 6 columnas pedidas + acción de quitar", () => {

        const html = ReferenceRouteWorkoutTable([workout()], "date", "desc");

        expect(html).toContain("FECHA");
        expect(html).toContain("RITMO");
        expect(html).toContain("FC");
        expect(html).toContain("TEMP.");
        expect(html).toContain("DERIVA");
        expect(html).toContain("CAD.");
        expect(html).toContain("5:49/km");
        expect(html).toContain("151 ppm");
        expect(html).toContain("29°C");
        expect(html).toContain("172 spm");
        expect(html).toContain('data-action="unassign-workout-from-route"');
        expect(html).toContain('data-action="open-detail"');

    });

    it("ordena por fecha ascendente/descendente según se pida", () => {

        const older = workout({ id: "w1", date: "2026-08-01" });
        const newer = workout({ id: "w2", date: "2026-08-20" });

        const desc = ReferenceRouteWorkoutTable([older, newer], "date", "desc");
        expect(desc.indexOf('data-workout-id="w2"')).toBeLessThan(desc.indexOf('data-workout-id="w1"'));

        const asc = ReferenceRouteWorkoutTable([older, newer], "date", "asc");
        expect(asc.indexOf('data-workout-id="w1"')).toBeLessThan(asc.indexOf('data-workout-id="w2"'));

    });

    it("ordena por ritmo, más rápido primero en descendente-numérico invertido correctamente (asc = más lento primero)", () => {

        const fast = workout({ id: "fast", avgPaceSecPerKm: 300 });
        const slow = workout({ id: "slow", avgPaceSecPerKm: 400 });

        const asc = ReferenceRouteWorkoutTable([slow, fast], "avgPaceSecPerKm", "asc");
        expect(asc.indexOf('data-workout-id="fast"')).toBeLessThan(asc.indexOf('data-workout-id="slow"'));

    });

    it("un entreno sin un dato concreto (p. ej. sin cadencia) siempre queda al final al ordenar por esa columna, en cualquier dirección", () => {

        const withCadence = workout({ id: "with", avgCadence: 170 });
        const withoutCadence = workout({ id: "without", avgCadence: null });

        const asc = ReferenceRouteWorkoutTable([withoutCadence, withCadence], "avgCadence", "asc");
        expect(asc.indexOf('data-workout-id="with"')).toBeLessThan(asc.indexOf('data-workout-id="without"'));

        const desc = ReferenceRouteWorkoutTable([withoutCadence, withCadence], "avgCadence", "desc");
        expect(desc.indexOf('data-workout-id="with"')).toBeLessThan(desc.indexOf('data-workout-id="without"'));

    });

    it("ordena por deriva FC (calculada, no un campo guardado) sin romper con entrenos que no la tienen calculable", () => {

        const splits = Array.from({ length: 6 }, (_, i) => ({ avgHr: 150 + i, segmentType: null }));
        const withDrift = workout({ id: "with-drift", type: "easy", splits });
        const withoutDrift = workout({ id: "no-drift", type: "tempo", splits: [] });

        const html = ReferenceRouteWorkoutTable([withoutDrift, withDrift], "drift", "desc");

        expect(html).toContain('data-workout-id="with-drift"');
        expect(html).toContain('data-workout-id="no-drift"');
        expect(html).not.toContain("NaN");

    });

    it("nunca inventa datos que faltan -- celdas sin dato real muestran '—', no 'null' ni 'undefined'", () => {

        const w = workout({ avgHr: null, temperatureC: null, avgCadence: null });
        const html = ReferenceRouteWorkoutTable([w], "date", "desc");

        expect(html).not.toContain("null");
        expect(html).not.toContain("undefined");
        expect(html).not.toContain("NaN");

    });

});
