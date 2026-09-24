import "./Comunidad.css";

import { BottomNavigation } from "../../components/Navigation/BottomNavigation.js";
import {
    getComunidadTab, getComunidadEntrenos, getComunidadRouteDetail, getComunidadRouteDetailError,
    getComunidadActivityTypeFilter, getComunidadRankingPeriod, isComunidadDetailMapExpanded, COMUNIDAD_TABS
} from "./comunidadStore.js";
import { ComunidadHero } from "./components/ComunidadHero.js";
import { ComunidadRankingView } from "./components/ComunidadRankingView.js";
import { ComunidadActividadView } from "./components/ComunidadActividadView.js";
import { RouteMapFullscreenOverlay, RouteMapLegend, RouteMapTapTarget, hasRouteTrace } from "../../components/RouteMap/RouteMap.js";
import { chartSplits, MIN_SPLITS_FOR_CHART } from "../Running/components/RunningDetailView.js";
import { RUNNING_WORKOUT_TYPES } from "../../data/runningWorkoutTypes.js";
import { formatDayMonth } from "../../utils/date.js";
import { formatKm, formatSecondsAsClock } from "../../utils/format.js";
import { getMyProfile } from "../Profile/profileStore.js";

const TAB_LABELS = {
    actividad: "Actividad",
    ranking: "Ranking"
};

// Cápsula única (ajuste visual: acercar al mockup aprobado) en vez de
// píldoras sueltas -- mismo patrón que .gym-detail-tabs/.gym-detail-tab
// (GymExerciseDetailView.css: HISTORIAL/GRÁFICAS), no el de
// .carreras-tabs (esas SÍ son píldoras independientes, pensadas para
// poder crecer y hacer scroll horizontal si hiciera falta -- aquí son
// siempre exactamente 2, un segmento fijo). Mapas existió como pestaña
// propia (Fase 1) pero se fusionó dentro de Actividad (Fase 3a la dejó
// como un subconjunto exacto: solo entrenos con GPS, sin filtro de tipo).
// Las 2 son ya funcionales -- sin likes/comentarios todavía en Actividad,
// eso llega en las Fases 3b/3c.
function ComunidadTabs(activeTab) {

    return `

        <div class="comunidad-tabs">

            ${COMUNIDAD_TABS.map(tab => `

                <button
                    class="comunidad-tab ${tab === activeTab ? "is-active" : ""}"
                    data-action="select-comunidad-tab"
                    data-tab="${tab}"
                >

                    ${TAB_LABELS[tab]}

                </button>

            `).join("")}

        </div>

    `;

}

// Mismo escapeHtml local que ya usa ComunidadActividadView.js/updateNotifier.js
// por el mismo motivo -- el alias es texto libre de OTRO usuario.
function escapeHtml(text) {

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

}

// Estado "loading" de openComunidadRouteDetail() (comunidadStore.js) --
// spinner breve mientras se pide el detalle real al servidor, antes de
// poder abrir el mapa fullscreen (que necesita los splits que solo trae
// esa respuesta, a diferencia del mapa pequeño de la propia tarjeta).
function ComunidadRouteDetailLoading(alias) {

    return `

        <div class="comunidad-detail-loading-overlay">

            <iconify-icon class="comunidad-detail-spinner" icon="solar:refresh-bold-duotone"></iconify-icon>

            <p>Cargando el recorrido de ${escapeHtml(alias)}...</p>

        </div>

    `;

}

// Mismo icono por tipo que ya usa ComunidadActividadView.js -- duplicado
// aquí, no exportado desde allí, mismo criterio que ese archivo (4 líneas,
// no vale la pena importar todo el componente por esto). TYPE_LABEL: misma
// etiqueta EXACTA que el chip de filtro/badge de la tarjeta
// (RUNNING_WORKOUT_TYPES) -- nunca un texto inventado aparte.
const TYPE_ICON = {
    "": "solar:widget-5-bold-duotone",
    easy: "solar:running-bold-duotone",
    series: "solar:bolt-bold-duotone",
    long: "solar:route-bold-duotone",
    race: "solar:flag-2-bold-duotone"
};

function typeLabel(type) {
    return RUNNING_WORKOUT_TYPES.find(t => t.id === type)?.label ?? null;
}

