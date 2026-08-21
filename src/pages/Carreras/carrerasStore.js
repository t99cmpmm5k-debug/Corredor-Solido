// "Completadas vs planificadas" es la única distinción que ya existe en
// los datos (workouts type:"race" frente a plannedRaces) — las 3 tabs de
// la lista son ese mismo cruce, no una categorización nueva:
//   - proximas: planificada con fecha de hoy en adelante (aún no corrida)
//   - misCarreras: completada (hay un workout real, sea cual sea su fecha)
//   - pasadas: planificada con fecha ya vencida (nunca se corrió, o se
//     corrió pero no hay forma de enlazarla con su workout real todavía)
export const RACE_TABS = ["proximas", "misCarreras", "pasadas"];

let activeTab = "proximas";
let searchQuery = "";
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
    selectedPlannedRaceId = null;

}
