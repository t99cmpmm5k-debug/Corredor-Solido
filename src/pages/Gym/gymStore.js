import { resetScrollToTop } from "../../utils/scrollReset.js";

const store = {

    step: "select-day",
    activeSessionId: null,
    currentExerciseIndex: 0,

    detailExerciseId: null,
    detailTab: "historial",
    detailExpandedSessionId: null,

    weekSummaryExpanded: false,

    highlightedDayId: null,

    routineMenuOpenId: null,

    editingCell: null,

    exerciseCompletionOverlay: null,

    restCriticalNotified: false,

    // Pantalla principal de Gimnasio: "rutinas" | "composicion" | "nutricion".
    homeTab: "rutinas",

    // Composición corporal: registro en edición (null = formulario de
    // alta) y borrado pendiente de confirmar con un segundo toque.
    bodyCompEditingId: null,
    bodyCompPendingDeleteId: null,
    // Métrica del gráfico de Evolución y si el historial se ve entero
    // ("Ver todo") o solo los últimos registros.
    bodyCompChartMetric: "weightKg",
    bodyCompHistoryExpanded: false,

    // Nutrición: día visto (null = hoy), texto y resultado de la búsqueda
    // en Open Food Facts (se guardan aquí para que un rerender() los
    // conserve, pero el input NO está controlado -- ver initGymEvents.js),
    // producto elegido pendiente de cantidad y borrado por confirmar.
    nutritionDate: null,
    nutritionQuery: "",
    nutritionSearch: { status: "idle", query: "", products: [], reason: null },
    nutritionSelectedProduct: null,
    nutritionPendingDeleteId: null,

    // Nutrición: "dieta" (la de la plantilla CSV) | "registro" (buscador de
    // Open Food Facts). Errores de la última importación de CSV, el
    // selector de fin de semana reabierto con "Cambiar", y el borrado de la
    // dieta por confirmar con un segundo toque.
    nutritionView: "dieta",
    dietImport: { errors: [], fileName: null },
    dietWeekendPickerOpen: false,
    dietDeletePending: false,
    // Secciones plegables de Mi dieta (Notas generales, Gestionar): su
    // estado vive aquí para que marcar una comida (rerender) no las cierre.
    dietRulesOpen: false,
    dietManageOpen: false

};

export function getStep() {

    return store.step;

}

export function setStep(step) {

    store.step = step;

    // Bug real (ver runningStore.js/setWizardStep): cada paso
    // (day-select/session/exercise-detail) es una vista nueva de arriba a
    // abajo.
    resetScrollToTop();

}

export function getActiveSessionId() {

    return store.activeSessionId;

}

export function setActiveSessionId(id) {

    store.activeSessionId = id;

}

export function getCurrentExerciseIndex() {

    return store.currentExerciseIndex;

}

export function setCurrentExerciseIndex(index) {

    store.currentExerciseIndex = index;

}

/*==========================
   DETALLE DE EJERCICIO (Fase 4)
==========================*/

export function getDetailExerciseId() {

    return store.detailExerciseId;

}

export function setDetailExerciseId(id) {

    store.detailExerciseId = id;

}

export function getDetailTab() {

    return store.detailTab;

}

export function setDetailTab(tab) {

    store.detailTab = tab;

}

export function getDetailExpandedSessionId() {

    return store.detailExpandedSessionId;

}

export function setDetailExpandedSessionId(sessionId) {

    store.detailExpandedSessionId = sessionId;

}

// Solo se llama al cerrar la pantalla de detalle — pestaña y fila
// desplegada no deben sobrevivir a la siguiente vez que se abra, ni
// siquiera para el mismo ejercicio.
export function resetExerciseDetail() {

    store.detailExerciseId = null;
    store.detailTab = "historial";
    store.detailExpandedSessionId = null;

}

/*==========================
   RESUMEN SEMANAL (pantalla principal)
==========================*/

export function getWeekSummaryExpanded() {

    return store.weekSummaryExpanded;

}

export function toggleWeekSummaryExpanded() {

    store.weekSummaryExpanded = !store.weekSummaryExpanded;

}

/*==========================
   DÍA RESALTADO (llegada desde Plan, ver initGymEvents.js/openGymDay)
==========================*/

export function getHighlightedDayId() {

    return store.highlightedDayId;

}

export function setHighlightedDayId(id) {

    store.highlightedDayId = id;

}

/*==========================
   MENÚ "···" DE UNA RUTINA GUARDADA (Editar/Eliminar)
   Mismo patrón que raceCardMenuOpenId en carrerasStore.js: solo puede
   haber uno abierto a la vez.
==========================*/

export function getRoutineMenuOpenId() {

    return store.routineMenuOpenId;

}

export function setRoutineMenuOpenId(id) {

    store.routineMenuOpenId = id;

}

/*==========================
   CELDA EN EDICIÓN (tabla de series, Fase 2)
   Solo una celda (peso o reps de una serie concreta) puede estar en modo
   "stepper" a la vez -- tocar otra celda simplemente cambia cuál, no hace
   falta un listener de "cerrar al tocar fuera" como en los menús "···".
==========================*/

export function getEditingCell() {

    return store.editingCell;

}

export function setEditingCell(cell) {

    store.editingCell = cell;

}

export function clearEditingCell() {

    store.editingCell = null;

}

export function isEditingCell(exerciseId, setIndex, field) {

    const cell = store.editingCell;
    return !!cell && cell.exerciseId === exerciseId && cell.setIndex === setIndex && cell.field === field;

}

/*==========================
   TARJETA "EJERCICIO COMPLETADO" (Fase 2)
==========================*/

