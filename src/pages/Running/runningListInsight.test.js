import { describe, it, expect } from "vitest";
import { buildListInsight } from "./runningListInsight.js";

const NOW = new Date("2026-08-15T12:00:00");

function w(date, distanceKm, avgPaceSecPerKm = null) {
    return { date, distanceKm, avgPaceSecPerKm };
}

describe("buildListInsight -- tarjeta de insight sobre la lista de Running", () => {

    it("sin entrenos, devuelve null", () => {

        const result = buildListInsight({ filteredWorkouts: [], now: NOW });
        expect(result).toBeNull();

    });

    // Las variantes de conteo+km del mes y de % de zapatilla más usada se
    // quitaron (2026-09-24) -- repetían datos que ya se ven en Inicio
    // (MonthlyKmWidget) y en Kilometraje de zapatillas respectivamente.
    // Ver comentario de cabecera de runningListInsight.js.
    it("con entrenos reales pero sin ritmo, ninguna variante tiene dato real -- null", () => {

        const filteredWorkouts = [w("2026-08-01", 8), w("2026-08-10", 10)];

        const result = buildListInsight({ filteredWorkouts, now: NOW });

        expect(result).toBeNull();

    });

    it("mejor ritmo real: usa el mínimo (más rápido) de los disponibles", () => {

        const filteredWorkouts = [w("2026-05-01", 8, 320), w("2026-05-02", 8, 290), w("2026-05-03", 8, 305)];

        const result = buildListInsight({ filteredWorkouts, now: NOW });

        expect(result.text).toContain("4:50/km");

    });

    it("es determinista para el mismo día (mismo resultado en dos llamadas seguidas)", () => {

        const filteredWorkouts = [w("2026-08-01", 8, 300), w("2026-08-02", 8, 290)];

        const first = buildListInsight({ filteredWorkouts, now: NOW });
        const second = buildListInsight({ filteredWorkouts, now: NOW });

        expect(first).toEqual(second);

    });

});
