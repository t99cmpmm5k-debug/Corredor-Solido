import { describe, it, expect } from "vitest";
import { ComunidadActividadView } from "./ComunidadActividadView.js";

const withTrace = (alias, id, overrides = {}) => ({
    alias, id, date: "2026-09-15", type: "easy", distanceKm: 8, avgPaceSecPerKm: 330, durationSec: 2640,
    routeTrace: [{ lat: 37.9, lon: -1.1 }, { lat: 37.91, lon: -1.11 }], ...overrides
});

const withoutTrace = (alias, id, overrides = {}) => ({
    alias, id, date: "2026-09-14", type: "series", distanceKm: 5, avgPaceSecPerKm: 260, durationSec: 1300, routeTrace: null,
    ...overrides
});

describe("ComunidadActividadView -- feed de TODOS los entrenos, con o sin GPS", () => {

    it("idle/loading muestran un aviso de carga", () => {

        expect(ComunidadActividadView({ status: "idle", entrenos: [] }, "")).toContain("Cargando");
        expect(ComunidadActividadView({ status: "loading", entrenos: [] }, "")).toContain("Cargando");

    });

    it("unavailable muestra un error con el mismo botón de reintentar que Mapas/Ranking", () => {

        const html = ComunidadActividadView({ status: "unavailable", entrenos: [] }, "");

        expect(html).toContain("No se pudo cargar");
        expect(html).toContain('data-action="retry-comunidad-entrenos"');

    });

    it("incluye entrenos SIN routeTrace -- a diferencia de Mapas, con un placeholder en vez de mapa", () => {

        const html = ComunidadActividadView({ status: "ready", entrenos: [withoutTrace("Ana", "w1")] }, "");

        expect(html).toContain("Ana");
        expect(html).toContain("comunidad-activity-placeholder");
        expect(html).not.toContain('id="comunidad-feed-map-0"');

    });

    it("un entreno CON routeTrace monta su contenedor de mapa y es pulsable (mismo detalle fullscreen que Mapas)", () => {

        const html = ComunidadActividadView({ status: "ready", entrenos: [withTrace("Rafa", "w1")] }, "");

        expect(html).toContain('id="comunidad-feed-map-0"');
        expect(html).toContain('data-action="open-comunidad-route-detail"');
        expect(html).toContain('data-entreno-id="w1"');

    });

    it("una tarjeta sin ruta TAMBIÉN es pulsable (abre el detalle simple, no solo las que tienen mapa)", () => {

        const html = ComunidadActividadView({ status: "ready", entrenos: [withoutTrace("Ana", "w1")] }, "");

        expect(html).toContain('data-action="open-comunidad-route-detail"');
        expect(html).toContain('data-entreno-id="w1"');

    });

    it("mezcla entrenos con y sin GPS en la misma lista, ordenados por fecha descendente", () => {

        const entrenos = [withoutTrace("Ana", "w1", { date: "2026-09-10" }), withTrace("Rafa", "w2", { date: "2026-09-15" })];
        const html = ComunidadActividadView({ status: "ready", entrenos }, "");

        expect(html.indexOf("Rafa")).toBeLessThan(html.indexOf("Ana"));

    });

    it("filtra por tipo cuando se pasa un typeFilter", () => {

        const entrenos = [withTrace("Rafa", "w1", { type: "easy" }), withTrace("Ana", "w2", { type: "long" })];
        const html = ComunidadActividadView({ status: "ready", entrenos }, "long");

        expect(html).toContain("Ana");
        expect(html).not.toContain("Rafa");

    });

    it("sin ningún entreno de ese tipo, muestra un aviso propio sin romper el filtro", () => {

        const entrenos = [withTrace("Rafa", "w1", { type: "easy" })];
        const html = ComunidadActividadView({ status: "ready", entrenos }, "race");

        expect(html).toContain("No hay entrenos de este tipo");
        expect(html).toContain('data-type="race"'); // el propio selector sigue pintado

    });

    it("pinta los 4 chips reales (Rodaje (Z2)/Series/Tirada larga/Carrera) además de Todos, sin Tempo", () => {

        const html = ComunidadActividadView({ status: "ready", entrenos: [] }, "");

        expect(html).toContain("Todos");
        expect(html).toContain("Rodaje (Z2)");
        expect(html).toContain("Series");
        expect(html).toContain("Tirada larga");
        expect(html).toContain("Carrera");
        expect(html).not.toContain("Tempo");

    });

    it("escapa el alias -- es texto libre de otro usuario", () => {

        const html = ComunidadActividadView({ status: "ready", entrenos: [withoutTrace('<img src=x onerror=alert(1)>', "w1")] }, "");

        expect(html).not.toContain("<img src=x");
        expect(html).toContain("&lt;img");

    });

    it("no lleva ningún botón de like ni contador de comentarios -- interacción social quitada del frontend", () => {

        const html = ComunidadActividadView({ status: "ready", entrenos: [withTrace("Rafa", "w1", { likesCount: 4, likedByMe: true, commentsCount: 5 })] }, "");

        expect(html).not.toContain('data-action="toggle-comunidad-like"');
        expect(html).not.toContain("comunidad-like-button");
        expect(html).not.toContain("comunidad-comment-count");

    });

});