// Cabecera compartida por las dos variantes del detalle (con y sin mapa) --
// cerrar aquí SIEMPRE sale del detalle entero (closeComunidadRouteDetail),
// a diferencia del cierre del mapa a pantalla completa de más abajo (ese
// solo colapsa de vuelta a esta tarjeta, ver isComunidadDetailMapExpanded()
// en comunidadStore.js). Mismo botón visual que
// RouteMapFullscreenOverlay/RouteMap.css (.route-map-fullscreen-close),
// data-action propio para no colisionar con el suyo.
function ComunidadDetailHeader(alias, detail) {

    const label = typeLabel(detail.type);

    return `

        <div class="comunidad-detail-header">

            <div class="comunidad-detail-header-text">

                ${label ? `<span class="comunidad-detail-type-badge">${label}</span>` : ""}

                <h2>${escapeHtml(alias)}</h2>

                ${detail.date ? `<span class="comunidad-detail-date">${formatDayMonth(detail.date)}</span>` : ""}

            </div>

            <button class="route-map-fullscreen-close" data-action="close-comunidad-detail" aria-label="Cerrar">

                <iconify-icon icon="solar:close-circle-bold-duotone"></iconify-icon>

            </button>

        </div>

    `;

}

// Distancia/ritmo/duración siempre; FC media SOLO si existe (nunca
// inventada -- avgHr solo llega del backend cuando el entreno original la
// trae, ver toPublicEntreno()/server/src/routes/community.js). Punto de
// cierre explícito: "no metas métricas excesivas más allá de estas".
function ComunidadDetailStat(icon, value, label) {

    return `

        <div class="comunidad-detail-stat">

            <iconify-icon icon="${icon}"></iconify-icon>

            <div class="comunidad-detail-stat-text">

                <span class="comunidad-detail-stat-value">${value}</span>

                <span class="comunidad-detail-stat-label">${label}</span>

            </div>

        </div>

    `;

}

function ComunidadDetailStats(detail) {

    const distance = detail.distanceKm != null ? `${formatKm(detail.distanceKm)} km` : "—";
    const pace = detail.avgPaceSecPerKm != null ? `${formatSecondsAsClock(detail.avgPaceSecPerKm)}/km` : "—";
    const duration = detail.durationSec != null ? formatSecondsAsClock(detail.durationSec) : "—";
    const hr = detail.avgHr != null ? `${Math.round(detail.avgHr)} ppm` : null;

    return `

        <div class="comunidad-detail-stats">

            ${ComunidadDetailStat("solar:map-point-wave-bold-duotone", distance, "Distancia")}

            ${ComunidadDetailStat("solar:speedometer-bold-duotone", pace, "Ritmo")}

            ${ComunidadDetailStat("solar:clock-circle-bold-duotone", duration, "Duración")}

            ${hr ? ComunidadDetailStat("solar:heart-pulse-bold-duotone", hr, "FC media") : ""}

        </div>

    `;

}

// Mapa compacto NO interactivo ("fotografía", igual que RouteMapTapTarget
// en la ficha de un entreno propio) con un CTA "Ver ruta" superpuesto --
// pulsar CUALQUIER punto (todo el tap-target, CTA incluido: el click
// burbujea al mismo contenedor) abre el mapa a pantalla completa
// (openComunidadDetailMap(), initComunidadEvents.js), donde sí vive todo lo
// interactivo (zoom, arrastre, marcadores de km). Sin GPS, un icono grande
// centrado -- mismo lenguaje que el placeholder de la propia tarjeta del
// feed, sin ningún CTA (no hay ruta que "ver").
function ComunidadDetailMedia(detail) {

    if (!hasRouteTrace(detail)) {

        return `

            <div class="comunidad-detail-icon-placeholder">

                <iconify-icon icon="${TYPE_ICON[detail.type] ?? TYPE_ICON[""]}"></iconify-icon>

            </div>

        `;

    }

    const splits = chartSplits(detail);
    const legendHtml = splits.length >= MIN_SPLITS_FOR_CHART ? RouteMapLegend() : "";

    const viewRouteCta = `

        <span class="comunidad-detail-view-route-cta">

            <iconify-icon icon="solar:map-arrow-square-bold-duotone"></iconify-icon>

            Ver ruta

        </span>

    `;

    return RouteMapTapTarget("comunidad-detail-map", legendHtml + viewRouteCta);

}

// Tarjeta de stats -- punto de entrada SIEMPRE, tenga o no GPS el entreno
// (pulido de cierre, punto 6): antes un entreno con GPS abría directo el
// mapa a pantalla completa sin mostrar ningún dato encima; ahora el mapa
// fullscreen es una acción explícita (CTA "Ver ruta" de ComunidadDetailMedia)
// en vez del primer plano.
function ComunidadDetailCard(alias, detail) {

    return `

        <div class="comunidad-detail-card">

            ${ComunidadDetailHeader(alias, detail)}

            ${ComunidadDetailMedia(detail)}

            ${ComunidadDetailStats(detail)}

        </div>

    `;

}

