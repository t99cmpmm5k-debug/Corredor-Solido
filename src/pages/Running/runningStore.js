import { resetScrollToTop } from "../../utils/scrollReset.js";

const initial = () => ({

    step: "idle",
    files: [],
    progress: null,
    ocrError: null,
    merged: null,
    captures: [],
    workout: null,
    parseError: null,
    selectedShoeId: null,
    addingNewShoe: false,
    saveError: null,
    savedWorkout: null,
    duplicateWarning: null,
    timingLog: [],
    detailWorkoutId: null,
    newShoePhoto: null,
    editingShoeId: null,
    warningsExpanded: false,
    chartMetricMode: "both",

    // Recorridos de referencia (V1) -- detailRouteId: qué recorrido está
    // abierto en el paso "referenceRouteDetail". creatingRoute: si el
    // formulario mínimo de "crear recorrido" (solo nombre, ver
    // ReferenceRoutesListView.js) está abierto -- el propio texto tecleado
    // NO vive en este store (ver el comentario junto a saveNewRoute() en
    // initRunningEvents.js: era un <input> "controlado" que llamaba a
    // rerender() en cada tecla -- bug real, cerraba el teclado del móvil
    // en cada pulsación porque rerender() reemplaza app.innerHTML entero,
    // remontando el <input> desde cero. Ahora es un campo normal sin
    // controlar, leído del DOM tal cual al guardar -- mismo patrón que
    // brand/model en el alta de zapatilla). routeMenuOpenId: menú "···" de
    // una tarjeta de recorrido (borrar), mismo patrón que historyMenuOpenId.
    detailRouteId: null,
    creatingRoute: false,
    routeMenuOpenId: null,

    // Sugerencia automática de agrupación (ReferenceRouteSuggestionCard.js)
    // -- qué par concreto tiene abierto su propio mini-formulario de
    // "nombrar y agrupar" ahora mismo, aparte de `creatingRoute` a
    // propósito: son dos flujos de creación distintos (uno genérico, otro
    // ya con dos entrenos concretos de por medio) y mezclarlos en el mismo
    // booleano obligaría a decidir de dónde saca el formulario los ids a
    // asignar. null cuando no hay ninguno abierto.
    confirmingSuggestion: null

});

let wizard = initial();

// Filtro de tipo de la lista de Running — aparte de `wizard` a propósito:
// resetWizard() se llama tanto al terminar una importación como al pulsar
// "Importar", y meter el filtro ahí lo borraría sin que el usuario lo
// haya tocado.
let typeFilter = null;

export function getTypeFilter() {

    return typeFilter;

}

export function setTypeFilter(type) {

    typeFilter = type || null;

}

// Orden de la tabla completa (RunningFullTableView) — aparte de `wizard`
// por el mismo motivo que typeFilter. "date"/"desc" por defecto reproduce
// el orden fijo de siempre (más reciente primero), así que nada cambia
// visualmente hasta que se toca una cabecera.
let sortColumn = "date";
let sortDirection = "desc";

export function getSortColumn() {

    return sortColumn;

}

export function getSortDirection() {

    return sortDirection;

}

// Tocar una columna nueva ordena descendente; tocar la misma columna
// alterna la dirección — como un filtro, no como un reset.
export function toggleSort(column) {

    if (sortColumn === column) {
        sortDirection = sortDirection === "desc" ? "asc" : "desc";
    } else {
        sortColumn = column;
        sortDirection = "desc";
    }

}

// Orden de la tabla de un recorrido de referencia (ReferenceRouteDetailView.js)
// -- aparte de sortColumn/sortDirection de arriba a propósito: son dos
// tablas independientes (la general de Running y la de un recorrido);
// compartir el mismo estado haría que ordenar una cambiara la otra sin
// que el usuario la haya tocado.
let routeSortColumn = "date";
let routeSortDirection = "desc";

export function getRouteSortColumn() {

    return routeSortColumn;

}

export function getRouteSortDirection() {

    return routeSortDirection;

}

export function toggleRouteSort(column) {

    if (routeSortColumn === column) {
        routeSortDirection = routeSortDirection === "desc" ? "asc" : "desc";
    } else {
        routeSortColumn = column;
        routeSortDirection = "desc";
    }

}

// Id del entreno cuyo menú "···" está abierto en la lista (ver
// RunningHistoryItem en Running.js) -- mismo patrón que sessionMenuOpenId
// en Plan/planStore.js: solo puede haber uno abierto a la vez, aparte de
// `wizard` porque no debe cerrarse solo por interactuar con el resto de la
// pantalla (resetWizard() no debe afectar a esto).
let historyMenuOpenId = null;

export function getHistoryMenuOpenId() {

    return historyMenuOpenId;

}

export function setHistoryMenuOpenId(id) {

    historyMenuOpenId = id;

}

// Plegado/desplegado de las cabeceras de grupo del historial (semana/mes,
// ver runningHistoryGrouping.js) -- solo se guarda aquí el ESTADO QUE EL
// USUARIO HA TOCADO, no el estado por defecto de cada grupo (eso lo decide
// buildHistoryGroups() según sea "esta semana"/"semana pasada"/mes). Un
// grupo sin entrada aquí usa su defaultOpen tal cual. Aparte de `wizard`
// por el mismo motivo que typeFilter/historyMenuOpenId: no debe borrarse
// solo por importar un entreno nuevo o abrir/cerrar otra pantalla. Las
// claves de grupo (this-week/last-week/month-YYYY-M) son estables entre
// renders, así que el plegado sobrevive a cambiar el filtro de tipo --
// intencionado, ver alcance de la mejora.
let historyGroupOverrides = {};

export function getHistoryGroupOverrides() {

    return historyGroupOverrides;

}

