import "./Carreras.css";

import { BottomNavigation } from "../../components/Navigation/BottomNavigation.js";
import { CarrerasHero } from "./components/CarrerasHero.js";
import { RaceListCard } from "./components/RaceListCard.js";
import { RaceDetailView } from "./components/RaceDetailView.js";
import { RaceImportWizard } from "./components/RaceImportWizard.js";
import { getWorkouts, getPlannedRaces } from "../../data/workoutStore.js";
import { getActiveTab, setActiveTab, getSearchQuery, getSelectedRegion, getSelectedType, getSelectedPlannedRaceId, RACE_TABS, RACE_REGIONS, RACE_TYPES } from "./carrerasStore.js";
import { getRaceImportStep } from "./raceImportStore.js";
import { formatMonthLabel } from "../../components/MonthCalendar/MonthCalendar.js";
import { formatDisciplineType } from "./raceFormat.js";
import { buildRaceEntries, categorizeRaceEntries, filterRaceEntriesByQuery, filterRaceEntriesByRegion, filterRaceEntriesByType, groupEntriesByMonth, splitFeaturedRace, sortByIndicatorPriority } from "./raceEntries.js";

const TAB_LABELS = {
    proximas: "Próximas",
    misCarreras: "Mis carreras",
    // "Pasadas" -> "Resultados" (pulido de cierre) -- solo el nombre, la
    // tab sigue siendo la misma categoría de siempre (planificada con
    // fecha ya vencida, ver categorizeRaceEntries() en raceEntries.js).
    pasadas: "Resultados"
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

                    ${TAB_LABELS[tab]}

                    ${counts[tab] ? `<span class="carreras-tab-count">${counts[tab]}</span>` : ""}

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

            <!-- Región y type ya tienen su propia fila de chips (ver
                 CarrerasFilterChips) — este botón sigue reservado para la
                 subcategoría más fina dentro del asfalto (Popular/Media
                 Maratón/Maratón), todavía sin resolver. -->
            <button class="carreras-filters-button" type="button">

                <iconify-icon icon="solar:tuning-2-bold-duotone"></iconify-icon>
                Filtros

            </button>

        </div>

    `;

}

const REGION_LABELS = {
    all: "Todas",
    Murcia: "Murcia",
    "Andalucía": "Andalucía"
};

// Fila única de chips (pulido de cierre: antes región y type vivían en
// dos filas de píldoras separadas) — "Todas" resetea LOS DOS filtros a la
// vez (data-action="reset-race-filters", distinto de select-race-region/
// select-race-type porque tiene que tocar ambos), Murcia/Andalucía y
// Asfalto/Trail siguen siendo dos filtros independientes que se combinan
// entre sí (ver filterRaceEntriesByType/ByRegion en raceEntries.js), solo
// que ahora comparten una única fila visual en vez de una jerarquía.
// El botón "Filtros" (subcategoría fina dentro del asfalto, todavía sin
// resolver) se queda tal cual en CarrerasSearchRow, sin tocar.
function CarrerasFilterChips(selectedRegion, selectedType) {

    const isAllActive = selectedRegion === "all" && selectedType === "all";

    return `

        <div class="carreras-filter-row">

            <button
                class="carreras-filter-pill ${isAllActive ? "is-active" : ""}"
                data-action="reset-race-filters"
            >

                Todas

            </button>

            ${RACE_REGIONS.filter(region => region !== "all").map(region => `

                <button
                    class="carreras-filter-pill ${region === selectedRegion ? "is-active" : ""}"
                    data-action="select-race-region"
                    data-region="${region}"
                >

                    ${REGION_LABELS[region]}

                </button>

            `).join("")}

            ${RACE_TYPES.filter(type => type !== "all").map(type => `

                <button
                    class="carreras-filter-pill ${type === selectedType ? "is-active" : ""}"
                    data-action="select-race-type"
                    data-type="${type}"
                >

                    ${formatDisciplineType(type)}

                </button>

            `).join("")}

        </div>

    `;

}

// hasFilter cubre tanto la búsqueda de texto como el filtro de región — en
// cualquiera de los dos casos el hueco es "nada coincide con lo que has
// pedido", no "esta tab está vacía de verdad" (que es lo que sugeriría el
// hint por defecto, pensado para una tab sin ningún dato en absoluto).
function CarrerasEmptyState(activeTab, hasFilter) {

    if (hasFilter) {
        return `

            <div class="carreras-empty">

                <iconify-icon icon="solar:magnifer-bold-duotone"></iconify-icon>

                <p>Ninguna carrera coincide con el filtro.</p>

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

// Tarjeta destacada del objetivo (pulido: "Objetivo principal") -- misma
// RaceListCard() de siempre (ya sabe pintarse distinta cuando isGoal es
// true, ver RaceListCard.css), solo que aquí vive suelta, con su propia
// etiqueta encima, en vez de dentro de un grupo por mes.
function CarrerasFeaturedRace(entry) {

    return `

        <div class="carreras-featured-race">

            <p class="carreras-featured-label">TU OBJETIVO</p>

            ${RaceListCard(entry)}

        </div>

    `;

}

// Lista plana de "Próximas" (pulido: reorganización por indicador
// activo, ver sortByIndicatorPriority() en raceEntries.js) -- a
// diferencia de CarrerasList() más abajo, SIN agrupar por mes: mezclar
// prioridad de indicador con separadores de mes no tiene una lectura
// clara (¿qué mes va primero si el criterio ya no es la fecha?), así que
// esta tab cambia de aspecto respecto a Mis carreras/Resultados a
// propósito.
function CarrerasFlatList(entries) {

    return `

        <div class="carreras-list carreras-flat-list">

            ${entries.map(RaceListCard).join("")}

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
    const selectedRegion = getSelectedRegion();
    const selectedType = getSelectedType();

    // Los contadores de las tabs se quedan con el total sin filtrar, igual
    // que ya pasaba con la búsqueda de texto (nunca se recalculaban por
    // query) — región y type solo recortan la lista visible dentro de la
    // tab activa, no lo que dicen las propias tabs. Los dos filtros son
    // independientes entre sí (encadenados, no una jerarquía), así que da
    // igual el orden en que se apliquen.
    const filtered = filterRaceEntriesByType(filterRaceEntriesByRegion(byTab[activeTab], selectedRegion), selectedType);
    const visibleEntries = filterRaceEntriesByQuery(filtered, query);
    const hasActiveFilter = query.trim().length > 0 || selectedRegion !== "all" || selectedType !== "all";

    // "Próximas" cambia de forma (tarjeta destacada + lista plana por
    // indicador, ver CarrerasFeaturedRace/CarrerasFlatList) -- las otras 2
    // tabs siguen con el agrupado por mes de siempre (CarrerasList). La
    // destacada sale del propio visibleEntries (ya filtrado/buscado): si
    // el objetivo no encaja con el filtro activo, no aparece "fuera" de
    // la lista que se está mirando -- misma regla que el resto de la tab.
    let listSection;

    if (visibleEntries.length === 0) {
        listSection = CarrerasEmptyState(activeTab, hasActiveFilter);
    } else if (activeTab === "proximas") {

        const { featured, rest } = splitFeaturedRace(visibleEntries);
        const sortedRest = sortByIndicatorPriority(rest);

        listSection = `
            ${featured ? CarrerasFeaturedRace(featured) : ""}
            ${sortedRest.length > 0 ? CarrerasFlatList(sortedRest) : ""}
        `;

    } else {
        listSection = CarrerasList(visibleEntries);
    }

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

                ${CarrerasFilterChips(selectedRegion, selectedType)}

                ${listSection}

            </div>

            ${BottomNavigation()}

        </div>

    `;

}
