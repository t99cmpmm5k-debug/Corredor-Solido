import "./Comunidad.css";

import { BottomNavigation } from "../../components/Navigation/BottomNavigation.js";
import { getComunidadTab, getComunidadEntrenos, getComunidadRouteDetail, getComunidadRouteDetailError, COMUNIDAD_TABS } from "./comunidadStore.js";
import { ComunidadHero } from "./components/ComunidadHero.js";
import { ComunidadMapasView } from "./components/ComunidadMapasView.js";
import { RouteMapFullscreenOverlay, RouteMapLegend } from "../../components/RouteMap/RouteMap.js";
import { chartSplits, MIN_SPLITS_FOR_CHART } from "../Running/components/RunningDetailView.js";

const TAB_LABELS = {
    actividad: "Actividad",
    mapas: "Mapas",
    ranking: "Ranking"
};

// Cápsula única (ajuste visual: acercar al mockup aprobado) en vez de
// píldoras sueltas -- mismo patrón que .gym-detail-tabs/.gym-detail-tab
// (GymExerciseDetailView.css: HISTORIAL/GRÁFICAS), no el de
// .carreras-tabs (esas SÍ son píldoras independientes, pensadas para
// poder crecer y hacer scroll horizontal si hiciera falta -- aquí son
// siempre exactamente 3, un segmento fijo). Actividad y Ranking ya se ven
// como opciones reales (mockup: las 3 visibles desde ya), pero solo Mapas
// tiene contenido funcional -- las otras dos caen al mismo "Próximamente"
// (ver ComunidadComingSoon más abajo) hasta sus propias fases.
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

// Mismo escapeHtml local que ya usa ComunidadMapasView.js/updateNotifier.js
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
// a diferencia del error de la lista completa (ComunidadMapasView.js).
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

function ComunidadComingSoon() {

    return `

        <div class="comunidad-empty">

            <iconify-icon icon="solar:ranking-bold-duotone"></iconify-icon>

            <p>Próximamente.</p>

        </div>

    `;

}

export function Comunidad() {

    const activeTab = getComunidadTab();

    return `

        <div class="comunidad">

            <div class="comunidad-content">

                ${ComunidadHero()}

                ${ComunidadTabs(activeTab)}

                ${activeTab === "mapas" ? ComunidadMapasView(getComunidadEntrenos()) : ComunidadComingSoon()}

            </div>

            ${BottomNavigation()}

            ${ComunidadRouteDetailOverlay()}

        </div>

    `;

}
