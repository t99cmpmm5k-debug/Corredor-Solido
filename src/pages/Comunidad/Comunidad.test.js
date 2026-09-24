// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";

const getComunidadTabMock = vi.fn();
const getComunidadEntrenosMock = vi.fn();
const getComunidadRouteDetailMock = vi.fn();
const getComunidadRouteDetailErrorMock = vi.fn();
const getMyProfileMock = vi.fn();
const getComunidadActivityTypeFilterMock = vi.fn();
const getComunidadRankingPeriodMock = vi.fn();
const isComunidadDetailMapExpandedMock = vi.fn();

vi.mock("./comunidadStore.js", () => ({
    COMUNIDAD_TABS: ["actividad", "ranking"],
    getComunidadTab: () => getComunidadTabMock(),
    getComunidadEntrenos: () => getComunidadEntrenosMock(),
    getComunidadRouteDetail: () => getComunidadRouteDetailMock(),
    getComunidadRouteDetailError: () => getComunidadRouteDetailErrorMock(),
    getComunidadActivityTypeFilter: () => getComunidadActivityTypeFilterMock(),
    getComunidadRankingPeriod: () => getComunidadRankingPeriodMock(),
    isComunidadDetailMapExpanded: () => isComunidadDetailMapExpandedMock()
}));

vi.mock("../Profile/profileStore.js", () => ({
    getMyProfile: () => getMyProfileMock()
}));

// Bug real corregido: el mapa fullscreen del detalle (RouteMapFullscreenOverlay)
// y el feed de Actividad (cada tarjeta con GPS con su propio mapa pequeño,
// mountRouteMap() vivo) coexistían siempre en el DOM -- el control de
// atribución de Leaflet de una tarjeta debajo se colaba por encima del
// overlay (z-index de Leaflet, ajeno al contexto de apilamiento del propio
// overlay), viéndose como una atribución de Esri duplicada a media altura.
// Mismo criterio que RunningDetailView.js: mapa pequeño y fullscreen deben
// ser mutuamente excluyentes en el DOM, nunca los dos montados a la vez.
// (Bug encontrado originalmente cuando esta pantalla se llamaba Mapas --
// misma protección, ahora en Actividad tras fusionar las dos pestañas.)
describe("Comunidad -- feed de Actividad y detalle son mutuamente excluyentes", () => {

    beforeEach(() => {
        getComunidadTabMock.mockReset().mockReturnValue("actividad");
        getComunidadEntrenosMock.mockReset().mockReturnValue({
            status: "ready",
            entrenos: [{ alias: "Rafa", id: "w1", type: "long", date: "2026-09-20", routeTrace: [{ lat: 1, lon: 1 }, { lat: 2, lon: 2 }] }]
        });
        getComunidadRouteDetailMock.mockReset().mockReturnValue({ status: "closed" });
        getComunidadRouteDetailErrorMock.mockReset().mockReturnValue(null);
        getMyProfileMock.mockReset().mockReturnValue({ status: "idle", aliasPublico: null, localidad: null, createdAt: null });
        getComunidadActivityTypeFilterMock.mockReset().mockReturnValue("");
        isComunidadDetailMapExpandedMock.mockReset().mockReturnValue(false);
    });

    it("sin ningún detalle abierto, pinta la lista de tarjetas con su propio mapa", async () => {

        const { Comunidad } = await import("./Comunidad.js");
        const html = Comunidad();

        expect(html).toContain("comunidad-route-card");
        expect(html).not.toContain("route-map-fullscreen-overlay");
        expect(html).not.toContain("comunidad-detail-card");

    });

    it("con el detalle en status ready de un entreno CON GPS, pinta la tarjeta de stats (no el mapa fullscreen todavía) y NO la lista", async () => {

        getComunidadRouteDetailMock.mockReturnValue({
            status: "ready",
            alias: "Rafa",
            detail: { id: "w1", type: "long", date: "2026-09-20", distanceKm: 21.5, avgPaceSecPerKm: 330, durationSec: 7095, avgHr: 148, splits: [], routeTrace: [{ lat: 1, lon: 1 }, { lat: 2, lon: 2 }] }
        });

        const { Comunidad } = await import("./Comunidad.js");
        const html = Comunidad();

        expect(html).toContain("comunidad-detail-card");
        expect(html).toContain("Rafa");
        expect(html).toContain("21,5 km");
        expect(html).toContain("148 ppm");
        expect(html).toContain("Ver ruta");
        expect(html).not.toContain("route-map-fullscreen-overlay");
        expect(html).not.toContain("comunidad-route-card");
        expect(html).not.toContain("comunidad-route-list");

    });

    it("con el mapa expandido (isComunidadDetailMapExpanded), pinta el mapa fullscreen y NO la tarjeta de stats", async () => {

        getComunidadRouteDetailMock.mockReturnValue({
            status: "ready",
            alias: "Rafa",
            detail: { id: "w1", splits: [], routeTrace: [{ lat: 1, lon: 1 }, { lat: 2, lon: 2 }] }
        });
        isComunidadDetailMapExpandedMock.mockReturnValue(true);

        const { Comunidad } = await import("./Comunidad.js");
        const html = Comunidad();

        expect(html).toContain("route-map-fullscreen-overlay");
        expect(html).not.toContain("comunidad-detail-card");
        expect(html).not.toContain("comunidad-route-card");

    });

    it("con el detalle en status loading, la lista SIGUE pintándose detrás (scrim translúcido, no un overlay opaco)", async () => {

        getComunidadRouteDetailMock.mockReturnValue({ status: "loading", alias: "Rafa" });

        const { Comunidad } = await import("./Comunidad.js");
        const html = Comunidad();

        expect(html).toContain("comunidad-route-card");
        expect(html).toContain("comunidad-detail-loading-overlay");

    });

    it("con el detalle en status ready de un entreno SIN ruta, pinta la tarjeta de stats con icono en vez de mapa, sin CTA \"Ver ruta\"", async () => {

        getComunidadRouteDetailMock.mockReturnValue({
            status: "ready",
            alias: "Rafa",
            detail: { id: "w1", type: "series", date: "2026-09-20", distanceKm: 6, avgPaceSecPerKm: 270, durationSec: 1620, routeTrace: null }
        });

        const { Comunidad } = await import("./Comunidad.js");
        const html = Comunidad();

        expect(html).toContain("comunidad-detail-card");
        expect(html).toContain("comunidad-detail-icon-placeholder");
        expect(html).not.toContain("route-map-fullscreen-overlay");
        expect(html).not.toContain("Ver ruta");

    });

});

