import "./ComunidadCommentsPanel.css";

import { formatDayMonth } from "../../../utils/date.js";

// Mismo escapeHtml local que ya usa Comunidad.js/ComunidadActividadView.js
// por el mismo motivo -- alias Y texto son ambos libres, de OTRO usuario.
function escapeHtml(text) {

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

}

// comment.createdAt es un ISO datetime completo ("2026-09-22T10:00:00.000Z"),
// tanto el real del servidor como el que se inventa el propio comentario
// optimista (new Date().toISOString(), comunidadStore.js) -- formatDayMonth()
// espera solo la parte de fecha ("AAAA-MM-DD"), de ahí el slice(0, 10).
function ComunidadCommentItem(comment) {

    return `

        <li class="comunidad-comment-item ${comment.pending ? "is-pending" : ""}">

            <div class="comunidad-comment-item-header">

                <span class="comunidad-comment-alias">${escapeHtml(comment.alias)}</span>

                ${comment.createdAt ? `<span class="comunidad-comment-date">${formatDayMonth(comment.createdAt.slice(0, 10))}</span>` : ""}

            </div>

            <p class="comunidad-comment-text">${escapeHtml(comment.text)}</p>

            ${comment.isMine && !comment.pending ? `

                <button class="comunidad-comment-delete" data-action="delete-comunidad-comment" data-comment-id="${comment.id}" aria-label="Borrar comentario">

                    <iconify-icon icon="solar:trash-bin-minimalistic-linear"></iconify-icon>

                </button>

            ` : ""}

        </li>

    `;

}

function ComunidadCommentsList(commentsState) {

    if (commentsState.status === "loading") {
        return `<li class="comunidad-comments-notice">Cargando comentarios...</li>`;
    }

    if (commentsState.status === "unavailable") {
        return `<li class="comunidad-comments-notice">No se pudieron cargar los comentarios.</li>`;
    }

    if (commentsState.items.length === 0) {
        return `<li class="comunidad-comments-notice">Sé el primero en comentar.</li>`;
    }

    return commentsState.items.map(ComunidadCommentItem).join("");

}

// Panel colapsado por defecto (una franja fina "Comentarios (N)" pegada
// abajo) para no competir por espacio con el mapa/leyenda ya existentes --
// se expande a un panel más alto con la lista + campo de texto solo cuando
// el usuario lo pide (toggleComunidadCommentsPanel(), comunidadStore.js).
// El input de texto NO está wireado a ningún estado reactivo ni se lee en
// cada pulsación -- initComunidadEvents.js lee su .value directamente del
// DOM solo al enviar (mismo criterio que save-new-shoe: un rerender() en
// cada tecla borraría lo escrito y cerraría el teclado en iOS, lección ya
// aprendida con otro campo de texto libre de esta misma app).
export function ComunidadCommentsPanel(commentsState, expanded) {

    return `

        <div class="comunidad-comments-panel ${expanded ? "is-expanded" : ""}">

            <button class="comunidad-comments-toggle" data-action="toggle-comunidad-comments-panel">

                <iconify-icon icon="solar:chat-round-dots-bold-duotone"></iconify-icon>

                <span>Comentarios (${commentsState.items.length})</span>

                <iconify-icon class="comunidad-comments-chevron" icon="solar:alt-arrow-up-linear"></iconify-icon>

            </button>

            ${expanded ? `

                <div class="comunidad-comments-body">

                    <ul class="comunidad-comments-list">

                        ${ComunidadCommentsList(commentsState)}

                    </ul>

                    <div class="comunidad-comments-input-row">

                        <input
                            type="text"
                            id="comunidad-comment-input"
                            class="comunidad-comments-input"
                            placeholder="Escribe un comentario..."
                            maxlength="500"
                        />

                        <button class="comunidad-comments-send" data-action="submit-comunidad-comment" aria-label="Enviar comentario">

                            <iconify-icon icon="solar:plain-2-bold"></iconify-icon>

                        </button>

                    </div>

                </div>

            ` : ""}

        </div>

    `;

}