// Mapa a pantalla completa -- EL MISMO componente que ya usa
// RunningDetailView.js para un entreno propio (RouteMapFullscreenOverlay:
// marcadores de km con popup, leyenda de colores, zoom/pellizco libre,
// botón de cerrar), reutilizado tal cual. Su botón de cerrar
// (data-action="close-route-map-fullscreen", ya incluido en el propio
// componente) vuelve a ComunidadDetailCard de arriba -- initComunidadEvents.js
// lo liga a closeComunidadDetailMap(), NUNCA a closeComunidadRouteDetail()
// (ese es solo el de ComunidadDetailHeader). El montaje real del mapa
// Leaflet (segments/markers coloreados por ritmo) lo hace
// initComunidadEvents.js sobre "comunidad-detail-map-fullscreen" una vez
// insertado en el DOM.
function ComunidadDetailFullscreenMap(detail) {

    const splits = chartSplits(detail);
    const legendHtml = splits.length >= MIN_SPLITS_FOR_CHART ? RouteMapLegend() : "";

    return RouteMapFullscreenOverlay("comunidad-detail-map-fullscreen", legendHtml);

}

// Ya NO es "siempre fullscreen" (nombre heredado de antes del pulido de
// cierre, punto 6) -- el mapa a pantalla completa es ahora la EXCEPCIÓN
// (solo si hay GPS y el usuario pidió "Ver ruta"), la tarjeta de stats es
// la regla.
function ComunidadDetailBody(alias, detail) {

    if (hasRouteTrace(detail) && isComunidadDetailMapExpanded()) {
        return ComunidadDetailFullscreenMap(detail);
    }

    return ComunidadDetailCard(alias, detail);

}

// Aviso breve si la petición de detalle falla (punto de la especificación:
// "vuelve a la lista sin abrir nada... sin romper la navegación") -- se
// limpia solo (ver ROUTE_DETAIL_ERROR_TIMEOUT_MS en comunidadStore.js), sin
// botón ni acción: no hay nada que reintentar de un solo entreno concreto,
// a diferencia del error de la lista completa (ComunidadActividadView.js).
function ComunidadRouteDetailError(message) {

    return `<div class="comunidad-detail-toast">${escapeHtml(message)}</div>`;

}

function ComunidadRouteDetailOverlay() {

    const state = getComunidadRouteDetail();
    const error = getComunidadRouteDetailError();

    if (state.status === "loading") return ComunidadRouteDetailLoading(state.alias);
    if (state.status === "ready") return ComunidadDetailBody(state.alias, state.detail);
    if (error) return ComunidadRouteDetailError(error);

    return "";

}

// Las 2 pestañas son ya funcionales, sobre LA MISMA lista de entrenos ya
// cargada (getComunidadEntrenos(), una única petición real por sesión) --
// ninguna dispara una llamada propia al backend. Ranking añade el alias
// propio (getMyProfile(), Profile/profileStore.js -- perfil real completo
// desde el rediseño de Perfil, aquí solo interesa aliasPublico) para
// resaltar la fila del usuario -- null si todavía no configuró uno en
// Perfil, caso en el que simplemente no se resalta ninguna fila (nunca se
// adivina cuál sería). Actividad añade su propio filtro por tipo
// (comunidadStore.js).
function ComunidadTabContent(activeTab) {

    if (activeTab === "ranking") return ComunidadRankingView(getComunidadEntrenos(), getMyProfile().aliasPublico ?? null, getComunidadRankingPeriod());

    return ComunidadActividadView(getComunidadEntrenos(), getComunidadActivityTypeFilter());

}

export function Comunidad() {

    const activeTab = getComunidadTab();

    // Bug real corregido: el mapa fullscreen del detalle y el contenido de
    // la tab activa (Actividad -- cada tarjeta con GPS con su propio mapa
    // pequeño, mismo mountRouteMap()) son MUTUAMENTE EXCLUYENTES, mismo
    // criterio que ya usa RunningDetailView.js para su propio mapa pequeño
    // vs fullscreen. Sin esto, la lista se quedaba montada (con sus propias
    // instancias de Leaflet vivas) DEBAJO del overlay -- su control de
    // atribución (z-index alto a propósito de Leaflet, por encima del
    // z-index del propio overlay al no compartir contexto de apilamiento)
    // se colaba por encima, viéndose como una segunda atribución de Esri
    // duplicada a media altura de la pantalla.
    const routeDetailOpen = getComunidadRouteDetail().status === "ready";

    return `

        <div class="comunidad">

            <div class="comunidad-content">

                ${ComunidadHero()}

                ${ComunidadTabs(activeTab)}

                ${routeDetailOpen ? "" : ComunidadTabContent(activeTab)}

            </div>

            ${BottomNavigation()}

            ${ComunidadRouteDetailOverlay()}

        </div>

    `;

}
