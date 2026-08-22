// "Completadas vs planificadas" es la única distinción que ya existe en
// los datos (workouts type:"race" frente a plannedRaces) — las 3 tabs de
// la lista son ese mismo cruce, no una categorización nueva:
//   - proximas: planificada con fecha de hoy en adelante (aún no corrida)
//   - misCarreras: completada (hay un workout real, sea cual sea su fecha)
//   - pasadas: planificada con fecha ya vencida (nunca se corrió, o se
//     corrió pero no hay forma de enlazarla con su workout real todavía)
export const RACE_TABS = ["proximas", "misCarreras", "pasadas"];

// "all" + las dos regiones que ya trae el propio dato (Murcia de las
// carreras importadas/sembradas hasta ahora, Andalucía de este lote
// nuevo) — no un catálogo cerrado aparte que mantener sincronizado.
export const RACE_REGIONS = ["all", "Murcia", "Andalucía"];

// "all" + los dos type que ya trae el propio dato (RU de asfalto, TRS de
// trail) — mismos códigos que disciplineType en raceEntries.js, sus
// etiquetas legibles salen de formatDisciplineType() (raceFormat.js) para
// no mantener un segundo mapa de nombres. La subcategoría más fina
// (Popular/Media Maratón/Maratón dentro de RU) sigue pendiente, esto solo
// distingue asfalto de trail.
export const RACE_TYPES = ["all", "RU", "TRS"];

let activeTab = "proximas";
let searchQuery = "";
let selectedRegion = "all";
let selectedType = "all";
let selectedPlannedRaceId = null;

export function getActiveTab() {

    return activeTab;

}

export function setActiveTab(tab) {

    if (!RACE_TABS.includes(tab)) return;
    activeTab = tab;

}

export function getSearchQuery() {

    return searchQuery;

}

export function setSearchQuery(query) {

    searchQuery = query;

}

export function getSelectedRegion() {

    return selectedRegion;

}

export function setSelectedRegion(region) {

    if (!RACE_REGIONS.includes(region)) return;
    selectedRegion = region;

}

export function getSelectedType() {

    return selectedType;

}

export function setSelectedType(type) {

    if (!RACE_TYPES.includes(type)) return;
    selectedType = type;

}

export function getSelectedPlannedRaceId() {

    return selectedPlannedRaceId;

}

export function setSelectedPlannedRaceId(id) {

    selectedPlannedRaceId = id;

}

// La pantalla siempre arranca en "Próximas" al entrar desde la
// navegación — mismo criterio que resetCarrerasView() en versiones
// anteriores: lo que estuvieras viendo antes no persiste.
export function resetCarrerasView() {

    activeTab = "proximas";
    searchQuery = "";
    selectedRegion = "all";
    selectedType = "all";
    selectedPlannedRaceId = null;

}
