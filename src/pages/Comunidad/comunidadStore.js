import {
    getEntrenosComunidad, getEntrenoComunidadDetail, likeComunidadEntreno, unlikeComunidadEntreno,
    postComunidadComment as postComunidadCommentApi, getComunidadEntrenoComments, deleteComunidadComment as deleteComunidadCommentApi
} from "../../data/communityApi.js";
import { getToken } from "../../data/authStore.js";
import { getMyAlias } from "../Profile/profileStore.js";
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
// La carga de comentarios (Fase 3c) se encadena DESPUÉS de que el detalle
// resuelva, no en paralelo -- así un único catch más abajo puede distinguir
// sin ambigüedad "falló el detalle" (routeDetailState sigue "loading") de
// "falló solo la carga de comentarios" (routeDetailState ya está "ready").
// commentsPanelExpanded siempre arranca colapsado -- el panel es una franja
// fina hasta que el usuario la abre a propósito (ver toggleComunidadCommentsPanel).
export function openComunidadRouteDetail(entreno) {

    lastError = null;
    routeDetailState = { status: "loading", alias: entreno.alias };
    rerender();

    getEntrenoComunidadDetail(entreno.id, getToken()).then(detail => {

        routeDetailState = {
            status: "ready", alias: entreno.alias, detail,
            comments: { status: "loading", items: [] },
            commentsPanelExpanded: false
        };
        rerender();

        return getComunidadEntrenoComments(entreno.id, getToken());

    }).then(data => {

        // Guarda contra dos carreras reales: (a) el usuario ya cerró el
        // detalle antes de que esto resolviera, (b) el usuario cerró Y
        // volvió a abrir OTRO entreno distinto antes de que esto resolviera
        // -- sin comprobar también el id, esta respuesta vieja pisaría los
        // comentarios del entreno nuevo que sí está abierto ahora mismo.
        if (routeDetailState.status === "ready" && routeDetailState.detail.id === entreno.id) {
            routeDetailState.comments = { status: "ready", items: data.comments || [] };
            rerender();
        }

    }).catch(err => {

        if (routeDetailState.status === "ready" && routeDetailState.detail?.id === entreno.id) {

            // El detalle ya había cargado bien -- solo fallaron los
            // comentarios, no hace falta cerrar el mapa/pantalla por esto.
            console.warn("No se pudieron cargar los comentarios de este entreno.", err);
            routeDetailState.comments = { status: "unavailable", items: [] };
            rerender();
            return;

        }

        if (routeDetailState.status === "loading") {

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

        }

    });

}

export function closeComunidadRouteDetail() {

    routeDetailState = { status: "closed" };
    rerender();

}

export function toggleComunidadCommentsPanel() {

    if (routeDetailState.status !== "ready") return;

    routeDetailState.commentsPanelExpanded = !routeDetailState.commentsPanelExpanded;
    rerender();

}

// Likes del feed de Actividad (Fase 3b) -- update OPTIMISTA: cambia
// likedByMe/likesCount del entreno ya cargado en entrenosState.entrenos
// (mutación directa sobre ese mismo objeto, no una copia -- así el mismo
// entreno se ve actualizado en cualquier sitio que lo lea, sin tener que
// reconstruir la lista entera) antes de que el servidor responda, y repinta
// de inmediato. Si la petición falla, revierte a los valores de antes de
// tocar nada; si tiene éxito, se queda con el likesCount REAL que devuelve
// el servidor en vez del +1/-1 local (el optimista es solo para que se
// sienta instantáneo, nunca la fuente de verdad final).
const pendingLikeToggles = new Set();

export function toggleLikeComunidadEntreno(entrenoId) {

    // Evita una segunda petición mientras la primera sigue en el aire --
    // un doble toque rápido en el corazón no debe mandar un like Y un
    // unlike en paralelo, cuyo orden de respuesta no está garantizado.
    if (pendingLikeToggles.has(entrenoId)) return;

    const entreno = entrenosState.entrenos.find(e => e.id === entrenoId);
    if (!entreno) return;

    const previousLiked = entreno.likedByMe;
    const previousCount = entreno.likesCount;

    entreno.likedByMe = !previousLiked;
    entreno.likesCount = previousCount + (entreno.likedByMe ? 1 : -1);

    pendingLikeToggles.add(entrenoId);
    rerender();

    const request = previousLiked
        ? unlikeComunidadEntreno(entrenoId, getToken())
        : likeComunidadEntreno(entrenoId, getToken());

    request.then(data => {

        entreno.likedByMe = data.liked;
        entreno.likesCount = data.likesCount;

    }).catch(err => {

        console.warn("No se pudo actualizar el like de este entreno.", err);

        entreno.likedByMe = previousLiked;
        entreno.likesCount = previousCount;

    }).finally(() => {

        pendingLikeToggles.delete(entrenoId);
        rerender();

    });

}

