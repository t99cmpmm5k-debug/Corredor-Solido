import { describe, it, expect } from "vitest";
import { ComunidadRankingView } from "./ComunidadRankingView.js";
import { formatISODate } from "../../../utils/date.js";

const TODAY_ISO = formatISODate(new Date());

function entreno(overrides) {
    return { alias: "alguien", id: "w", type: "easy", date: TODAY_ISO, distanceKm: null, avgPaceSecPerKm: null, ...overrides };
}

describe("ComunidadRankingView -- 5 tablas a partir de la misma lista de Actividad", () => {

    it("idle/loading muestran un aviso de carga", () => {

        expect(ComunidadRankingView({ status: "idle", entrenos: [] }, null)).toContain("Cargando");
        expect(ComunidadRankingView({ status: "loading", entrenos: [] }, null)).toContain("Cargando");

    });

    it("unavailable muestra un estado de error con el mismo botón de reintentar que Actividad", () => {

        const html = ComunidadRankingView({ status: "unavailable", entrenos: [] }, null);

        expect(html).toContain("No se pudo cargar el ranking");
        expect(html).toContain('data-action="retry-comunidad-entrenos"');

    });

    it("ready sin ningún entreno muestra las 5 tablas, cada una con su propio aviso de \"sin datos\"", () => {

        const html = ComunidadRankingView({ status: "ready", entrenos: [] }, null);

        expect(html).toContain("Mejor ritmo medio");
        expect(html).toContain("Z2 mejor ejecutada");
        expect(html).toContain("Más constante");
        expect(html).toContain("Mejor tirada larga");
        expect(html).toContain("Ranking Sólido");
        expect((html.match(/Sin datos esta ventana/g) || []).length).toBe(5);

    });

    it("pinta el selector de periodo con \"Semana\" activa por defecto", () => {

        const html = ComunidadRankingView({ status: "ready", entrenos: [] }, null);

        expect(html).toMatch(/data-period="week"[^>]*is-active|is-active"[^>]*data-period="week"/);
        expect(html).toContain("Semana");
        expect(html).toContain("Mes");
        expect(html).toContain("Histórico");

    });

    it("respeta el periodo que se le pase, marcándolo como activo", () => {

        const html = ComunidadRankingView({ status: "ready", entrenos: [] }, null, "month");

        expect(html).toMatch(/data-period="month"[^>]*is-active|is-active"[^>]*data-period="month"/);

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

    it("sin alias propio configurado (null), no resalta ninguna fila ni pinta la tarjeta resumen", () => {

        const entrenos = [entreno({ alias: "Ana", type: "long", distanceKm: 18 })];
        const html = ComunidadRankingView({ status: "ready", entrenos }, null);

        expect(html).not.toContain("is-mine");
        expect(html).not.toContain("comunidad-ranking-summary-card");

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

    it("pluraliza \"1 sesión\" en singular en Más constante (ya no \"entreno\")", () => {

        const entrenos = [entreno({ alias: "Rafa", type: "long" })];
        const html = ComunidadRankingView({ status: "ready", entrenos }, null);

        expect(html).toContain("1 sesión<");
        expect(html).not.toContain("1 sesiones");
        expect(html).not.toContain("1 entreno");

    });

    it("escapa el alias -- es texto libre de otro usuario", () => {

        const entrenos = [entreno({ alias: "<img src=x onerror=alert(1)>", type: "long", distanceKm: 20 })];
        const html = ComunidadRankingView({ status: "ready", entrenos }, null);

        expect(html).not.toContain("<img src=x");
        expect(html).toContain("&lt;img");

    });

    it("Mejor ritmo medio lleva el contexto (distancia · fecha) del entreno concreto", () => {

        const entrenos = [entreno({ alias: "Rafa", type: "long", distanceKm: 10, avgPaceSecPerKm: 300, date: "2026-09-21" })];
        const html = ComunidadRankingView({ status: "ready", entrenos }, null);

        expect(html).toMatch(/comunidad-ranking-context[^>]*>10 km · 21 SEPT/);

    });

    it("Mejor tirada larga lleva el contexto (fecha) del entreno concreto", () => {

        const entrenos = [entreno({ alias: "Rafa", type: "long", distanceKm: 25, date: "2026-09-21" })];
        const html = ComunidadRankingView({ status: "ready", entrenos }, null);

        expect(html).toMatch(/comunidad-ranking-context[^>]*>21 SEPT/);

    });

    it("Ranking Sólido no muestra ninguna puntuación cruda, solo posición y alias", () => {

        const entrenos = [entreno({ alias: "Rafa", type: "long", distanceKm: 20 })];
        const html = ComunidadRankingView({ status: "ready", entrenos }, null);

        const solidSection = html.slice(html.indexOf("Ranking Sólido"));
        expect(solidSection).not.toContain("comunidad-ranking-value");

    });

    it("un usuario fuera del top 5 de una tabla aparece igualmente, con su posición real y un separador", () => {

        const entrenos = [
            ...Array.from({ length: 5 }, (_, i) => entreno({ alias: `u${i}`, type: "long", distanceKm: 30 - i })),
            entreno({ alias: "Rafa", type: "long", distanceKm: 5 })
        ];

        const html = ComunidadRankingView({ status: "ready", entrenos }, "Rafa");

        expect(html).toContain("comunidad-ranking-own-divider");
        expect(html).toMatch(/is-mine[^>]*>[\s\S]*?<span class="comunidad-ranking-position">6<\/span>[\s\S]*?Rafa/);

    });

    it("un usuario dentro del top 5 no pinta el separador de fila propia añadida aparte", () => {

        const entrenos = [entreno({ alias: "Rafa", type: "long", distanceKm: 25 })];
        const html = ComunidadRankingView({ status: "ready", entrenos }, "Rafa");

        expect(html).not.toContain("comunidad-ranking-own-divider");

    });

    it("el 1er puesto lleva la clase de podio de oro, el 2º y 3º la de plata/bronce, el resto ninguna", () => {

        const entrenos = Array.from({ length: 4 }, (_, i) => entreno({ alias: `u${i}`, type: "long", distanceKm: 30 - i }));
        const html = ComunidadRankingView({ status: "ready", entrenos }, null);

        expect(html).toContain("is-podium-1");
        expect(html).toContain("is-podium-2-3");

    });

    it("con un alias propio configurado y actividad real esta ventana, pinta la tarjeta resumen con posición/km/sesiones", () => {

        const entrenos = [
            entreno({ alias: "Rafa", type: "long", distanceKm: 20 }),
            entreno({ alias: "Rafa", type: "easy", distanceKm: 8 })
        ];

        const html = ComunidadRankingView({ status: "ready", entrenos }, "Rafa");

        expect(html).toContain("Tu semana");
        expect(html).toContain("1.º general");
        expect(html).toContain("28 km");
        expect(html).toContain("2 sesiones");

    });

    it("con alias propio pero sin actividad esta ventana, la tarjeta resumen lo dice sin inventar una posición", () => {

        const entrenos = [entreno({ alias: "Ana", type: "long", distanceKm: 20 })];
        const html = ComunidadRankingView({ status: "ready", entrenos }, "Rafa");

        expect(html).toContain("Sin actividad esta ventana");

    });

});
