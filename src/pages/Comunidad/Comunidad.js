import "./Comunidad.css";

import { BottomNavigation } from "../../components/Navigation/BottomNavigation.js";
import { getComunidadTab, getComunidadEntrenos, COMUNIDAD_TABS } from "./comunidadStore.js";
import { ComunidadMapasView } from "./components/ComunidadMapasView.js";

const TAB_LABELS = {
    mapas: "Mapas",
    ranking: "Ranking"
};

// Mismo patrón visual de píldoras que CarrerasTabs() (Carreras.js) -- solo
// "mapas" está funcional en esta fase, "ranking" ya se ve como pestaña
// (para que su llegada en la Fase 2 no sea una sorpresa) pero lleva a un
// estado "Próximamente" fijo, no a ninguna vista real todavía. Sin
// "actividad" a propósito (pedido explícito de esta fase) -- esa tercera
// pestaña del mockup se añade cuando le toque su propia fase.
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

function ComunidadRankingPlaceholder() {

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

                <header class="comunidad-header">

                    <h1>Comunidad</h1>

                </header>

                ${ComunidadTabs(activeTab)}

                ${activeTab === "mapas" ? ComunidadMapasView(getComunidadEntrenos()) : ComunidadRankingPlaceholder()}

            </div>

            ${BottomNavigation()}

        </div>

    `;

}
