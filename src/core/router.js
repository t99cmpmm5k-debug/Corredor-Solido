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

export function rerender() {

    render();

}