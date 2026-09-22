import { describe, it, expect } from "vitest";
import { ComunidadMapasView } from "./ComunidadMapasView.js";

const withTrace = (alias, id) => ({
    alias,
    id,
    routeTrace: [{ lat: 37.9, lon: -1.1 }, { lat: 37.91, lon: -1.11 }]
});

describe("ComunidadMapasView -- pinta según el status de comunidadStore, nunca rompe", () => {

    it("idle/loading muestran un aviso de carga, sin intentar montar el mapa", () => {

        expect(ComunidadMapasView({ status: "idle", entrenos: [] })).toContain("Cargando");
        expect(ComunidadMapasView({ status: "loading", entrenos: [] })).toContain("Cargando");

    });

    it("unavailable muestra un estado de error simple con botón de reintentar", () => {

        const html = ComunidadMapasView({ status: "unavailable", entrenos: [] });

        expect(html).toContain("No se pudieron cargar");
        expect(html).toContain('data-action="retry-comunidad-entrenos"');

    });

    it("ready sin ningún entreno con GPS en la comunidad muestra el estado vacío, no un mapa en blanco", () => {

        const html = ComunidadMapasView({ status: "ready", entrenos: [{ alias: "Rafa", routeTrace: null }] });

        expect(html).toContain("Todavía no hay recorridos con GPS");
        expect(html).not.toContain('id="comunidad-map"');

    });

    it("ready con datos reales monta el contenedor del mapa y la leyenda con cada alias", () => {

        const html = ComunidadMapasView({
            status: "ready",
            entrenos: [withTrace("Rafa", "w1"), withTrace("annamateoalca", "w2")]
        });

        expect(html).toContain('id="comunidad-map"');
        expect(html).toContain("Rafa");
        expect(html).toContain("annamateoalca");

    });

    it("un usuario sin routeTrace no aparece en la leyenda -- sin error ni hueco", () => {

        const html = ComunidadMapasView({
            status: "ready",
            entrenos: [withTrace("Rafa", "w1"), { alias: "SinGPS", id: "w2", routeTrace: null }]
        });

        expect(html).toContain("Rafa");
        expect(html).not.toContain("SinGPS");

    });

    it("escapa el alias antes de insertarlo en la leyenda -- es texto libre de otro usuario", () => {

        const html = ComunidadMapasView({
            status: "ready",
            entrenos: [withTrace('<img src=x onerror=alert(1)>', "w1")]
        });

        expect(html).not.toContain("<img src=x");
        expect(html).toContain("&lt;img");

    });

});
