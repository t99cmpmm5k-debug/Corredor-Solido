import "./Comunidad.css";

import { BottomNavigation } from "../../components/Navigation/BottomNavigation.js";
import {
    getComunidadTab, getComunidadEntrenos, getComunidadRouteDetail, getComunidadRouteDetailError,
    getComunidadActivityTypeFilter, COMUNIDAD_TABS
} from "./comunidadStore.js";
import { ComunidadHero } from "./components/ComunidadHero.js";
import { ComunidadRankingView } from "./components/ComunidadRankingView.js";
import { ComunidadActividadView } from "./components/ComunidadActividadView.js";
import { RouteMapFullscreenOverlay, RouteMapLegend } from "../../components/RouteMap/RouteMap.js";
import { chartSplits, MIN_SPLITS_FOR_CHART } from "../Running/components/RunningDetailView.js";
import { getMyAlias } from "../Profile/profileStore.js";

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

// Mapa fullscreen -- EL MISMO componente que ya usa RunningDetailView.js
// para un entreno propio (RouteMapFullscreenOverlay: marcadores de km con
// popup, leyenda de colores, zoom/pellizco libre, botón de cerrar),
// reutilizado tal cual, nunca uno paralelo. La única pieza propia de
// Comunidad es el rótulo de alias de más abajo -- de quién es esta ruta no
// es obvio aquí, a diferencia del uso normal en Running (siempre la tuya):
// vive fuera del propio overlay (que RouteMap.js no toca) pero con su mismo
// z-index/posición fija, para quedar anclado en pantalla igual que el
// propio botón de cerrar. El montaje real del mapa Leaflet (Leaflet en sí,
// segments/markers coloreados por ritmo) lo hace initComunidadEvents.js
// sobre el contenedor "comunidad-detail-map-fullscreen" una vez insertado
// en el DOM -- este componente solo decide si la leyenda tiene sentido
// (mismo umbral MIN_SPLITS_FOR_CHART que ya usa Running para su propio
// mapa, ver chartSplits()).
function ComunidadRouteDetailFullscreen(alias, detail) {

    const splits = chartSplits(detail);
    const legendHtml = splits.length >= MIN_SPLITS_FOR_CHART ? RouteMapLegend() : "";

    return `

        ${RouteMapFullscreenOverlay("comunidad-detail-map-fullscreen", legendHtml)}

        <div class="comunidad-detail-alias-badge">${escapeHtml(alias)}</div>

    `;

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
    if (state.status === "ready") return ComunidadRouteDetailFullscreen(state.alias, state.detail);
    if (error) return ComunidadRouteDetailError(error);

    return "";

}

// Las 2 pestañas son ya funcionales, sobre LA MISMA lista de entrenos ya
// cargada (getComunidadEntrenos(), una única petición real por sesión) --
// ninguna dispara una llamada propia al backend. Ranking añade el alias
// propio (getMyAlias(), Profile/profileStore.js) para resaltar la fila del
// usuario -- null si todavía no configuró uno en Perfil, caso en el que
// simplemente no se resalta ninguna fila (nunca se adivina cuál sería).
// Actividad añade su propio filtro por tipo (comunidadStore.js).
function ComunidadTabContent(activeTab) {

    if (activeTab === "ranking") return ComunidadRankingView(getComunidadEntrenos(), getMyAlias().value ?? null);

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
