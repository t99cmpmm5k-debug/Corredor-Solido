import { getEntrenosComunidad, getEntrenoComunidadDetail } from "../../data/communityApi.js";
import { getToken } from "../../data/authStore.js";
import { rerender } from "../../core/router.js";

// Orden real del selector (Actividad | Ranking, ver mockup original) --
// Mapas existió como pestaña propia (Fase 1) pero era un subconjunto
// exacto de Actividad (solo entrenos con GPS, sin filtro de tipo) desde
// que Actividad ganó su propio feed con mapa/placeholder por entreno
// (Fase 3a) -- fusionada dentro de Actividad, ya no es una sección aparte.
// Actividad es la tab por defecto (más abajo), coherente con el mockup
// original.
export const COMUNIDAD_TABS = ["actividad", "ranking"];

let activeTab = "actividad";

export function getComunidadTab() {
    return activeTab;
}

export function setComunidadTab(tab) {

    if (!COMUNIDAD_TABS.includes(tab)) return;
    activeTab = tab;

}

// Filtro por tipo del feed de Actividad -- "" (Todos) o uno de
// easy/long/series/race, mismo id real que ya usa Running (RUNNING_WORKOUT_TYPES).
// Vive aparte de activeTab: cambiar de pestaña y volver a Actividad no debe
// perder el filtro elegido dentro de la misma visita a Comunidad (solo
// resetComunidadView(), al salir de Comunidad del todo, lo limpia).
let activityTypeFilter = "";

export function getComunidadActivityTypeFilter() {
    return activityTypeFilter;
}

export function setComunidadActivityTypeFilter(type) {
    activityTypeFilter = type || "";
}

// La pantalla siempre arranca en "Actividad" al entrar desde la navegación
// -- mismo criterio que resetPlanView()/resetCarrerasView() (BottomNavigation.js):
// lo que estuvieras viendo antes no persiste, incluido el filtro de
// Actividad. No toca entrenosState (más abajo) -- los datos de la
// comunidad no dependen de qué sub-apartado estés mirando, no hace falta
// recargarlos por volver a entrar en la tab.
export function resetComunidadView() {
    activeTab = "actividad";
    activityTypeFilter = "";
}

// idle -> loading -> ready|unavailable, una sola petición real por sesión
// mientras no falle (mismo patrón que myAlias en Profile/profileStore.js) --
// si falla, se queda en "unavailable" hasta que algo la reintente a mano
// (ver retryComunidadEntrenos), nunca reintenta sola.
let entrenosState = { status: "idle", entrenos: [] };

export function getComunidadEntrenos() {
    return entrenosState;
}

export function loadComunidadEntrenos() {

    if (entrenosState.status !== "idle") return;

    entrenosState = { status: "loading", entrenos: [] };

    getEntrenosComunidad(getToken()).then(data => {

        entrenosState = { status: "ready", entrenos: data.entrenos || [] };
        rerender();

    }).catch(err => {

        console.warn("No se pudieron cargar los entrenos de la comunidad.", err);
        entrenosState = { status: "unavailable", entrenos: [] };
        rerender();

    });

}

// Botón "Reintentar" del estado de error (punto 7: "muestra un estado de
// error simple... nunca bloquear la navegación") -- vuelve a "idle" para
// que la siguiente loadComunidadEntrenos() (initComunidadEvents.js, se
// llama en cada render) dispare una petición real nueva.
export function retryComunidadEntrenos() {

    entrenosState = { status: "idle", entrenos: [] };
    rerender();

}

// Detalle completo de UN entreno (mapa fullscreen al pulsar una tarjeta de
// Mapas) -- estado aparte de entrenosState de arriba: la lista ya está
// cargada de antes, esto es una petición nueva por cada tarjeta pulsada,
// nunca cacheada entre una y otra (cada entreno es de un usuario distinto).
// closed -> loading -> ready | closed (error). A propósito NO hay un status
// "error" persistente: "si la llamada falla, vuelve a la lista sin abrir
// nada" -- el aviso es solo `lastError`, un mensaje de usar-y-tirar que
// initComunidadEvents.js/Comunidad.js muestran mientras dure
// ROUTE_DETAIL_ERROR_TIMEOUT_MS y luego se limpia solo.
const ROUTE_DETAIL_ERROR_TIMEOUT_MS = 3000;

let routeDetailState = { status: "closed" };
let lastError = null;

export function getComunidadRouteDetail() {
    return routeDetailState;
}

export function getComunidadRouteDetailError() {
    return lastError;
}

// entreno: {id, alias} de la tarjeta pulsada (ComunidadActividadView.js) -- solo
// esos dos campos hacen falta aquí, el resto (distancia/ritmo/duración) ya
// se pintó en la propia tarjeta y no hace falta repetirlo en el estado.
export function openComunidadRouteDetail(entreno) {

    lastError = null;
    routeDetailState = { status: "loading", alias: entreno.alias };
    rerender();

    getEntrenoComunidadDetail(entreno.id, getToken()).then(detail => {

        routeDetailState = { status: "ready", alias: entreno.alias, detail };
        rerender();

    }).catch(err => {

        console.warn("No se pudo cargar el detalle de este entreno de la comunidad.", err);

        routeDetailState = { status: "closed" };
        lastError = err.message || "No se pudo cargar este recorrido.";
        rerender();

        setTimeout(() => {

            if (lastError) {
                lastError = null;
                rerender();
            }

        }, ROUTE_DETAIL_ERROR_TIMEOUT_MS);

    });

}

export function closeComunidadRouteDetail() {

    routeDetailState = { status: "closed" };
    rerender();

}

