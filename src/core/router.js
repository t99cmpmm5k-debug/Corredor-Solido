import { setState } from "./state";
import { render } from "./render";
import { resetScrollToTop } from "../utils/scrollReset.js";

export function start(page) {

    setState("currentPage", page);

    render();

}

export function navigate(page) {

    setState("currentPage", page);

    render();

    // Bug real (ronda de pulido de Plan, 2026-08-27): sin esto, cambiar de
    // pantalla conservaba el scroll de la pantalla anterior -- si venías
    // desplazado hacia abajo, la nueva pantalla podía aparecer ya
    // desplazada, con su propio contenido de arriba (título, cabecera)
    // asomando por detrás del notch/isla dinámica o de la barra de
    // estado. Cada `navigate()` es siempre un cambio de pantalla real, así
    // que siempre debe arrancar arriba del todo.
    resetScrollToTop();

}

// resetScroll: mismo bug que ya resuelve navigate() con resetScrollToTop()
// (ver scrollReset.js) -- rerender() reemplaza #app.innerHTML entero sin
// tocar el scroll, así que si el usuario estaba desplazado hacia abajo,
// el contenido de arriba de la pantalla puede reaparecer superpuesto a la
// barra de estado/isla dinámica. Pero rerender() lo llaman más de 150
// sitios en toda la app (cada checkbox de una serie en Gym, cada +/- de
// peso/reps, cada nota, cada edición de Plan/Running...) -- resetear el
// scroll SIEMPRE rompería esos flujos, donde el usuario espera quedarse
// donde estaba. Por eso es opt-in (default false, ver el resto de sitios
// que ya llaman a rerender() sin tocar) en vez de automático: solo los
// disparadores que de verdad reemplazan el contenido de la parte de
// arriba de la pantalla (SessionCard, el widget de tiempo) lo piden.
export function rerender({ resetScroll = false } = {}) {

    render();

    if (resetScroll) resetScrollToTop();

}