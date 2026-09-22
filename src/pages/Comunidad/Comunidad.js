import "./Comunidad.css";

import { BottomNavigation } from "../../components/Navigation/BottomNavigation.js";
import { getComunidadTab, getComunidadEntrenos, COMUNIDAD_TABS } from "./comunidadStore.js";
import { ComunidadHero } from "./components/ComunidadHero.js";
import { ComunidadMapasView } from "./components/ComunidadMapasView.js";

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

        </div>

    `;

}