describe("Comunidad -- pestaña Ranking (Fase 2)", () => {

    beforeEach(() => {
        getComunidadTabMock.mockReset().mockReturnValue("ranking");
        getComunidadRouteDetailMock.mockReset().mockReturnValue({ status: "closed" });
        getComunidadRouteDetailErrorMock.mockReset().mockReturnValue(null);
        // "all" -- evita que estos fixtures con fecha fija dependan de en
        // qué día real se ejecute el test (period "week"/"month" filtran
        // por la fecha REAL de hoy, no por una fecha inyectada aquí).
        getComunidadRankingPeriodMock.mockReset().mockReturnValue("all");
    });

    it("pinta las 5 tablas de Ranking a partir de la misma lista de entrenos que Actividad", async () => {

        getComunidadEntrenosMock.mockReset().mockReturnValue({
            status: "ready",
            entrenos: [{ alias: "Rafa", id: "w1", type: "long", date: "2026-09-20", distanceKm: 20 }]
        });
        getMyProfileMock.mockReset().mockReturnValue({ status: "ready", aliasPublico: "Rafa", localidad: null, createdAt: null });

        const { Comunidad } = await import("./Comunidad.js");
        const html = Comunidad();

        expect(html).toContain("Mejor ritmo medio");
        expect(html).toContain("Mejor tirada larga");
        expect(html).toContain("Ranking Sólido");
        expect(html).toContain("is-mine");

    });

    it("sin alias propio configurado, no pasa ningún alias a resaltar", async () => {

        getComunidadEntrenosMock.mockReset().mockReturnValue({
            status: "ready",
            entrenos: [{ alias: "Ana", id: "w1", type: "long", date: "2026-09-20", distanceKm: 20 }]
        });
        getMyProfileMock.mockReset().mockReturnValue({ status: "idle", aliasPublico: null, localidad: null, createdAt: null });

        const { Comunidad } = await import("./Comunidad.js");
        const html = Comunidad();

        expect(html).not.toContain("is-mine");

    });

});

describe("Comunidad -- pestaña Actividad (Fase 3a)", () => {

    beforeEach(() => {
        getComunidadTabMock.mockReset().mockReturnValue("actividad");
        getComunidadRouteDetailMock.mockReset().mockReturnValue({ status: "closed" });
        getComunidadRouteDetailErrorMock.mockReset().mockReturnValue(null);
        getMyProfileMock.mockReset().mockReturnValue({ status: "idle", aliasPublico: null, localidad: null, createdAt: null });
        getComunidadActivityTypeFilterMock.mockReset().mockReturnValue("");
    });

    it("pinta el feed con entrenos sin GPS incluidos -- placeholder en vez de mapa", async () => {

        getComunidadEntrenosMock.mockReset().mockReturnValue({
            status: "ready",
            entrenos: [{ alias: "Ana", id: "w1", type: "series", date: "2026-09-20", distanceKm: 6, routeTrace: null }]
        });

        const { Comunidad } = await import("./Comunidad.js");
        const html = Comunidad();

        expect(html).toContain("Ana");
        expect(html).toContain("comunidad-activity-placeholder");
        expect(html).toContain('data-action="open-comunidad-route-detail"');

    });

});
