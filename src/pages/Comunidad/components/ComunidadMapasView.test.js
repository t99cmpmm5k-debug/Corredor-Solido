import { describe, it, expect } from "vitest";
import { ComunidadMapasView } from "./ComunidadMapasView.js";

const withTrace = (alias, id, overrides = {}) => ({
    alias,
    id,
    date: "2026-09-15",
    distanceKm: 10,
    avgPaceSecPerKm: 330,
    durationSec: 3300,
    routeTrace: [{ lat: 37.9, lon: -1.1 }, { lat: 37.91, lon: -1.11 }],
    ...overrides
});

describe("ComunidadMapasView -- lista de tarjetas, una por entreno con GPS", () => {

    it("idle/loading muestran un aviso de carga, sin intentar montar ningún mapa", () => {

        expect(ComunidadMapasView({ status: "idle", entrenos: [] })).toContain("Cargando");
        expect(ComunidadMapasView({ status: "loading", entrenos: [] })).toContain("Cargando");

    });

    it("unavailable muestra un estado de error simple con botón de reintentar", () => {

        const html = ComunidadMapasView({ status: "unavailable", entrenos: [] });

        expect(html).toContain("No se pudieron cargar");
        expect(html).toContain('data-action="retry-comunidad-entrenos"');

    });

    it("ready sin ningún entreno con GPS en la comunidad muestra un estado vacío, sin ninguna tarjeta", () => {

        const html = ComunidadMapasView({ status: "ready", entrenos: [{ alias: "Rafa", routeTrace: null }] });

        expect(html).toContain("Todavía no hay recorridos");
        expect(html).not.toContain("comunidad-route-card");

    });

    it("ready con datos reales monta una tarjeta por entreno, con su propio contenedor de mapa", () => {

        const html = ComunidadMapasView({
            status: "ready",
            entrenos: [withTrace("Rafa", "w1"), withTrace("annamateoalca", "w2")]
        });

        expect(html).toContain('id="comunidad-route-map-0"');
        expect(html).toContain('id="comunidad-route-map-1"');
        expect(html).toContain("Rafa");
        expect(html).toContain("annamateoalca");

    });

    it("un usuario sin routeTrace no genera tarjeta -- sin error ni hueco", () => {

        const html = ComunidadMapasView({
            status: "ready",
            entrenos: [withTrace("Rafa", "w1"), { alias: "SinGPS", id: "w2", routeTrace: null }]
        });

        expect(html).toContain("Rafa");
        expect(html).not.toContain("SinGPS");

    });

    it("escapa el alias antes de insertarlo en la tarjeta -- es texto libre de otro usuario", () => {

        const html = ComunidadMapasView({
            status: "ready",
            entrenos: [withTrace('<img src=x onerror=alert(1)>', "w1")]
        });

        expect(html).not.toContain("<img src=x");
        expect(html).toContain("&lt;img");

    });

    it("muestra distancia, ritmo y duración -- mismos datos que ya devuelve la API", () => {

        const html = ComunidadMapasView({ status: "ready", entrenos: [withTrace("Rafa", "w1")] });

        expect(html).toContain("10 km");
        expect(html).toContain("5:30/km");
        expect(html).toContain("55:00");

    });

    it("sin ritmo/duración reales, muestra un guion en vez de inventar un dato", () => {

        const html = ComunidadMapasView({
            status: "ready",
            entrenos: [withTrace("Rafa", "w1", { avgPaceSecPerKm: null, durationSec: null })]
        });

        expect(html).toContain("—");

    });

    it("cada tarjeta es pulsable -- data-action + el id real del entreno, para pedir su detalle al pulsarla", () => {

        const html = ComunidadMapasView({
            status: "ready",
            entrenos: [withTrace("Rafa", "w1")]
        });

        expect(html).toContain('data-action="open-comunidad-route-detail"');
        expect(html).toContain('data-entreno-id="w1"');
        expect(html).toContain('data-entreno-alias="Rafa"');

    });

    it("escapa el alias también en el atributo data-entreno-alias", () => {

        const html = ComunidadMapasView({
            status: "ready",
            entrenos: [withTrace('<img src=x onerror=alert(1)>', "w1")]
        });

        expect(html).not.toContain('data-entreno-alias="<img');

    });

    it("no incluye likes, comentarios, filtro por tipo, ni leyenda de colores por usuario", () => {

        const html = ComunidadMapasView({
            status: "ready",
            entrenos: [withTrace("Rafa", "w1")]
        });

        expect(html).not.toContain("like");
        expect(html).not.toContain("comentari");
        expect(html).not.toContain("comunidad-map-legend");

    });

});
