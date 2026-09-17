import "./updateNotifier.css";
import { fetchReleaseNotes } from "./releaseNotes.js";

const BANNER_CLASS = "update-banner";

function escapeHtml(text) {

    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

}

function showUpdateBanner() {

    if (document.querySelector(`.${BANNER_CLASS}`)) return;

    const banner = document.createElement("div");
    banner.className = BANNER_CLASS;

    banner.innerHTML = `

        <div class="update-banner-main">

            <span class="update-banner-text">Hay una versión nueva de la app</span>

            <button type="button" class="update-banner-reload">Actualizar</button>

            <button type="button" class="update-banner-dismiss" aria-label="Cerrar aviso">
                <iconify-icon icon="solar:close-circle-bold-duotone"></iconify-icon>
            </button>

        </div>

    `;

    banner.querySelector(".update-banner-reload").addEventListener("click", () => {
        window.location.reload();
    });

    banner.querySelector(".update-banner-dismiss").addEventListener("click", () => {
        banner.remove();
    });

    document.body.appendChild(banner);

    // Se rellena aparte y de forma asíncrona (nunca bloquea el aviso ni
    // los botones Actualizar/Cerrar, que ya funcionan desde el primer
    // instante) -- si la petición a GitHub falla o no hay red, el aviso se
    // queda tal cual, sin el resumen, en vez de quedarse a medio pintar.
    fetchReleaseNotes().then(notes => {

        if (!notes.length || !banner.isConnected) return;

        banner.classList.add(`${BANNER_CLASS}--expanded`);

        const list = document.createElement("ul");
        list.className = "update-banner-notes";
        list.innerHTML = notes.map(note => `<li>${escapeHtml(note)}</li>`).join("");

        banner.appendChild(list);

    });

}

// Registra el Service Worker y avisa (sin recargar solo) cuando una
// versión nueva ha tomado el control de la pestaña mientras estaba
// abierta -- sin esto, el SW actualiza el código de fondo (skipWaiting +
// clients.claim en sw.js) pero la página ya cargada se queda corriendo el
// JS viejo en memoria hasta que alguien recarga a mano, sin saber que
// hace falta. hadControllerBefore descarta la primerísima instalación
// (ahí no hay "versión anterior" de la que avisar, sería un falso aviso
// en la primera visita de cualquiera).
export function initUpdateNotifier() {

    if (!("serviceWorker" in navigator)) return;

    const hadControllerBefore = Boolean(navigator.serviceWorker.controller);

    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).then(registration => {

        if (!registration) return;

        // Al volver a la pestaña/PWA (p. ej. después de una carrera con la
        // app en segundo plano un buen rato) -- si no, una pestaña que se
        // queda abierta días no vuelve a comprobar por su cuenta hasta que
        // el navegador decida hacerlo.
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") registration.update().catch(() => {});
        });

    }).catch(() => {});

    if (hadControllerBefore) {
        navigator.serviceWorker.addEventListener("controllerchange", showUpdateBanner, { once: true });
    }

}
