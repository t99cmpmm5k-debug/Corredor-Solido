import { rerender } from "../../core/router.js";
import { setComunidadTab, getComunidadTab, loadComunidadEntrenos, getComunidadEntrenos, retryComunidadEntrenos } from "./comunidadStore.js";
import { mountRouteMap, unmountRouteMap } from "../../components/RouteMap/RouteMap.js";
import { buildCommunitySegments, COMMUNITY_MAP_MIN_ZOOM, COMMUNITY_MAP_DEFAULT_CENTER } from "./communityMapData.js";

// Misma instancia única con destrucción explícita en cada render que
// activeRouteMap/activeFullscreenRouteMap en Running/initRunningEvents.js
// -- render() reemplaza TODO app.innerHTML en cada pantalla (incluidas las
// que no son Comunidad), así que el contenedor DOM de una instancia
// anterior puede dejar de existir sin que el objeto L.Map en sí se
// destruya solo (sus listeners de window/resize seguirían colgados).
let activeComunidadMap = null;

function initComunidadMap() {

    if (activeComunidadMap) {
        unmountRouteMap(activeComunidadMap);
        activeComunidadMap = null;
    }

    const container = document.getElementById("comunidad-map");
    if (!container) return;

    const { status, entrenos } = getComunidadEntrenos();
    if (status !== "ready") return;

    // Punto "comunidad vacía" del fix de zoom: segments puede venir vacío
    // (nadie tiene todavía un entreno con GPS) -- el mapa se monta igual,
    // con la vista fija de COMMUNITY_MAP_DEFAULT_CENTER (ver mountRouteMap/
    // defaultView en RouteMap.js), en vez de no mostrar nada.
    const segments = buildCommunitySegments(entrenos);

    // interactive:true directamente (a diferencia del mapa pequeño de un
    // entreno individual) -- aquí el mapa ES el contenido principal de la
    // pantalla, no una miniatura que abre un modo pantalla completa
    // aparte. Sin markers ni routeTrace propios ("[]"/"[]" de más abajo):
    // las marcas de km y de inicio/fin son de UN entreno concreto, no
    // tienen sentido con decenas de rutas de gente distinta mezcladas.
    // minZoom/defaultView -- ver comentarios junto a COMMUNITY_MAP_MIN_ZOOM/
    // COMMUNITY_MAP_DEFAULT_CENTER en communityMapData.js.
    mountRouteMap(container, segments, [], [], {
        interactive: true,
        minZoom: COMMUNITY_MAP_MIN_ZOOM,
        defaultView: { center: COMMUNITY_MAP_DEFAULT_CENTER, zoom: COMMUNITY_MAP_MIN_ZOOM }
    }).then(map => {

        if (document.body.contains(container)) {
            activeComunidadMap = map;
        } else {
            unmountRouteMap(map);
        }

    });

}

export function initComunidadEvents() {

    // Punto 7 de la especificación: la carga se dispara solo al entrar de
    // verdad en Comunidad > Mapas -- loadComunidadEntrenos() es idempotente
    // (no hace nada si status ya no es "idle"), así que entrar y salir de
    // la tab, o pasar por otras pantallas, no repite la petición.
    if (document.querySelector(".comunidad") && getComunidadTab() === "mapas") {
        loadComunidadEntrenos();
    }

    document.querySelectorAll('[data-action="select-comunidad-tab"]').forEach(button => {

        button.addEventListener("click", () => {

            setComunidadTab(button.dataset.tab);
            rerender();

        });

    });

    const retryButton = document.querySelector('[data-action="retry-comunidad-entrenos"]');

    if (retryButton) {
        retryButton.addEventListener("click", retryComunidadEntrenos);
    }

    initComunidadMap();

}
