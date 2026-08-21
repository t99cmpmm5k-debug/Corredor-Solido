import "./Carreras.css";

import { BottomNavigation } from "../../components/Navigation/BottomNavigation.js";
import { CarrerasHero } from "./components/CarrerasHero.js";
import { RaceListCard } from "./components/RaceListCard.js";
import { RaceDetailView } from "./components/RaceDetailView.js";
import { RaceImportWizard } from "./components/RaceImportWizard.js";
import { getWorkouts, getPlannedRaces } from "../../data/workoutStore.js";
import { getActiveTab, setActiveTab, getSearchQuery, getSelectedPlannedRaceId, RACE_TABS } from "./carrerasStore.js";
import { getRaceImportStep } from "./raceImportStore.js";
import { formatMonthLabel } from "../../components/MonthCalendar/MonthCalendar.js";
import { buildRaceEntries, categorizeRaceEntries, filterRaceEntriesByQuery, groupEntriesByMonth } from "./raceEntries.js";

const TAB_LABELS = {
    proximas: "Próximas",
    misCarreras: "Mis carreras",
    pasadas: "Pasadas"
};

const TAB_EMPTY_HINTS = {
    proximas: "Importa un calendario de carreras futuras para verlas aquí.",
    misCarreras: "Clasifica un entreno como \"Carrera\" desde Running para verlo aquí.",
    pasadas: "Aquí aparecerán las carreras planificadas cuya fecha ya pasó."
};

function CarrerasTabs(activeTab, counts) {

    return `

        <div class="carreras-tabs">

            ${RACE_TABS.map(tab => `

                <button
                    class="carreras-tab ${tab === activeTab ? "is-active" : ""}"
                    data-action="select-race-tab"
                    data-tab="${tab}"
                >

                    ${TAB_LABELS[tab]}${counts[tab] ? ` (${counts[tab]})` : ""}

                </button>

            `).join("")}

        </div>

    `;

}

function CarrerasSearchRow(query) {

    return `

        <div class="carreras-search-row">

            <label class="carreras-search">

                <iconify-icon icon="solar:magnifer-linear"></iconify-icon>

                <input
                    type="text"
                    id="carreras-search-input"
                    placeholder="Buscar carrera"
                    value="${query}"
                >

            </label>

            <!-- Sin lógica de filtros todavía (por tipo/distancia/etc.) —
                 botón puramente visual hasta que exista algo real que
                 filtrar, ver instrucciones del rediseño. -->
            <button class="carreras-filters-button" type="button">

                <iconify-icon icon="solar:tuning-2-bold-duotone"></iconify-icon>
                Filtros

            </button>

        </div>

    `;

}

function CarrerasEmptyState(activeTab, hasQuery) {

    if (hasQuery) {
        return `

            <div class="carreras-empty">

                <iconify-icon icon="solar:magnifer-bold-duotone"></iconify-icon>

                <p>Ninguna carrera coincide con la búsqueda.</p>

            </div>

        `;
    }

    return `

        <div class="carreras-empty">

            <iconify-icon icon="solar:flag-2-bold-duotone"></iconify-icon>

            <p>Todavía no hay carreras en "${TAB_LABELS[activeTab]}".</p>

            <p class="carreras-empty-hint">${TAB_EMPTY_HINTS[activeTab]}</p>

        </div>

    `;

}

function CarrerasList(entries) {

    const groups = groupEntriesByMonth(entries);

    return `

        <div class="carreras-list">

            ${groups.map(group => `

                <div class="carreras-month-group">

                    <p class="carreras-month-title">${formatMonthLabel(group.monthDate).toUpperCase()}</p>

                    <div class="carreras-month-cards">

                        ${group.entries.map(RaceListCard).join("")}

                    </div>

                </div>

            `).join("")}

        </div>

    `;

}

export function Carreras() {

    // El wizard de importación se superpone a la pantalla normal de
    // Carreras (mismo patrón que en Plan) en vez de vivir en su propia
    // ruta — así el gesto de atrás del móvil puede cerrarlo sin salir de
    // la app.
    if (getRaceImportStep() !== "closed") {

        return `

            <section class="carreras">

                ${RaceImportWizard()}

            </section>

            ${BottomNavigation()}

        `;

    }

    const entries = buildRaceEntries(getWorkouts(), getPlannedRaces());
    const { proximas, misCarreras, pasadas } = categorizeRaceEntries(entries);
    const byTab = { proximas, misCarreras, pasadas };

    // El detalle de una carrera PLANIFICADA vive dentro de esta misma
    // pantalla (igual que el wizard) — una completada de verdad sigue
    // saltando al detalle real de Running (ver openRaceEntry() en
    // initCarrerasEvents.js), no se toca ese camino.
    const selectedPlannedRaceId = getSelectedPlannedRaceId();

    if (selectedPlannedRaceId) {

        const selectedRace = [...proximas, ...pasadas].find(e => e.id === selectedPlannedRaceId);

        return `

            ${RaceDetailView(selectedRace)}

            ${BottomNavigation()}

        `;

    }

    const activeTab = getActiveTab();
    const query = getSearchQuery();
    const visibleEntries = filterRaceEntriesByQuery(byTab[activeTab], query);

    return `

        <div class="carreras">

            <div class="carreras-content">

                ${CarrerasHero(entries.length)}

                ${CarrerasTabs(activeTab, {
                    proximas: proximas.length,
                    misCarreras: misCarreras.length,
                    pasadas: pasadas.length
                })}

                ${CarrerasSearchRow(query)}

                <button class="carreras-import-button" data-action="open-race-import">

                    <iconify-icon icon="solar:calendar-add-bold-duotone"></iconify-icon>

                    Importar carreras

                </button>

                ${visibleEntries.length === 0 ? CarrerasEmptyState(activeTab, query.trim().length > 0) : CarrerasList(visibleEntries)}

            </div>

            ${BottomNavigation()}

        </div>

    `;

}
