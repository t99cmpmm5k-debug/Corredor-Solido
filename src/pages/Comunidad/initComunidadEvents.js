import { rerender } from "../../core/router.js";
import {
    setComunidadTab, getComunidadTab, loadComunidadEntrenos, getComunidadEntrenos, retryComunidadEntrenos,
    openComunidadRouteDetail, closeComunidadRouteDetail, getComunidadRouteDetail,
    getComunidadActivityTypeFilter, setComunidadActivityTypeFilter,
    setComunidadRankingPeriod, openComunidadDetailMap, closeComunidadDetailMap
} from "./comunidadStore.js";
import { mountRouteMap, unmountRouteMap, hasRouteTrace } from "../../components/RouteMap/RouteMap.js";
import { ROUTE_COLOR_NORMAL, buildPaceColorSegments, buildKmMarkers } from "../Running/routeMapPaceColoring.js";
import { chartSplits, MIN_SPLITS_FOR_CHART } from "../Running/components/RunningDetailView.js";
import { buildCommunityFeedCards } from "./communityFeedData.js";
import { loadMyProfile } from "../Profile/profileStore.js";

// Un mapa pequeño POR TARJETA con GPS en el feed de Actividad -- array, no
// una única instancia, con la misma destrucción explícita en cada render
// que activeRouteMap en Running/initRunningEvents.js: render() reemplaza
// TODO app.innerHTML en cada pantalla, así que los contenedores DOM de la
// tanda anterior pueden dejar de existir sin que los objetos L.Map en sí
// se destruyan solos (sus listeners de window/resize seguirían colgados).
let activeComunidadFeedMaps = [];

function initComunidadFeedMaps() {

    activeComunidadFeedMaps.forEach(unmountRouteMap);
    activeComunidadFeedMaps = [];

    const { status, entrenos } = getComunidadEntrenos();
    if (status !== "ready") return;

    // Mismo orden e ÍNDICE que ComunidadActividadView.js (buildCommunityFeedCards,
    // con el mismo typeFilter activo) -- bug real corregido: filtrar por
    // hasRouteTrace ANTES de enumerar (como hacía esta función antes)
    // renumera los índices sin los huecos de los entrenos sin ruta, pero la
    // vista genera cada id "comunidad-feed-map-N" con el índice dentro de
    // la lista COMPLETA (incluye los que no tienen mapa, aunque no les
    // ponga contenedor) -- con >=2 entrenos con GPS mezclados con otros sin
    // GPS, los índices dejaban de coincidir y el segundo mapa en adelante
    // nunca encontraba su contenedor real (buscaba un id que no existía,
    // mientras el contenedor real con el índice correcto se quedaba vacío
    // para siempre). Filtrar DESPUÉS de enumerar mantiene el mismo índice
    // que ve la vista.
    buildCommunityFeedCards(entrenos, getComunidadActivityTypeFilter())
        .forEach((entreno, index) => {

            if (!hasRouteTrace(entreno)) return;

            const container = document.getElementById(`comunidad-feed-map-${index}`);
            if (!container) return;

            // interactive:false -- "fotografía" fija de un único recorrido,
            // exactamente el mismo modo pequeño que ya usa el mapa de la
            // ficha de un entreno propio (RunningDetailView.js vía
            // initRunningEvents.js), nunca el modo pantalla completa. Color
            // fijo (ROUTE_COLOR_NORMAL) y no por ritmo real:
            // /api/community/entrenos no manda `splits` (whitelist explícita
            // en toPublicEntreno, server/src/routes/community.js), así que
            // no hay datos por km de los que derivar un degradado -- mismo
            // color que usaría el mapa de un entreno propio sin splits
            // suficientes (ver el fallback en initRunningEvents.js).
            mountRouteMap(container, [{ latlngs: entreno.routeTrace.map(p => [p.lat, p.lon]), color: ROUTE_COLOR_NORMAL }], [], entreno.routeTrace).then(map => {

                if (document.body.contains(container)) {
                    activeComunidadFeedMaps.push(map);
                } else {
                    unmountRouteMap(map);
                }

            });

        });

}

// Mapa del detalle -- instancias SEPARADAS de activeComunidadFeedMaps de
// arriba, y una de otra: "comunidad-detail-map" (compacto, no interactivo,
// dentro de ComunidadDetailCard) y "comunidad-detail-map-fullscreen"
// (interactivo, solo si isComunidadDetailMapExpanded()) nunca están en el
// DOM a la vez, pero cada una necesita su propio unmount explícito en el
// siguiente render -- mismo patrón EXACTO que activeRouteMap/
// activeFullscreenRouteMap en Running/initRunningEvents.js (initRouteMap()).
let activeComunidadDetailMap = null;
let activeComunidadDetailFullscreenMap = null;

