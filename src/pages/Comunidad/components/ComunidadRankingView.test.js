import { describe, it, expect } from "vitest";
import { ComunidadRankingView } from "./ComunidadRankingView.js";

const TODAY_ISO = new Date().toISOString().slice(0, 10);

function entreno(overrides) {
    return { alias: "alguien", id: "w", type: "easy", date: TODAY_ISO, distanceKm: null, avgPaceSecPerKm: null, ...overrides };
}

describe("ComunidadRankingView -- 4 tablas a partir de la misma lista de Mapas", () => {

    it("idle/loading muestran un aviso de carga", () => {

        expect(ComunidadRankingView({ status: "idle", entrenos: [] }, null)).toContain("Cargando");
        expect(ComunidadRankingView({ status: "loading", entrenos: [] }, null)).toContain("Cargando");

    });

    it("unavailable muestra un estado de error con el mismo botón de reintentar que Mapas", () => {

        const html = ComunidadRankingView({ status: "unavailable", entrenos: [] }, null);

        expect(html).toContain("No se pudo cargar el ranking");
        expect(html).toContain('data-action="retry-comunidad-entrenos"');

    });

    it("ready sin ningún entreno muestra las 4 tablas, cada una con su propio aviso de \"sin datos\"", () => {

        const html = ComunidadRankingView({ status: "ready", entrenos: [] }, null);

        expect(html).toContain("Ritmo más rápido");
        expect(html).toContain("Z2 mejor ejecutada");
        expect(html).toContain("Más constante");
        expect(html).toContain("Mejor tirada larga");
        expect((html.match(/Sin datos esta ventana/g) || []).length).toBe(4);

    });

    it("pinta alias, valor formateado y resalta la fila del usuario propio", () => {

        const entrenos = [
            entreno({ alias: "Rafa", type: "long", distanceKm: 21.5 }),
            entreno({ alias: "Ana", type: "long", distanceKm: 18 })
        ];

        const html = ComunidadRankingView({ status: "ready", entrenos }, "Rafa");

        expect(html).toContain("Rafa");
        expect(html).toContain("21,5 km");
        expect(html).toMatch(/is-mine[^>]*>[\s\S]*?Rafa/);

    });

    it("sin alias propio configurado (null), no resalta ninguna fila -- nunca adivina cuál sería", () => {

        const entrenos = [entreno({ alias: "Ana", type: "long", distanceKm: 18 })];
        const html = ComunidadRankingView({ status: "ready", entrenos }, null);

        expect(html).not.toContain("is-mine");

    });

    it("formatea el ritmo como min:seg/km y el % de Z2 con un decimal (coma española)", () => {

        const entrenos = [
            entreno({ alias: "Rafa", type: "long", distanceKm: 20, avgPaceSecPerKm: 330 }),
            entreno({ alias: "Rafa", type: "easy", z2TimeInZonePercent: 66.7 })
        ];

        const html = ComunidadRankingView({ status: "ready", entrenos }, null);

        expect(html).toContain("5:30/km");
        expect(html).toContain("66,7%");

    });

    it("pluraliza \"1 entreno\" en singular en Más constante", () => {

        const entrenos = [entreno({ alias: "Rafa", type: "long" })];
        const html = ComunidadRankingView({ status: "ready", entrenos }, null);

        expect(html).toContain("1 entreno<");
        expect(html).not.toContain("1 entrenos");

    });

    it("escapa el alias -- es texto libre de otro usuario", () => {

        const entrenos = [entreno({ alias: "<img src=x onerror=alert(1)>", type: "long", distanceKm: 20 })];
        const html = ComunidadRankingView({ status: "ready", entrenos }, null);

        expect(html).not.toContain("<img src=x");
        expect(html).toContain("&lt;img");

    });

});