export function toggleHistoryGroup(key, currentlyOpen) {

    historyGroupOverrides = { ...historyGroupOverrides, [key]: !currentlyOpen };

}

export function getWizardStep() {

    return wizard.step;

}

export function setWizardStep(step) {

    wizard.step = step;

    // Bug real: cada paso (idle/detail/review/shoe/shoes/historyTable...)
    // es una vista nueva de arriba a abajo -- sin resetear el scroll, abrir
    // el detalle de un entreno estando ya desplazado en el historial hacía
    // que el detalle apareciera ya scrolleado, con su cabecera asomando
    // bajo la barra de estado/notch en vez de arrancar arriba del todo.
    resetScrollToTop();

}

export function getFiles() {

    return wizard.files;

}

export function setFiles(files) {

    wizard.files = files;

}

export function getProgress() {

    return wizard.progress;

}

export function setProgress(progress) {

    wizard.progress = progress;

}

export function getOcrError() {

    return wizard.ocrError;

}

export function setOcrError(message) {

    wizard.ocrError = message;

}

export function getMerged() {

    return wizard.merged;

}

export function setMerged(merged) {

    wizard.merged = merged;

}

export function getCaptures() {

    return wizard.captures;

}

export function setCaptures(captures) {

    wizard.captures = captures;

}

export function getWorkout() {

    return wizard.workout;

}

export function setWorkout(workout) {

    wizard.workout = workout;

}

export function updateWorkoutField(key, value) {

    if (!wizard.workout) return;

    wizard.workout[key] = value;

    if (!wizard.workout.fieldMeta[key]) {
        wizard.workout.fieldMeta[key] = { confidence: null, corrected: false };
    }

    wizard.workout.fieldMeta[key].corrected = true;

}

export function getParseError() {

    return wizard.parseError;

}

export function setParseError(message) {

    wizard.parseError = message;

}

export function getSelectedShoeId() {

    return wizard.selectedShoeId;

}

export function setSelectedShoeId(id) {

    wizard.selectedShoeId = id;

}

export function getAddingNewShoe() {

    return wizard.addingNewShoe;

}

export function setAddingNewShoe(value) {

    wizard.addingNewShoe = value;

}

export function getSaveError() {

    return wizard.saveError;

}

export function setSaveError(message) {

    wizard.saveError = message;

}

export function getSavedWorkout() {

    return wizard.savedWorkout;

}

export function setSavedWorkout(workout) {

    wizard.savedWorkout = workout;

}

export function getDuplicateWarning() {

    return wizard.duplicateWarning;

}

export function setDuplicateWarning(existingWorkout) {

    wizard.duplicateWarning = existingWorkout;

}

// TEMPORAL - MIENTRAS SE MIDE EL RENDIMIENTO DEL OCR, QUITAR LUEGO
const MAX_TIMING_LINES = 40;

export function getTimingLog() {

    return wizard.timingLog;

}

export function appendTiming(line) {

    wizard.timingLog.push(line);

    if (wizard.timingLog.length > MAX_TIMING_LINES) {
        wizard.timingLog.shift();
    }

}

export function getDetailWorkoutId() {

    return wizard.detailWorkoutId;

}

// Cambiar de entreno reinicia tanto el acordeón de avisos como el modo de
// métricas del gráfico -- ninguno de los dos debe arrastrarse del entreno
// anterior al abrir uno distinto.
export function setDetailWorkoutId(id) {

    wizard.detailWorkoutId = id;
    wizard.warningsExpanded = false;
    wizard.chartMetricMode = "both";

}

/*==========================
   AVISOS DE IMPORTACIÓN (detalle del entreno, retoque de cierre)
==========================*/

export function getWarningsExpanded() {

    return wizard.warningsExpanded;

}

export function setWarningsExpanded(value) {

    wizard.warningsExpanded = value;

}

/*==========================
   MODO DE MÉTRICAS DEL GRÁFICO (Ritmo+FC / Ritmo solo / FC solo)
==========================*/

export function getChartMetricMode() {

    return wizard.chartMetricMode ?? "both";

}

export function setChartMetricMode(mode) {

    wizard.chartMetricMode = mode;

}

/*==========================
   RECORRIDOS DE REFERENCIA (V1)
==========================*/

export function getDetailRouteId() {

    return wizard.detailRouteId;

}

export function setDetailRouteId(id) {

    wizard.detailRouteId = id;

}

export function isCreatingRoute() {

    return wizard.creatingRoute;

}

export function startCreatingRoute() {

    wizard.creatingRoute = true;

}

export function cancelCreatingRoute() {

    wizard.creatingRoute = false;

}

export function getRouteMenuOpenId() {

    return wizard.routeMenuOpenId;

}

export function setRouteMenuOpenId(id) {

    wizard.routeMenuOpenId = id;

}

export function getConfirmingSuggestion() {

    return wizard.confirmingSuggestion;

}

export function startConfirmingSuggestion(pair) {

    wizard.confirmingSuggestion = pair;

}

export function cancelConfirmingSuggestion() {

    wizard.confirmingSuggestion = null;

}

// Foto pendiente del formulario de alta/edición de zapatilla — hace
// falta guardarla en el store (no solo en el DOM) porque render()
// reconstruye el HTML en cada rerender y se perdería el preview.
export function getNewShoePhoto() {

    return wizard.newShoePhoto;

}

export function setNewShoePhoto(dataUrl) {

    wizard.newShoePhoto = dataUrl;

}

export function getEditingShoeId() {

    return wizard.editingShoeId;

}

export function setEditingShoeId(id) {

    wizard.editingShoeId = id;
    wizard.newShoePhoto = null;

}

export function resetWizard() {

    wizard = initial();

}
