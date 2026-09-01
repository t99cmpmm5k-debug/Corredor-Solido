import { describe, it, expect } from "vitest";
import { ReferenceRouteCard } from "./ReferenceRouteCard.js";

function workout(overrides = {}) {
    return {
        id: "w1",
        date: "2026-08-20",
        type: "easy",
        avgPaceSecPerKm: null,
        avgHr: null,
        temperatureC: null,
        splits: [],
        ...overrides
    };
}

describe("ReferenceRouteCard -- tarjeta resumen de un recorrido de referencia", () => {

    it("recorrido sin entrenos: nombre + aviso de asignación, sin líneas de datos", () => {

        const html = ReferenceRouteCard({ id: "r1", name: "8K referencia" }, []);

        expect(html).toContain("8K referencia");
        expect(html).toContain("Sin entrenos asignados todavía");
        expect(html).not.toContain("Último:");
        expect(html).not.toContain("Mejor eficiencia:");

    });

    it("un solo entreno: 'Último' y 'Mejor eficiencia' son el mismo, sin tendencia (nada que comparar)", () => {

        const w = workout({ avgPaceSecPerKm: 349, avgHr: 151, temperatureC: 29 });
        const html = ReferenceRouteCard({ id: "r1", name: "8K referencia" }, [w]);

        expect(html).toContain("Último: <strong>5:49/km · 151 ppm · 29°C</strong>");
        expect(html).toContain("Mejor eficiencia: <strong>5:49/km · 151 ppm</strong>");
        expect(html).not.toContain("Tendencia");

    });

    it("varios entrenos con FC similar: tendencia real en s/km respecto al mejor registro", () => {

        const best = workout({ id: "best", date: "2026-08-10", avgPaceSecPerKm: 333, avgHr: 150 }); // 5:33/km
        const last = workout({ id: "last", date: "2026-08-20", avgPaceSecPerKm: 349, avgHr: 151, temperatureC: 29 }); // 5:49/km

        const html = ReferenceRouteCard({ id: "r1", name: "8K referencia" }, [best, last]);

        expect(html).toContain("Último: <strong>5:49/km · 151 ppm · 29°C</strong>");
        expect(html).toContain("Mejor eficiencia: <strong>5:33/km · 150 ppm</strong>");
        expect(html).toContain("Tendencia: <strong>+16 s/km</strong> respecto al mejor registro");

    });

    it("solo 2 entrenos con FC muy dispersa entre sí: no hay 'mejor eficiencia' que resumir, lo explica en vez de callar", () => {

        const a = workout({ id: "a", date: "2026-08-10", avgPaceSecPerKm: 333, avgHr: 150 });
        const b = workout({ id: "b", date: "2026-08-20", avgPaceSecPerKm: 320, avgHr: 172 }); // día muy caluroso/duro

        const html = ReferenceRouteCard({ id: "r1", name: "8K referencia" }, [a, b]);

        expect(html).not.toMatch(/Tendencia: <strong>[+-]?\d+ s\/km<\/strong>/);
        expect(html).not.toContain("Mejor eficiencia: <strong>");
        expect(html).toContain("FC demasiado dispersa");

    });

    it("con un grupo comparable real pero el ÚLTIMO entreno queda fuera de él (día muy distinto): tendencia con la FC de contexto, sin forzar un delta de ritmo", () => {

        // Cluster real a ~150-151 ppm (dos entrenos comparables entre sí);
        // el último de todos es un outlier a 172 ppm.
        const a = workout({ id: "a", date: "2026-08-01", avgPaceSecPerKm: 349, avgHr: 151 });
        const best = workout({ id: "best", date: "2026-08-10", avgPaceSecPerKm: 333, avgHr: 150 });
        const last = workout({ id: "last", date: "2026-08-20", avgPaceSecPerKm: 320, avgHr: 172 });

        const html = ReferenceRouteCard({ id: "r1", name: "8K referencia" }, [a, best, last]);

        expect(html).toContain("Mejor eficiencia: <strong>5:33/km · 150 ppm</strong>");
        expect(html).not.toMatch(/Tendencia: <strong>[+-]?\d+ s\/km<\/strong>/);
        expect(html).toContain("FC muy distinta al mejor registro");
        expect(html).toContain("172 ppm");
        expect(html).toContain("150 ppm");

    });

    it("deriva FC solo se muestra si el mejor entreno la tiene calculable (type 'easy' + suficientes splits con FC)", () => {

        const splits = Array.from({ length: 6 }, (_, i) => ({ avgHr: 150 + i, segmentType: null }));
        const best = workout({ avgPaceSecPerKm: 333, avgHr: 150, type: "easy", splits });

        const html = ReferenceRouteCard({ id: "r1", name: "8K referencia" }, [best]);

        expect(html).toContain("Deriva FC:");

    });

    it("sin deriva calculable (tipo distinto de 'easy'), no aparece esa línea", () => {

        const best = workout({ avgPaceSecPerKm: 333, avgHr: 150, type: "tempo", splits: [] });
        const html = ReferenceRouteCard({ id: "r1", name: "8K referencia" }, [best]);

        expect(html).not.toContain("Deriva FC:");

    });

    it("nunca inventa datos que faltan -- un entreno sin FC solo omite esa parte de la línea, no la reemplaza por un placeholder falso", () => {

        const w = workout({ avgPaceSecPerKm: 349, avgHr: null, temperatureC: null });
        const html = ReferenceRouteCard({ id: "r1", name: "8K referencia" }, [w]);

        expect(html).toContain("Último: <strong>5:49/km</strong>");
        expect(html).not.toContain("null");
        expect(html).not.toContain("ppm");

    });

    it("linkToDetail añade data-action y data-route-id a la tarjeta entera", () => {

        const html = ReferenceRouteCard({ id: "r1", name: "8K referencia" }, [], { linkToDetail: true });

        expect(html).toContain('data-action="open-reference-route-detail"');
        expect(html).toContain('data-route-id="r1"');

    });

    it("sin linkToDetail, no lleva ese data-action (la tarjeta ya está dentro del detalle)", () => {

        const html = ReferenceRouteCard({ id: "r1", name: "8K referencia" }, []);
        expect(html).not.toContain('data-action="open-reference-route-detail"');

    });

});
