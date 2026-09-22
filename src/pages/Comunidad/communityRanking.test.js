import { describe, it, expect } from "vitest";
import { buildFastestPaceRanking, buildZ2Ranking, buildConsistencyRanking, buildLongRunRanking } from "./communityRanking.js";
import { formatISODate, addDays } from "../../utils/date.js";

// Fecha fija para no depender del reloj real de la máquina que ejecute los
// tests -- mismo patrón que buildAcwrInsight() (utils/acwr.js).
const TODAY = new Date(2026, 8, 22);
const todayISO = formatISODate(TODAY);
const inWindow = addDays(todayISO, -10);
const outOfWindow = addDays(todayISO, -40); // más de 4 semanas (28 días) atrás

const opts = { referenceDate: TODAY };

function entreno(overrides) {
    return { alias: "alguien", id: "w", type: "easy", date: inWindow, distanceKm: null, avgPaceSecPerKm: null, ...overrides };
}

describe("buildFastestPaceRanking -- mejor avgPaceSecPerKm, distanceKm >= 5, cualquier tipo", () => {

    it("ignora entrenos por debajo de 5 km", () => {

        const entrenos = [entreno({ alias: "Ana", distanceKm: 4.9, avgPaceSecPerKm: 250 })];
        expect(buildFastestPaceRanking(entrenos, opts)).toEqual([]);

    });

    it("un usuario con varios entrenos válidos aparece una sola vez, con su MEJOR (más bajo) ritmo", () => {

        const entrenos = [
            entreno({ alias: "Ana", distanceKm: 10, avgPaceSecPerKm: 300 }),
            entreno({ alias: "Ana", distanceKm: 8, avgPaceSecPerKm: 280 })
        ];

        expect(buildFastestPaceRanking(entrenos, opts)).toEqual([{ alias: "Ana", value: 280 }]);

    });

    it("ordena de más rápido (número más bajo) a más lento", () => {

        const entrenos = [
            entreno({ alias: "Lento", distanceKm: 10, avgPaceSecPerKm: 400 }),
            entreno({ alias: "Rapido", distanceKm: 10, avgPaceSecPerKm: 250 })
        ];

        expect(buildFastestPaceRanking(entrenos, opts).map(r => r.alias)).toEqual(["Rapido", "Lento"]);

    });

    it("descarta entrenos fuera de la ventana de 4 semanas", () => {

        const entrenos = [entreno({ alias: "Ana", distanceKm: 10, avgPaceSecPerKm: 280, date: outOfWindow })];
        expect(buildFastestPaceRanking(entrenos, opts)).toEqual([]);

    });

    it("se corta en 5 puestos", () => {

        const entrenos = Array.from({ length: 8 }, (_, i) => entreno({ alias: `u${i}`, distanceKm: 10, avgPaceSecPerKm: 300 + i }));
        expect(buildFastestPaceRanking(entrenos, opts)).toHaveLength(5);

    });

});

describe("buildZ2Ranking -- mayor z2TimeInZonePercent, solo type easy", () => {

    it("ignora entrenos que no son easy, aunque tengan el campo", () => {

        const entrenos = [entreno({ alias: "Ana", type: "series", z2TimeInZonePercent: 90 })];
        expect(buildZ2Ranking(entrenos, opts)).toEqual([]);

    });

    it("un easy sin z2TimeInZonePercent (splits insuficientes) no cuenta -- nunca inventa un 0", () => {

        const entrenos = [entreno({ alias: "Ana", type: "easy", z2TimeInZonePercent: undefined })];
        expect(buildZ2Ranking(entrenos, opts)).toEqual([]);

    });

    it("ordena de mayor a menor porcentaje", () => {

        const entrenos = [
            entreno({ alias: "Baja", type: "easy", z2TimeInZonePercent: 40 }),
            entreno({ alias: "Alta", type: "easy", z2TimeInZonePercent: 85.5 })
        ];

        expect(buildZ2Ranking(entrenos, opts).map(r => r.alias)).toEqual(["Alta", "Baja"]);

    });

});

describe("buildConsistencyRanking -- más entrenos totales, cualquier tipo", () => {

    it("cuenta entrenos de cualquier tipo, no solo running easy", () => {

        const entrenos = [
            entreno({ alias: "Ana", type: "easy" }),
            entreno({ alias: "Ana", type: "long" }),
            entreno({ alias: "Ana", type: "series" }),
            entreno({ alias: "Luis", type: "easy" })
        ];

        expect(buildConsistencyRanking(entrenos, opts)).toEqual([
            { alias: "Ana", value: 3 },
            { alias: "Luis", value: 1 }
        ]);

    });

    it("descarta entrenos fuera de la ventana al contar", () => {

        const entrenos = [
            entreno({ alias: "Ana", date: inWindow }),
            entreno({ alias: "Ana", date: outOfWindow })
        ];

        expect(buildConsistencyRanking(entrenos, opts)).toEqual([{ alias: "Ana", value: 1 }]);

    });

});

describe("buildLongRunRanking -- mayor distanceKm, solo type long", () => {

    it("ignora entrenos que no son long", () => {

        const entrenos = [entreno({ alias: "Ana", type: "easy", distanceKm: 30 })];
        expect(buildLongRunRanking(entrenos, opts)).toEqual([]);

    });

    it("ordena de mayor a menor distancia", () => {

        const entrenos = [
            entreno({ alias: "Corta", type: "long", distanceKm: 15 }),
            entreno({ alias: "Larga", type: "long", distanceKm: 25 })
        ];

        expect(buildLongRunRanking(entrenos, opts).map(r => r.alias)).toEqual(["Larga", "Corta"]);

    });

});

describe("las 4 tablas -- sin ningún usuario con datos válidos, devuelven una lista vacía (nunca rompen)", () => {

    it("todas devuelven [] con un array vacío de entrenos", () => {

        expect(buildFastestPaceRanking([], opts)).toEqual([]);
        expect(buildZ2Ranking([], opts)).toEqual([]);
        expect(buildConsistencyRanking([], opts)).toEqual([]);
        expect(buildLongRunRanking([], opts)).toEqual([]);

    });

});