// Comentarios (Fase 3c) -- viven DENTRO de routeDetailState.comments (solo
// tiene sentido mientras el detalle de ESE entreno está abierto), a
// diferencia de likesCount/likedByMe, que viven en cada entreno de
// entrenosState.entrenos (visibles siempre en la tarjeta del feed). El
// número de comentarios SÍ se pinta en la tarjeta (punto 11) -- por eso
// cada alta/baja aquí también ajusta entrenosState.entrenos a mano, para
// que la tarjeta de debajo quede al día en cuanto se cierre el detalle,
// sin depender de una recarga completa de la lista.
function adjustFeedCommentsCount(entrenoId, delta) {

    const entreno = entrenosState.entrenos.find(e => e.id === entrenoId);
    if (entreno) entreno.commentsCount = (entreno.commentsCount ?? 0) + delta;

}

export function getComunidadDetailComments() {

    return routeDetailState.status === "ready" ? routeDetailState.comments : { status: "idle", items: [] };

}

export function getComunidadCommentsPanelExpanded() {
    return routeDetailState.status === "ready" && !!routeDetailState.commentsPanelExpanded;
}

// Comentario optimista: aparece en la lista al instante, con un id
// temporal (nunca puede chocar con uno real -- los reales son enteros
// AUTO_INCREMENT del servidor) y `pending:true` (para poder atenuarlo
// visualmente mientras se confirma, ver ComunidadCommentsPanel.js). Al
// confirmar el servidor, se sustituye por el comentario real (con su id
// real, por si hay que borrarlo después). Si falla, se retira sin más --
// nunca se deja un comentario fantasma que parezca publicado y no lo esté.
let tempCommentSeq = 0;

export function submitComunidadComment(text) {

    if (routeDetailState.status !== "ready") return;

    const trimmed = String(text ?? "").trim();
    if (!trimmed) return;

    const entrenoId = routeDetailState.detail.id;
    const tempId = `temp-${++tempCommentSeq}`;

    const optimisticComment = {
        id: tempId,
        alias: getMyAlias().value || "Tú",
        text: trimmed,
        createdAt: new Date().toISOString(),
        isMine: true,
        pending: true
    };

    routeDetailState.comments = {
        status: "ready",
        items: [...routeDetailState.comments.items, optimisticComment]
    };

    adjustFeedCommentsCount(entrenoId, 1);
    rerender();

    postComunidadCommentApi(entrenoId, trimmed, getToken()).then(created => {

        if (routeDetailState.status !== "ready" || routeDetailState.detail.id !== entrenoId) return;

        routeDetailState.comments.items = routeDetailState.comments.items.map(c => c.id === tempId ? created : c);
        rerender();

    }).catch(err => {

        console.warn("No se pudo publicar el comentario.", err);

        adjustFeedCommentsCount(entrenoId, -1);

        if (routeDetailState.status !== "ready" || routeDetailState.detail.id !== entrenoId) return;

        routeDetailState.comments.items = routeDetailState.comments.items.filter(c => c.id !== tempId);
        rerender();

    });

}

// Borrar SOLO tiene sentido sobre un comentario propio real (isMine, con un
// id real del servidor -- ComunidadCommentsPanel.js no pinta el botón de
// borrar sobre uno todavía pending). Optimista igual que arriba: desaparece
// al instante, reaparece en su sitio original (splice por índice, no un
// simple push al final) si el borrado falla de verdad.
export function deleteComunidadCommentEntry(commentId) {

    if (routeDetailState.status !== "ready") return;

    const entrenoId = routeDetailState.detail.id;
    const items = routeDetailState.comments.items;
    const index = items.findIndex(c => c.id === commentId);
    if (index === -1) return;

    const [removed] = items.splice(index, 1);

    adjustFeedCommentsCount(entrenoId, -1);
    rerender();

    deleteComunidadCommentApi(entrenoId, commentId, getToken()).catch(err => {

        console.warn("No se pudo borrar el comentario.", err);

        adjustFeedCommentsCount(entrenoId, 1);

        if (routeDetailState.status !== "ready" || routeDetailState.detail.id !== entrenoId) return;

        routeDetailState.comments.items.splice(index, 0, removed);
        rerender();

    });

}
