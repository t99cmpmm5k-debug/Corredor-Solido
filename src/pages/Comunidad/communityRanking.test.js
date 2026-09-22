import { describe, it, expect } from "vitest";
import { buildFastestPaceRanking, buildZ2Ranking, buildConsistencyRanking, buildLongRunRanking, buildSolidRanking } from "./communityRanking.js";
import { formatISODate, addDays, getWeekStartDate } from "../../utils/date.js";

// Miércoles a propósito (no lunes/domingo) -- deja margen real dentro y
// fuera de la semana ISO actual en los dos sentidos.
const TODAY = new Date(2026, 8, 23);
const todayISO = formatISODate(TODAY);
const weekStartISO = getWeekStartDate(todayISO);

const inWeek = addDays(todayISO, -1); // ayer, dentro de la semana ISO actual
const outOfWeek = addDays(weekStartISO, -1); // lunes anterior, ya fuera
const inMonthOutOfWeek = `${todayISO.slice(0, 7)}-01`; // día 1 del mes actual
const outOfMonth = addDays(`${todayISO.slice(0, 7)}-01`, -3); // últimos días del mes anterior

const weekOpts = { referenceDate: TODAY, period: "week" };
const monthOpts = { referenceDate: TODAY, period: "month" };
const allOpts = { referenceDate: TODAY, period: "all" };

function entreno(overrides) {
    return { alias: "alguien", id: "w", type: "easy", date: inWeek, distanceKm: null, avgPaceSecPerKm: null, ...overrides };
}

describe("periodos -- week/month/all filtran la misma lista de formas distintas", () => {

    it("\"week\" descarta un entreno de antes del lunes de esta semana", () => {

        const entrenos = [entreno({ alias: "Ana", distanceKm: 10, avgPaceSecPerKm: 280, date: outOfWeek })];
        expect(buildFastestPaceRanking(entrenos, weekOpts)).toEqual([]);

    });

    it("\"month\" SÍ cuenta un entreno de principios de mes que \"week\" ya descartaría", () => {

        const entrenos = [entreno({ alias: "Ana", distanceKm: 10, avgPaceSecPerKm: 280, date: inMonthOutOfWeek })];

        expect(buildFastestPaceRanking(entrenos, weekOpts)).toEqual([]);
        expect(buildFastestPaceRanking(entrenos, monthOpts)).toHaveLength(1);

    });

    it("\"month\" descarta un entreno de antes del día 1 del mes actual", () => {

        const entrenos = [entreno({ alias: "Ana", distanceKm: 10, avgPaceSecPerKm: 280, date: outOfMonth })];
        expect(buildFastestPaceRanking(entrenos, monthOpts)).toEqual([]);

    });

    it("\"all\" cuenta cualquier entreno con fecha, por antiguo que sea", () => {

        const entrenos = [entreno({ alias: "Ana", distanceKm: 10, avgPaceSecPerKm: 280, date: "2020-01-01" })];
        expect(buildFastestPaceRanking(entrenos, allOpts)).toHaveLength(1);

    });

    it("sin period explícito, se comporta como \"week\" (valor por defecto)", () => {

        const entrenos = [entreno({ alias: "Ana", distanceKm: 10, avgPaceSecPerKm: 280, date: outOfWeek })];
        expect(buildFastestPaceRanking(entrenos, { referenceDate: TODAY })).toEqual([]);

    });

});

describe("buildFastestPaceRanking -- mejor avgPaceSecPerKm, distanceKm >= 5, cualquier tipo", () => {

    it("ignora entrenos por debajo de 5 km", () => {

        const entrenos = [entreno({ alias: "Ana", distanceKm: 4.9, avgPaceSecPerKm: 250 })];
        expect(buildFastestPaceRanking(entrenos, weekOpts)).toEqual([]);

    });

    it("un usuario con varios entrenos válidos aparece una sola vez, con su MEJOR (más bajo) ritmo, y el entreno que lo produjo", () => {

        const entrenos = [
            entreno({ alias: "Ana", distanceKm: 10, avgPaceSecPerKm: 300, date: inWeek }),
            entreno({ alias: "Ana", distanceKm: 8, avgPaceSecPerKm: 280, date: todayISO })
        ];

        const rows = buildFastestPaceRanking(entrenos, weekOpts);
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ alias: "Ana", value: 280 });
        expect(rows[0].entreno).toMatchObject({ distanceKm: 8, date: todayISO });

    });

    it("ordena de más rápido (número más bajo) a más lento, SIN recortar a 5 -- eso es cosa de la vista", () => {

        const entrenos = Array.from({ length: 8 }, (_, i) => entreno({ alias: `u${i}`, distanceKm: 10, avgPaceSecPerKm: 300 + i }));
        const rows = buildFastestPaceRanking(entrenos, weekOpts);

        expect(rows).toHaveLength(8);
        expect(rows[0].alias).toBe("u0");
        expect(rows[7].alias).toBe("u7");

    });

});

