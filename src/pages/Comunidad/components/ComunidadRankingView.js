import "./ComunidadRankingView.css";
import "./ComunidadMapasView.css";

import { formatSecondsAsClock, formatKm } from "../../../utils/format.js";
import { buildFastestPaceRanking, buildZ2Ranking, buildConsistencyRanking, buildLongRunRanking } from "../communityRanking.js";

// Mismo escapeHtml local que ya usa ComunidadMapasView.js/Comunidad.js por
// el mismo motivo -- el alias es texto libre de OTRO usuario.
function escapeHtml(text) {

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

}

// Coma española, un decimal -- mismo criterio que formatKm() (utils/format.js).
function formatPercent(value) {
    return `${value.toFixed(1).replace(".", ",")}%`;
}

// Mismos 2 estados no-tabla (cargando/error) que ya usa Mapas, reutilizando
// literalmente sus clases (.comunidad-empty/.comunidad-retry-button,
// ComunidadMapasView.css) -- misma data comunidadStore.entrenosState para
// las dos pestañas, así que el mismo botón "Reintentar" ya cableado en
// initComunidadEvents.js sirve aquí sin tocar nada más.
function ComunidadRankingState(icon, text, actionHtml = "") {

    return `

        <div class="comunidad-empty">

            <iconify-icon icon="${icon}"></iconify-icon>

            <p>${text}</p>

            ${actionHtml}

        </div>

    `;

}

// rows: [{alias, value}], ya ordenadas de mejor a peor y recortadas a 5
// puestos por communityRanking.js -- este componente solo pinta, nunca
// decide el orden ni el recorte. myAlias (string|null, del perfil propio,
// ver getMyAlias() en Profile/profileStore.js) resalta la fila propia
// cuando aparece -- null si el usuario no tiene alias público configurado
// todavía, caso en el que simplemente no se resalta ninguna (nunca se
// intenta adivinar cuál sería la propia).
function ComunidadRankingTable(title, rows, formatValue, myAlias) {

    return `

        <section class="comunidad-ranking-table">

            <h3 class="comunidad-ranking-title">${title}</h3>

            ${rows.length === 0 ? `

                <p class="comunidad-ranking-empty">Sin datos esta ventana.</p>

            ` : `

                <ol class="comunidad-ranking-rows">

                    ${rows.map((row, index) => `

                        <li class="comunidad-ranking-row ${row.alias === myAlias ? "is-mine" : ""}">

                            <span class="comunidad-ranking-position">${index + 1}</span>

                            <span class="comunidad-ranking-alias">${escapeHtml(row.alias)}</span>

                            <span class="comunidad-ranking-value">${formatValue(row.value)}</span>

                        </li>

                    `).join("")}

                </ol>

            `}

        </section>

    `;

}

// entrenosState: {status, entrenos} de comunidadStore.js -- LA MISMA lista
// ya cargada para Mapas (sin ninguna llamada nueva al backend, pedido
// explícito de esta fase); myAlias: string|null (getMyAlias().value).
export function ComunidadRankingView(entrenosState, myAlias) {

    const { status, entrenos } = entrenosState;

    if (status === "idle" || status === "loading") {
        return ComunidadRankingState("solar:ranking-bold-duotone", "Cargando el ranking de la comunidad...");
    }

    if (status === "unavailable") {
        return ComunidadRankingState(
            "solar:wifi-router-minimalistic-bold-duotone",
            "No se pudo cargar el ranking.",
            `<button class="comunidad-retry-button" data-action="retry-comunidad-entrenos">Reintentar</button>`
        );
    }

    return `

        <div class="comunidad-ranking-list">

            ${ComunidadRankingTable("Ritmo más rápido", buildFastestPaceRanking(entrenos), v => `${formatSecondsAsClock(v)}/km`, myAlias)}

            ${ComunidadRankingTable("Z2 mejor ejecutada", buildZ2Ranking(entrenos), formatPercent, myAlias)}

            ${ComunidadRankingTable("Más constante", buildConsistencyRanking(entrenos), v => `${v} ${v === 1 ? "entreno" : "entrenos"}`, myAlias)}

            ${ComunidadRankingTable("Mejor tirada larga", buildLongRunRanking(entrenos), v => `${formatKm(v)} km`, myAlias)}

        </div>

    `;

}
