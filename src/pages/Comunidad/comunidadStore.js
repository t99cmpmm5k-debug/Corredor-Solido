import { getEntrenosComunidad } from "../../data/communityApi.js";
import { getToken } from "../../data/authStore.js";
import { rerender } from "../../core/router.js";

// Orden real del selector (Actividad | Mapas | Ranking, ver mockup) --
// Actividad y Ranking solo se VEN ya (para que las 3 opciones coincidan
// con el diseño aprobado desde ya), su contenido real sigue siendo
// "Próximamente" hasta la Fase 3/Fase 2 respectivamente. Mapas se queda
// como tab por defecto (más abajo) -- es la única funcional hoy.
export const COMUNIDAD_TABS = ["actividad", "mapas", "ranking"];

let activeTab = "mapas";

export function getComunidadTab() {
    return activeTab;
}

export function setComunidadTab(tab) {

    if (!COMUNIDAD_TABS.includes(tab)) return;
    activeTab = tab;

}

// La pantalla siempre arranca en "Mapas" al entrar desde la navegación --
// mismo criterio que resetPlanView()/resetCarrerasView() (BottomNavigation.js):
// lo que estuvieras viendo antes no persiste. No toca entrenosState (más
// abajo) -- los datos de la comunidad no dependen de qué sub-apartado
// estés mirando, no hace falta recargarlos por volver a entrar en la tab.
export function resetComunidadView() {
    activeTab = "mapas";
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