export function getExerciseCompletionOverlay() {

    return store.exerciseCompletionOverlay;

}

export function setExerciseCompletionOverlay(data) {

    store.exerciseCompletionOverlay = data;

}

export function clearExerciseCompletionOverlay() {

    store.exerciseCompletionOverlay = null;

}

/*==========================
   TEMPORIZADOR DE DESCANSO
   (90s fijos, autoarranca al marcar una serie como hecha — decisión de
   producto confirmada con el usuario, sin dato real de "tiempo ideal" de
   descanso por ejercicio en ningún sitio del modelo)
==========================*/

const REST_DEFAULT_SEC = 90;
export const REST_STEP_SEC = 15;

let restDurationSec = REST_DEFAULT_SEC;
let restEndAt = null; // timestamp ms; null = sin descanso en marcha

export function getRestDurationSec() {

    return restDurationSec;

}

export function getRestRemainingSec() {

    if (restEndAt == null) return 0;

    return Math.max(0, Math.round((restEndAt - Date.now()) / 1000));

}

// restEndAt != null basta como "hay un descanso en marcha" — no se exige
// además remaining > 0, porque initGymEvents.js es quien limpia restEndAt
// al llegar a cero (ver tickRestTimerDisplay). Si aquí también exigiéramos
// remaining > 0, el propio tick nunca entraría a limpiarlo en el segundo
// exacto en que llega a cero, y el temporizador se quedaría clavado en
// "00:00" para siempre.
export function isRestRunning() {

    return restEndAt != null;

}

export function startRestTimer() {

    restDurationSec = REST_DEFAULT_SEC;
    restEndAt = Date.now() + restDurationSec * 1000;
    store.restCriticalNotified = false;

}

export function stopRestTimer() {

    restEndAt = null;
    store.restCriticalNotified = false;

}

export function adjustRestTimer(deltaSec) {

    if (restEndAt == null) return;

    restEndAt += deltaSec * 1000;
    restDurationSec = Math.max(REST_STEP_SEC, restDurationSec + deltaSec);

}

// Evita vibrar en cada segundo mientras quedan <=10s -- una sola vez por
// entrada en la zona crítica (ver tickRestTimerDisplay en initGymEvents.js).
// Si +15s saca el descanso de la zona crítica y luego vuelve a entrar, debe
// poder volver a avisar -- por eso se resetea también al salir (isRestCritical
// en initGymEvents.js llama a setRestCriticalNotified(false) al superar
// el umbral).
export function isRestCriticalNotified() {

    return store.restCriticalNotified;

}

export function setRestCriticalNotified(value) {

    store.restCriticalNotified = value;

}

export function getHomeTab() {

    return store.homeTab;

}

export function setHomeTab(tab) {

    store.homeTab = tab;
    store.bodyCompEditingId = null;
    store.bodyCompPendingDeleteId = null;
    store.nutritionPendingDeleteId = null;

}

export function getBodyCompEditingId() {

    return store.bodyCompEditingId;

}

export function setBodyCompEditingId(id) {

    store.bodyCompEditingId = id;
    store.bodyCompPendingDeleteId = null;

}

export function getBodyCompPendingDeleteId() {

    return store.bodyCompPendingDeleteId;

}

export function setBodyCompPendingDeleteId(id) {

    store.bodyCompPendingDeleteId = id;

}

export function getNutritionDate() {

    return store.nutritionDate;

}

export function setNutritionDate(date) {

    store.nutritionDate = date;
    store.nutritionPendingDeleteId = null;

}

export function getNutritionQuery() {

    return store.nutritionQuery;

}

export function setNutritionQuery(query) {

    store.nutritionQuery = query;

}

export function getNutritionSearch() {

    return store.nutritionSearch;

}

export function setNutritionSearch(search) {

    store.nutritionSearch = search;

}

export function getNutritionSelectedProduct() {

    return store.nutritionSelectedProduct;

}

export function setNutritionSelectedProduct(product) {

    store.nutritionSelectedProduct = product;
    store.nutritionPendingDeleteId = null;

}

export function getNutritionPendingDeleteId() {

    return store.nutritionPendingDeleteId;

}

export function setNutritionPendingDeleteId(id) {

    store.nutritionPendingDeleteId = id;

}

export function getNutritionView() {

    return store.nutritionView;

}

export function setNutritionView(view) {

    store.nutritionView = view;
    store.dietWeekendPickerOpen = false;
    store.dietDeletePending = false;

}

export function getDietImport() {

    return store.dietImport;

}

export function setDietImport(state) {

    store.dietImport = { errors: [], fileName: null, ...state };

}

export function isDietWeekendPickerOpen() {

    return store.dietWeekendPickerOpen;

}

export function setDietWeekendPickerOpen(value) {

    store.dietWeekendPickerOpen = value;

}

export function isDietDeletePending() {

    return store.dietDeletePending;

}

export function setDietDeletePending(value) {

    store.dietDeletePending = value;

}

export function getBodyCompChartMetric() {

    return store.bodyCompChartMetric;

}

export function setBodyCompChartMetric(metric) {

    store.bodyCompChartMetric = metric;

}

export function isBodyCompHistoryExpanded() {

    return store.bodyCompHistoryExpanded;

}

export function setBodyCompHistoryExpanded(value) {

    store.bodyCompHistoryExpanded = value;

}

export function isDietSectionOpen(section) {

    return section === "rules" ? store.dietRulesOpen : store.dietManageOpen;

}

export function setDietSectionOpen(section, open) {

    if (section === "rules") store.dietRulesOpen = open;
    else store.dietManageOpen = open;

}
