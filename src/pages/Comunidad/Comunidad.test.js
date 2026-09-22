// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";

const getComunidadTabMock = vi.fn();
const getComunidadEntrenosMock = vi.fn();
const getComunidadRouteDetailMock = vi.fn();
const getComunidadRouteDetailErrorMock = vi.fn();
const getMyAliasMock = vi.fn();

vi.mock("./comunidadStore.js", () => ({
    COMUNIDAD_TABS: ["actividad", "mapas", "ranking"],
    getComunidadTab: () => getComunidadTabMock(),
    getComunidadEntrenos: () => getComunidadEntrenosMock(),
    getComunidadRouteDetail: () => getComunidadRouteDetailMock(),
    getComunidadRouteDetailError: () => getComunidadRouteDetailErrorMock()
}));

vi.mock("../Profile/profileStore.js", () => ({
    getMyAlias: () => getMyAliasMock()
}));

// Bug real corregido: el mapa fullscreen del detalle (RouteMapFullscreenOverlay)
// y la lista de tarjetas de Mapas (cada una con su propio mapa pequeño,
// mountRouteMap() vivo) coexistían siempre en el DOM -- el control de
// atribución de Leaflet de una tarjeta debajo se colaba por encima del
// overlay (z-index de Leaflet, ajeno al contexto de apilamiento del propio
// overlay), viéndose como una atribución de Esri duplicada a media altura.
// Mismo criterio que RunningDetailView.js: mapa pequeño y fullscreen deben
// ser mutuamente excluyentes en el DOM, nunca los dos montados a la vez.
describe("Comunidad -- lista de Mapas y mapa fullscreen del detalle son mutuamente excluyentes", () => {

    beforeEach(() => {
        getComunidadTabMock.mockReset().mockReturnValue("mapas");
        getComunidadEntrenosMock.mockReset().mockReturnValue({
            status: "ready",
            entrenos: [{ alias: "Rafa", id: "w1", date: "2026-09-20", routeTrace: [{ lat: 1, lon: 1 }, { lat: 2, lon: 2 }] }]
        });
        getComunidadRouteDetailMock.mockReset().mockReturnValue({ status: "closed" });
        getComunidadRouteDetailErrorMock.mockReset().mockReturnValue(null);
        getMyAliasMock.mockReset().mockReturnValue({ status: "idle", value: null });
    });

    it("sin ningún detalle abierto, pinta la lista de tarjetas con su propio mapa", async () => {

        const { Comunidad } = await import("./Comunidad.js");
        const html = Comunidad();

        expect(html).toContain("comunidad-route-card");
        expect(html).not.toContain("route-map-fullscreen-overlay");

    });

    it("con el detalle en status ready, pinta el mapa fullscreen y NO la lista de tarjetas", async () => {

        getComunidadRouteDetailMock.mockReturnValue({
            status: "ready",
            alias: "Rafa",
            detail: { id: "w1", splits: [] }
        });

        const { Comunidad } = await import("./Comunidad.js");
        const html = Comunidad();

        expect(html).toContain("route-map-fullscreen-overlay");
        expect(html).not.toContain("comunidad-route-card");
        expect(html).not.toContain("comunidad-route-list");

    });

    it("con el detalle en status loading, la lista SIGUE pintándose detrás (scrim translúcido, no un overlay opaco)", async () => {

        getComunidadRouteDetailMock.mockReturnValue({ status: "loading", alias: "Rafa" });

        const { Comunidad } = await import("./Comunidad.js");
        const html = Comunidad();

        expect(html).toContain("comunidad-route-card");
        expect(html).toContain("comunidad-detail-loading-overlay");

    });

});

describe("Comunidad -- pestaña Ranking (Fase 2)", () => {

    beforeEach(() => {
        getComunidadTabMock.mockReset().mockReturnValue("ranking");
        getComunidadRouteDetailMock.mockReset().mockReturnValue({ status: "closed" });
        getComunidadRouteDetailErrorMock.mockReset().mockReturnValue(null);
    });

    it("pinta las 4 tablas de Ranking a partir de la misma lista de entrenos que Mapas", async () => {

        getComunidadEntrenosMock.mockReset().mockReturnValue({
            status: "ready",
            entrenos: [{ alias: "Rafa", id: "w1", type: "long", date: "2026-09-20", distanceKm: 20 }]
        });
        getMyAliasMock.mockReset().mockReturnValue({ status: "ready", value: "Rafa" });

        const { Comunidad } = await import("./Comunidad.js");
        const html = Comunidad();

        expect(html).toContain("Ritmo más rápido");
        expect(html).toContain("Mejor tirada larga");
        expect(html).toContain("is-mine");

    });

    it("sin alias propio configurado, no pasa ningún alias a resaltar", async () => {

        getComunidadEntrenosMock.mockReset().mockReturnValue({
            status: "ready",
            entrenos: [{ alias: "Ana", id: "w1", type: "long", date: "2026-09-20", distanceKm: 20 }]
        });
        getMyAliasMock.mockReset().mockReturnValue({ status: "idle", value: null });

        const { Comunidad } = await import("./Comunidad.js");
        const html = Comunidad();

        expect(html).not.toContain("is-mine");

    });

});