describe("buildZ2Ranking -- mayor z2TimeInZonePercent, solo type easy", () => {

    it("ignora entrenos que no son easy, aunque tengan el campo", () => {

        const entrenos = [entreno({ alias: "Ana", type: "series", z2TimeInZonePercent: 90 })];
        expect(buildZ2Ranking(entrenos, weekOpts)).toEqual([]);

    });

    it("un easy sin z2TimeInZonePercent (splits insuficientes) no cuenta -- nunca inventa un 0", () => {

        const entrenos = [entreno({ alias: "Ana", type: "easy", z2TimeInZonePercent: undefined })];
        expect(buildZ2Ranking(entrenos, weekOpts)).toEqual([]);

    });

    it("ordena de mayor a menor porcentaje", () => {

        const entrenos = [
            entreno({ alias: "Baja", type: "easy", z2TimeInZonePercent: 40 }),
            entreno({ alias: "Alta", type: "easy", z2TimeInZonePercent: 85.5 })
        ];

        expect(buildZ2Ranking(entrenos, weekOpts).map(r => r.alias)).toEqual(["Alta", "Baja"]);

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

        expect(buildConsistencyRanking(entrenos, weekOpts)).toEqual([
            { alias: "Ana", value: 3 },
            { alias: "Luis", value: 1 }
        ]);

    });

    it("descarta entrenos fuera de la ventana al contar", () => {

        const entrenos = [
            entreno({ alias: "Ana", date: inWeek }),
            entreno({ alias: "Ana", date: outOfWeek })
        ];

        expect(buildConsistencyRanking(entrenos, weekOpts)).toEqual([{ alias: "Ana", value: 1 }]);

    });

});

describe("buildLongRunRanking -- mayor distanceKm, solo type long", () => {

    it("ignora entrenos que no son long", () => {

        const entrenos = [entreno({ alias: "Ana", type: "easy", distanceKm: 30 })];
        expect(buildLongRunRanking(entrenos, weekOpts)).toEqual([]);

    });

    it("ordena de mayor a menor distancia, con el entreno de contexto (fecha)", () => {

        const entrenos = [
            entreno({ alias: "Corta", type: "long", distanceKm: 15, date: todayISO }),
            entreno({ alias: "Larga", type: "long", distanceKm: 25, date: inWeek })
        ];

        const rows = buildLongRunRanking(entrenos, weekOpts);
        expect(rows.map(r => r.alias)).toEqual(["Larga", "Corta"]);
        expect(rows[0].entreno.date).toBe(inWeek);

    });

});

describe("las tablas -- sin ningún usuario con datos válidos, devuelven una lista vacía (nunca rompen)", () => {

    it("todas devuelven [] con un array vacío de entrenos", () => {

        expect(buildFastestPaceRanking([], weekOpts)).toEqual([]);
        expect(buildZ2Ranking([], weekOpts)).toEqual([]);
        expect(buildConsistencyRanking([], weekOpts)).toEqual([]);
        expect(buildLongRunRanking([], weekOpts)).toEqual([]);
        expect(buildSolidRanking([], weekOpts)).toEqual([]);

    });

});

describe("buildSolidRanking -- compuesto de constancia (45%) + Z2 (35%) + tirada larga (20%)", () => {

    it("un usuario que gana claramente en los 3 factores queda primero", () => {

        const entrenos = [

            // Ana: 3 sesiones, mejor Z2, mejor tirada larga -- gana en todo.
            entreno({ alias: "Ana", type: "easy", z2TimeInZonePercent: 90 }),
            entreno({ alias: "Ana", type: "long", distanceKm: 25 }),
            entreno({ alias: "Ana", type: "series" }),

            // Luis: 1 sola sesión, peor en todo lo demás.
            entreno({ alias: "Luis", type: "easy", z2TimeInZonePercent: 30 })

        ];

        const rows = buildSolidRanking(entrenos, weekOpts);
        expect(rows[0].alias).toBe("Ana");

    });

    it("la constancia sola basta para entrar en el compuesto aunque falten Z2/tirada larga", () => {

        const entrenos = [
            entreno({ alias: "Ana", type: "series" }),
            entreno({ alias: "Ana", type: "series" })
        ];

        const rows = buildSolidRanking(entrenos, weekOpts);
        expect(rows).toHaveLength(1);
        expect(rows[0].alias).toBe("Ana");

    });

    it("nunca expone la puntuación cruda de ponderación al llamante -- solo alias/value ordenable", () => {

        const entrenos = [entreno({ alias: "Ana", type: "long", distanceKm: 20 })];
        const rows = buildSolidRanking(entrenos, weekOpts);

        expect(typeof rows[0].value).toBe("number");
        expect(rows[0].value).toBeGreaterThan(0);
        expect(rows[0].value).toBeLessThanOrEqual(1);

    });

    it("dos usuarios con exactamente los mismos 3 factores devuelven la misma puntuación", () => {

        const entrenos = [
            entreno({ alias: "Ana", type: "easy", z2TimeInZonePercent: 70 }),
            entreno({ alias: "Ana", type: "long", distanceKm: 18 }),
            entreno({ alias: "Luis", type: "easy", z2TimeInZonePercent: 70 }),
            entreno({ alias: "Luis", type: "long", distanceKm: 18 })
        ];

        const rows = buildSolidRanking(entrenos, weekOpts);
        expect(rows[0].value).toBeCloseTo(rows[1].value, 10);

    });

});