function initComunidadDetailMap() {

    if (activeComunidadDetailMap) {
        unmountRouteMap(activeComunidadDetailMap);
        activeComunidadDetailMap = null;
    }

    if (activeComunidadDetailFullscreenMap) {
        unmountRouteMap(activeComunidadDetailFullscreenMap);
        activeComunidadDetailFullscreenMap = null;
    }

    const state = getComunidadRouteDetail();
    if (state.status !== "ready") return;

    const { detail } = state;
    const routeTrace = detail.routeTrace || [];
    if (routeTrace.length < 2) return;

    // Mismo criterio EXACTO que initRouteMap() (Running/initRunningEvents.js)
    // para un entreno propio: coloreado por ritmo real si hay splits
    // suficientes (MIN_SPLITS_FOR_CHART), si no un único segmento en el
    // color neutro -- aquí sí hay splits reales (a diferencia del mapa
    // pequeño de la tarjeta del FEED, que solo tiene los campos de la
    // lista), porque GET /api/community/entrenos/:id los trae completos.
    const splits = chartSplits(detail);

    const segments = splits.length >= MIN_SPLITS_FOR_CHART
        ? buildPaceColorSegments(routeTrace, splits)
        : [{ latlngs: routeTrace.map(p => [p.lat, p.lon]), color: ROUTE_COLOR_NORMAL }];

    const markers = buildKmMarkers(routeTrace, splits);

    const compactContainer = document.getElementById("comunidad-detail-map");

    if (compactContainer) {

        mountRouteMap(compactContainer, segments, markers, routeTrace).then(map => {

            if (document.body.contains(compactContainer)) {
                activeComunidadDetailMap = map;
            } else {
                unmountRouteMap(map);
            }

        });

    }

    const fullscreenContainer = document.getElementById("comunidad-detail-map-fullscreen");

    if (fullscreenContainer) {

        mountRouteMap(fullscreenContainer, segments, markers, routeTrace, { interactive: true }).then(map => {

            if (document.body.contains(fullscreenContainer)) {
                activeComunidadDetailFullscreenMap = map;
            } else {
                unmountRouteMap(map);
            }

        });

    }

}

export function initComunidadEvents() {

    // Punto 7 de la especificación original: la carga se dispara solo al
    // entrar de verdad en Comunidad -- loadComunidadEntrenos() es idempotente
    // (no hace nada si status ya no es "idle"), así que entrar y salir de
    // una tab, o pasar por otras pantallas, no repite la petición. Ranking
    // y Actividad consumen LA MISMA lista -- se dispara desde las dos tabs,
    // no solo desde una, para no depender de por cuál se haya entrado
    // primero en la misma sesión.
    if (document.querySelector(".comunidad") && ["ranking", "actividad"].includes(getComunidadTab())) {
        loadComunidadEntrenos();
    }

    // Alias propio (Perfil) -- para resaltar la fila del usuario en
    // Ranking. Mismo patrón idempotente que initProfileEvents.js: una sola
    // petición real por sesión, se pide en cuanto se visita Comunidad (no
    // solo al entrar en Ranking) para que ya esté lista si el usuario
    // cambia de tab.
    if (document.querySelector(".comunidad")) {
        loadMyProfile();
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

    // Filtro por tipo de Actividad (Fase 3a) -- mismo patrón que
    // filter-by-type en Running.js: guarda el tipo y repinta, la propia
    // ComunidadActividadView.js decide qué chip queda marcado como activo.
    document.querySelectorAll('[data-action="filter-comunidad-activity-type"]').forEach(chip => {

        chip.addEventListener("click", () => {

            setComunidadActivityTypeFilter(chip.dataset.type);
            rerender();

        });

    });

    // Selector temporal de Ranking (Semana/Mes/Histórico, pulido de cierre)
    // -- mismo patrón que el filtro de tipo de arriba: guarda el periodo y
    // repinta, ComunidadRankingView.js decide qué chip queda activo.
    document.querySelectorAll('[data-action="select-comunidad-ranking-period"]').forEach(chip => {

        chip.addEventListener("click", () => {

            setComunidadRankingPeriod(chip.dataset.period);
            rerender();

        });

    });

    // Pulsar cualquier tarjeta del feed de Actividad (con o sin GPS) pide su
    // detalle real y abre la tarjeta de stats -- ver openComunidadRouteDetail()/
    // ComunidadRouteDetailOverlay() (Comunidad.js). data-entreno-id/-alias
    // vienen ya escapados/puestos por ComunidadActividadView.js.
    document.querySelectorAll('[data-action="open-comunidad-route-detail"]').forEach(card => {

        card.addEventListener("click", () => {

            openComunidadRouteDetail({ id: card.dataset.entrenoId, alias: card.dataset.entrenoAlias });

        });

    });

    // Botón de cerrar de la CABECERA de la tarjeta de stats
    // (ComunidadDetailHeader, Comunidad.js) -- sale del detalle entero, de
    // vuelta al feed. Data-action propio, distinto del de abajo a propósito:
    // los dos cierres tienen alcances distintos (ver el comentario junto a
    // ComunidadDetailHeader).
    const closeDetailButton = document.querySelector('.comunidad [data-action="close-comunidad-detail"]');

    if (closeDetailButton) {
        closeDetailButton.addEventListener("click", closeComunidadRouteDetail);
    }

    // Pulsar el mapa compacto (RouteMapTapTarget, mismo data-action que ya
    // usa Running para el suyo -- páginas distintas nunca conviven, sin
    // colisión real al reutilizarlo) expande al mapa a pantalla completa.
    document.querySelectorAll('.comunidad [data-action="open-route-map-fullscreen"]').forEach(el => {

        el.addEventListener("click", () => {

            openComunidadDetailMap();

        });

    });

    // Cerrar el mapa a pantalla completa (botón propio de
    // RouteMapFullscreenOverlay, RouteMap.js) SOLO colapsa de vuelta a la
    // tarjeta de stats -- nunca sale del detalle entero, a diferencia del
    // botón de cerrar de la cabecera de arriba.
    const closeFullscreenMapButton = document.querySelector('.comunidad [data-action="close-route-map-fullscreen"]');

    if (closeFullscreenMapButton) {
        closeFullscreenMapButton.addEventListener("click", closeComunidadDetailMap);
    }

    initComunidadFeedMaps();
    initComunidadDetailMap();

}
