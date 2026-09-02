import { setSelectedWorkout, getViewedWeekStart, setViewedWeekStart, getMovingSessionId, setMovingSessionId, getDuplicatingSessionId, setDuplicatingSessionId, getMovingGymDayId, setMovingGymDayId, getSessionMenuOpenId, setSessionMenuOpenId, getExpandedSessionId, setExpandedSessionId, getPlanViewMode, setPlanViewMode, shiftViewedMonth, getCreatingSessionDate, getEditingSessionId, startCreateSession, startEditSession, cancelCreateSession, getNewSessionType, setNewSessionType, getNewSessionNotes, setNewSessionNotes, isAddSheetOpen, setAddSheetOpen, isPlanOptionsMenuOpen, setPlanOptionsMenuOpen } from "./planStore";
import { rerender, navigate } from "../../core/router";

import { importPlan } from "../../importers/plan/index.js";
import { importPlannedSessions, addPlannedSession, updatePlannedSession, duplicatePlannedSession, getWeekSessions, getSessionById, getSessionsForDate, getPlannedSessions, movePlannedSession, deletePlannedSession, deletePlannedSessions, deletePlannedSessionsByBatch } from "../../data/workoutStore.js";
import { addDays, formatISODate, parseISODate, formatDayMonth, getISOWeekNumber } from "../../utils/date.js";
import { PLAN_SESSION_REVIEW_FIELDS, parseSessionFieldValue } from "./components/PlanImportReviewStep.js";
import { Running } from "../Running/Running.js";
import { openDetail as openRunningDetail } from "../Running/initRunningEvents.js";
import { Gym } from "../Gym/Gym.js";
import { openDaySession, openRoutineBuilder } from "../Gym/initGymEvents.js";
import { getRoutineById, deleteRoutine, moveRoutineDayToWeekday } from "../../data/gymRoutineStore.js";
import { WEEKDAY_OPTIONS } from "../Gym/gymSchedule.js";
import { buildGymOnlyDay } from "./components/PlanTimeline.js";

import {
    getImportStep,
    setImportStep,
    resetPlanImport,
    getParsedPlan,
    setParsedPlan,
    setImportParseError,
    setImportSaveError,
    setImportSavedCount,
    setImportSavedBatchId,
    updateImportSessionField
} from "./planImportStore.js";

const PLAN_IMPORT_HISTORY_STATE = { planImport: true };

function openPlanImport() {

    resetPlanImport();
    setImportStep("upload");

    // Sin esto, el gesto de atrás del móvil no tiene una entrada de
    // historial propia que consumir y se sale directo de la app — mismo
    // motivo que openDetail()/openShoes() en initRunningEvents.js.
    history.pushState(PLAN_IMPORT_HISTORY_STATE, "");

    rerender();

}

function closePlanImport() {

    if (history.state?.planImport) {
        history.back();
        return;
    }

    setImportStep("closed");
    rerender();

}

const PLAN_ADD_SHEET_HISTORY_STATE = { planAddSheet: true };

// Bottom sheet del botón "+" (fase 5 del pulido de Plan) — mismo patrón
// de historial que openPlanImport()/closePlanImport() para que el gesto
// de atrás lo cierre en vez de salir de la app.
function openAddSheet() {

    history.pushState(PLAN_ADD_SHEET_HISTORY_STATE, "");
    setAddSheetOpen(true);

    rerender();

}

function closeAddSheet() {

    if (history.state?.planAddSheet) {
        history.back();
        return;
    }

    setAddSheetOpen(false);
    rerender();

}

// Elegir una opción del sheet no debe dejar su entrada de historial
// colgada por debajo de la del siguiente flujo (importar SÍ apila la
// suya propia, ver openPlanImport) — se neutraliza aquí en vez de
// pasar por closeAddSheet()/history.back(), que dispararía un popstate
// asíncrono y complicaría el orden con el pushState que viene justo
// después.
function closeAddSheetSilently() {

    setAddSheetOpen(false);

    if (history.state?.planAddSheet) {
        history.replaceState(null, "");
    }

}

// Mismo flujo EXACTO que tocar un día "Descanso" del timeline/calendario
// (ver startCreateSession() en planStore.js y selectCalendarDay() más
// abajo) — cero lógica nueva, solo un punto de entrada distinto.
function addSheetCreateWorkout() {

    closeAddSheetSilently();
    startCreateSession(formatISODate(new Date()));

    rerender();

}

// Variante rápida del mismo formulario -- mismo startCreateSession(), solo
// cambia el tipo de partida a "recovery" (Recuperación, el tipo real más
// cercano a "descanso" del catálogo de WORKOUT_TYPES) en vez del genérico
// de siempre.
function addSheetAddRest() {

    closeAddSheetSilently();
    startCreateSession(formatISODate(new Date()));
    setNewSessionType("recovery");

    rerender();

}

// Registrado una sola vez a nivel de módulo (no dentro de initPlanEvents,
// que se vuelve a llamar en cada render) — mismo motivo que el listener
// equivalente de initRunningEvents.js.
window.addEventListener("popstate", () => {

    if (getImportStep() !== "closed") {
        setImportStep("closed");
        rerender();
        return;
    }

    if (isAddSheetOpen()) {
        setAddSheetOpen(false);
        rerender();
    }

});

// Cierra el menú "···" de PlanWorkoutCard al tocar fuera de él (patrón
// estándar de menú desplegable, fase 4 del pulido de Plan) -- registrado
// una sola vez a nivel de módulo, igual que el popstate de arriba, en vez
// de en initPlanEvents() (que se vuelve a llamar en cada render y
// apilaría un listener nuevo cada vez sin desengancharse). Se limita a
// comprobar el estado en cada click del documento entero en vez de
// añadir/quitar el listener según haya o no un menú abierto.
document.addEventListener("click", event => {

    if (!getSessionMenuOpenId()) return;
    if (event.target.closest(".workout-menu")) return;

    setSessionMenuOpenId(null);
    rerender();

});

// Mismo patrón que el listener de arriba, pero para el menú "···" de la
// cabecera de Plan (borrar semana/plan completo, ver PlanHeader.js) --
// aparte porque es un booleano simple (isPlanOptionsMenuOpen), no un id
// como sessionMenuOpenId.
document.addEventListener("click", event => {

    if (!isPlanOptionsMenuOpen()) return;
    if (event.target.closest(".plan-options-menu")) return;

    setPlanOptionsMenuOpen(false);
    rerender();

});

// Igual que looksLikeTcx() en initRunningEvents.js: se decide por el
// contenido real, no por la extensión del archivo — el input no restringe
// por accept a propósito.
function looksLikeJson(text) {
    return text.trim().startsWith("{");
}

const PDF_SIGNATURE = "%PDF-";

// Un PDF es binario — leerlo entero con file.text() como JSON/CSV
// produciría texto corrupto. Se lee primero solo la firma (5 bytes,
// barato) para decidir la rama antes de tocar el resto del archivo.
async function handlePlanFileSelected(file) {

    setImportParseError(null);

    let signature;

    try {
        signature = await file.slice(0, PDF_SIGNATURE.length).text();
    } catch {
        setImportParseError(`No se pudo leer "${file.name}".`);
        rerender();
        return;
    }

    if (signature === PDF_SIGNATURE) {
        return handlePdfFileSelected(file);
    }

    let text;

    try {
        text = await file.text();
    } catch {
        setImportParseError(`No se pudo leer "${file.name}".`);
        rerender();
        return;
    }

    try {

        const plan = importPlan(looksLikeJson(text) ? "json" : "csv", text);

        setParsedPlan(plan);
        setImportStep("review");

    } catch (err) {

        setImportParseError(err.message);

    }

    rerender();

}

// pdfText.js carga pdfjs-dist, que pesa — solo se importa cuando de
// verdad se elige un PDF, para no engordar el chunk principal.
async function handlePdfFileSelected(file) {

    let extractPdfText;
    try {
        ({ extractPdfText } = await import("../../importers/plan/pdfText.js"));
    } catch {
        setImportParseError("No se pudo cargar el lector de PDF — comprueba la conexión e inténtalo de nuevo.");
        rerender();
        return;
    }

    try {

        const text = await extractPdfText(file);
        const plan = importPlan("pdf", text);

        setParsedPlan(plan);
        setImportStep("review");

    } catch (err) {

        setImportParseError(err.message);

    }

    rerender();

}

// Un <textarea> de una sola fila no muestra el texto completo cuando es
// largo (recorta visualmente, bug real con la descripción concatenada de
// un PDF) — se ajusta la altura a mano al contenido real en vez de fiarlo
// a una propiedad CSS (field-sizing:content) sin soporte fiable en Safari.
function autoResizeTextarea(textarea) {

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;

}

// Salta de página (router global) y, ya en Running, abre directamente su
// vista de detalle (estado propio de runningStore.js, ajeno al router) —
// dos renders seguidos, mismo patrón que ya encadena el resto de la app.
function viewSessionWorkout(workoutId) {

    navigate(Running);
    openRunningDetail(workoutId);

}

// Selecciona el día "solo gimnasio" tocado en el timeline -- ya NO navega
// a Gimnasio (eso era lo que se pedía cambiar): guarda el objeto sintético
// de buildGymOnlyDay() (PlanTimeline.js) en el mismo selectedWorkout que ya
// usa running, y PlanGymDayCard.js pinta su detalle inline, exactamente
// igual que ya ocurre al tocar un día con running real. Solo se usa cuando
// el día tocado NO tiene running real (ver ".timeline-day" más abajo: con
// running y gimnasio a la vez, running manda y esto ni se llama).
function selectGymOnlyDay(date) {

    const gymDay = buildGymOnlyDay(date);
    if (!gymDay) return;

    setSelectedWorkout(gymDay);
    rerender();

}

// Pestaña de PlanDaySelector.js tocada -- itemId es o bien el id de una
// sesión real (getSessionById lo resuelve) o el id sintético
// `gym-${date}` del día "solo gimnasio" (ver attachGymInfo() en
// PlanTimeline.js), que no vive en workoutStore.js y hay que reconstruir
// con buildGymOnlyDay() a partir de la fecha codificada en el propio id.
// Mismo "qué queda mostrado después" que tocar la columna del timeline:
// pasa a ser selectedWorkout tal cual.
const GYM_ONLY_ID_PREFIX = "gym-";

function selectDayItem(itemId) {

    setSessionMenuOpenId(null);

    const session = getSessionById(itemId);

    if (session) {
        setSelectedWorkout(session);
        rerender();
        return;
    }

    if (!itemId.startsWith(GYM_ONLY_ID_PREFIX)) return;

    const date = itemId.slice(GYM_ONLY_ID_PREFIX.length);
    const gymDay = buildGymOnlyDay(date);
    if (!gymDay) return;

    setSelectedWorkout(gymDay);
    rerender();

}

// "Empezar rutina"/"Ver resumen" de PlanGymDayCard.js -- ahí sí hace falta
// saltar a Gimnasio de verdad (arrancar/retomar una sesión es la vista
// interactiva completa de Gimnasio, no algo que tenga sentido duplicar
// inline en Plan). openDaySession() ya retoma la sesión de hoy si existe
// (terminada o no) -- mismo botón para las dos etiquetas, igual que ya
// hace GymTodayCard.js en Inicio (ver initSessionCardEvents.js).
function startGymDayFromPlan(dayId) {

    navigate(Gym);
    openDaySession(dayId);

}

// "Editar rutina" del menú "···" de PlanGymDayCard.js -- mismo flujo que
// editar desde la propia lista de Gimnasio (openRoutineBuilder(), ya
// exportada de initGymEvents.js), solo que hace falta navegar primero
// porque el constructor de rutinas solo se pinta dentro de Gym().
function editGymRoutineFromPlan(routineId) {

    const routine = getRoutineById(routineId);
    if (!routine) return;

    setSessionMenuOpenId(null);
    navigate(Gym);
    openRoutineBuilder(routine);

}

// "Eliminar rutina" del menú "···" de PlanGymDayCard.js -- mismo dato real
// (deleteRoutine(), ya existente en gymRoutineStore.js) y mismo texto de
// confirmación que deleteRoutineWithConfirm() en initGymEvents.js, pero
// sin navegar (borrar no necesita salir de Plan) y limpiando
// selectedWorkout después -- mismo criterio que deleteSession() más abajo:
// no hay otra forma de llegar a este botón que viendo ya esta rutina.
function deleteGymRoutineFromPlan(routineId) {

    setSessionMenuOpenId(null);

    if (!window.confirm("¿Borrar esta rutina? No se puede deshacer.")) return;

    deleteRoutine(routineId);
    setSelectedWorkout(null);

    rerender();

}

// Cambiar de semana también reasigna la sesión seleccionada — la que
// hubiera (de la semana anterior) puede no existir ya en la nueva, y
// "hoy" solo tiene sentido dentro de la semana actual.
function changeViewedWeek(deltaWeeks) {

    const newWeekStart = addDays(getViewedWeekStart(), deltaWeeks * 7);
    setViewedWeekStart(newWeekStart);

    const sessions = getWeekSessions(newWeekStart);
    setSelectedWorkout(sessions[0] ?? null);

    // Un formulario de creación abierto pertenece a la fecha que se tocó
    // antes de deslizar -- esa fecha deja de estar a la vista, así que el
    // formulario ya no tiene sentido colgado ahí (mismo motivo que
    // reasignar selectedWorkout justo encima).
    cancelCreateSession();

    rerender();

}

// Alterna semanal/mensual sin perder la posición de cada una (viewedWeekStart
// y viewedMonth son estados independientes, ver planStore.js). Un
// movimiento en curso (running o gimnasio) no tiene UI en vista mensual
// (PlanMoveDayPicker/PlanGymMoveDayPicker son solo de la semanal) —
// cambiar de vista en medio lo cancela, en vez de dejarlo colgado sin
// ningún control para salir de él.
function togglePlanView() {

    setPlanViewMode(getPlanViewMode() === "week" ? "month" : "week");

    if (getMovingSessionId()) setMovingSessionId(null);
    if (getMovingGymDayId()) setMovingGymDayId(null);
    if (getCreatingSessionDate()) cancelCreateSession();

    rerender();

}

function changeViewedMonth(deltaMonths) {

    shiftViewedMonth(deltaMonths);
    rerender();

}

// Igual que tocar un día en el timeline semanal (ver más abajo,
// ".timeline-day"): selecciona la sesión y la deja lista para
// PlanWorkoutCard. Con varias sesiones el mismo día (running + gimnasio)
// se queda con la primera por orden de slot — mismo criterio que
// getWeekSessions() al ordenar la semana. Un día sin ninguna sesión abre
// el mismo formulario de creación manual que el timeline semanal (ver
// startCreateSession() / ".timeline-day" más abajo) — mismo punto de
// entrada, mismo destino de guardado, solo cambia desde dónde se tocó.
function selectCalendarDay(date) {

    setSessionMenuOpenId(null);

    const sessions = getSessionsForDate(date).sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));
    const first = sessions[0];

    if (first) {
        setSelectedWorkout(getSessionById(first.id));
        rerender();
        return;
    }

    startCreateSession(date);
    rerender();

}

// Guarda la sesión manual y deja el formulario cerrado, con la sesión
// recién creada/editada como seleccionada (mismo "qué se ve después" que
// tocar cualquier otro día ya ocupado) -- así el usuario ve de inmediato
// que se guardó, en vez de volver a un "Descanso" o a lo que hubiera
// antes. Con getEditingSessionId() actualiza la sesión real existente
// (updatePlannedSession()) en vez de crear una nueva -- mismo formulario,
// mismos dos campos (tipo/notas), ver startEditSession() en
// planStore.js/PlanCreateSessionPanel.js.
function saveManualSession() {

    const date = getCreatingSessionDate();
    if (!date) return;

    const editingId = getEditingSessionId();

    const session = editingId
        ? updatePlannedSession(editingId, {
            type: getNewSessionType(),
            description: getNewSessionNotes().trim() || null
        })
        : addPlannedSession({
            date,
            type: getNewSessionType(),
            description: getNewSessionNotes().trim() || null
        });

    cancelCreateSession();
    setSelectedWorkout(session ? getSessionById(session.id) : null);

    rerender();

}

function editSession(sessionId) {

    const session = getSessionById(sessionId);
    if (!session) return;

    setSessionMenuOpenId(null);
    startEditSession(session);

    rerender();

}

function startDuplicateSession(sessionId) {

    setSessionMenuOpenId(null);
    setDuplicatingSessionId(sessionId);

    rerender();

}

function cancelDuplicateSession() {

    setDuplicatingSessionId(null);
    rerender();

}

// Igual que moveSessionTo() pero clonando en vez de reasignar la fecha
// -- la sesión ORIGINAL sigue existiendo en su día de siempre. La recién
// duplicada pasa a ser la seleccionada, mismo criterio que crear/mover.
function duplicateSessionTo(date) {

    const sessionId = getDuplicatingSessionId();
    if (!sessionId) return;

    const duplicated = duplicatePlannedSession(sessionId, date);

    setDuplicatingSessionId(null);
    setSelectedWorkout(duplicated ? getSessionById(duplicated.id) : null);

    rerender();

}

function toggleSessionMenu(sessionId) {

    setSessionMenuOpenId(getSessionMenuOpenId() === sessionId ? null : sessionId);
    rerender();

}

function toggleDescriptionExpanded(sessionId) {

    setExpandedSessionId(getExpandedSessionId() === sessionId ? null : sessionId);
    rerender();

}

function startMoveSession(sessionId) {

    setSessionMenuOpenId(null);
    setMovingSessionId(sessionId);
    rerender();

}

function cancelMoveSession() {

    setMovingSessionId(null);
    rerender();

}

// Confirma el movimiento nada más tocar el día destino — sin paso de
// confirmación aparte, mismo criterio que tocar un día en el timeline
// normal ya cambia la sesión mostrada sin preguntar. La semana en la
// que se ejecuta ya es la que el usuario ha elegido deslizando, así
// que no hace falta tocar viewedWeekStart aquí.
function moveSessionTo(date) {

    const sessionId = getMovingSessionId();
    if (!sessionId) return;

    const moved = movePlannedSession(sessionId, date);

    setMovingSessionId(null);
    setSelectedWorkout(moved ? getSessionById(moved.id) : null);

    rerender();

}

// "Mover sesión" de un día de gimnasio (ver PlanGymDayCard.js) -- mismo
// patrón que startMoveSession()/cancelMoveSession(), pero con su propio
// id de store (movingGymDayId, ver planStore.js): mover running y mover
// gimnasio son dos flujos independientes que nunca conviven a la vez.
function startMoveGymDay(dayId) {

    setSessionMenuOpenId(null);
    setMovingGymDayId(dayId);
    rerender();

}

function cancelMoveGymDay() {

    setMovingGymDayId(null);
    rerender();

}

// A diferencia de moveSessionTo() (reasigna una FECHA concreta dentro de
// la semana que se esté viendo), esto reasigna el weekday RECURRENTE del
// día de gimnasio -- afecta a todas las semanas futuras, no solo a la
// actual (ver moveRoutineDayToWeekday() en gymRoutineStore.js). Sin paso
// de confirmación aparte, mismo criterio que moveSessionTo(). Reselecciona
// el mismo día en su nueva columna DENTRO de la semana que se esté viendo
// (WEEKDAY_OPTIONS va lunes-domingo, igual que las 7 columnas del
// timeline, así que su índice ya es el offset real desde
// getViewedWeekStart()) -- mismo "aterrizaje" que moveSessionTo() deja
// para running (la tarjeta de detalle sigue mostrando el día movido, ya
// en su sitio nuevo, en vez de quedarse sin nada seleccionado).
function moveGymDayTo(weekday) {

    const dayId = getMovingGymDayId();
    if (!dayId) return;

    moveRoutineDayToWeekday(dayId, weekday);
    setMovingGymDayId(null);

    const offset = WEEKDAY_OPTIONS.findIndex(w => w.id === weekday);
    const newDate = offset === -1 ? null : addDays(getViewedWeekStart(), offset);

    setSelectedWorkout(newDate ? buildGymOnlyDay(newDate) : null);

    rerender();

}

const WEEK_SWIPE_THRESHOLD_PX = 50;
const HORIZONTAL_INTENT_PX = 10;

// Deslizar la tira de días cambia de semana — deslizar hacia la
// izquierda avanza (semana siguiente), hacia la derecha retrocede,
// misma convención que un carrusel/calendario. .plan-timeline lleva
// touch-action:pan-y (PlanTimeline.css) para que el navegador siga
// gestionando el scroll vertical de la página tal cual, sin que este
// listener tenga que pelear por él — solo se intercepta (preventDefault)
// el gesto una vez confirmado que es predominantemente horizontal.
function initTimelineSwipe() {

    // Escopado a .plan-page: PlanTimeline también se reutiliza dentro del
    // selector de día de Home (SessionCard.js) para elegir la sesión del
    // día — ahí no debe cambiar de semana al deslizar, solo en Plan.
    const timeline = document.querySelector(".plan-page .plan-timeline");
    if (!timeline) return;

    let startX = null;
    let startY = null;
    let isHorizontal = false;

    timeline.addEventListener("touchstart", event => {

        const touch = event.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        isHorizontal = false;

    }, { passive: true });

    timeline.addEventListener("touchmove", event => {

        if (startX == null) return;

        const touch = event.touches[0];
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;

        if (!isHorizontal && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > HORIZONTAL_INTENT_PX) {
            isHorizontal = true;
        }

        if (isHorizontal) {
            event.preventDefault();
        }

    }, { passive: false });

    timeline.addEventListener("touchend", event => {

        if (startX == null) return;

        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - startX;

        if (isHorizontal && Math.abs(deltaX) > WEEK_SWIPE_THRESHOLD_PX) {
            changeViewedWeek(deltaX < 0 ? 1 : -1);
        }

        startX = null;
        startY = null;
        isHorizontal = false;

    });

}

function performPlanImport() {

    const plan = getParsedPlan();
    if (!plan) return;

    // Una sesión recurrente (weekday, p. ej. una tabla de gimnasio semanal
    // de un PDF) no tiene fecha A PROPÓSITO — no cuenta como "sin fecha"
    // para este guard, solo las que de verdad no se pudieron determinar.
    const missingDate = plan.sessions.some(s => !s.date && !s.weekday);

    if (missingDate) {
        setImportSaveError("Hay sesiones sin fecha — rellénala en todas antes de confirmar.");
        rerender();
        return;
    }

    importPlannedSessions(plan.sessions).then(({ written, batchId }) => {

        setImportSavedCount(written);
        setImportSavedBatchId(batchId);
        setImportSaveError(null);
        setImportStep("success");
        rerender();

    });

}

// La tarjeta de detalle solo muestra la sesión seleccionada — al
// borrarla, esa selección queda apuntando a un id que ya no existe.
// Se limpia siempre (no solo si coincide) porque en la práctica
// siempre coincide: no hay otra forma de llegar a este botón que
// viendo ya esa misma sesión. Plan() recalcula un valor por defecto
// razonable (hoy, o la primera de la semana) en el siguiente render.
function deleteSession(id) {

    setSessionMenuOpenId(null);

    if (!window.confirm("¿Borrar esta sesión del plan? No se puede deshacer.")) {
        rerender();
        return;
    }

    deletePlannedSession(id);
    setSelectedWorkout(null);

    rerender();

}

function togglePlanOptionsMenu() {

    setPlanOptionsMenuOpen(!isPlanOptionsMenuOpen());
    rerender();

}

// Borra de golpe TODAS las sesiones planificadas de la semana que se esté
// viendo ahora mismo (getViewedWeekStart(), no la semana "actual" real) --
// hasta ahora solo se podía borrar sesión por sesión desde el menú "···"
// de cada tarjeta. Mismo criterio de confirmación que deleteSession(), con
// el rango de fechas real en el texto para que quede claro QUÉ semana se
// va a borrar antes de confirmar (fácil confundirse si se navegó a otra
// semana). No toca gimnasio -- vive en un store aparte (gymRoutineStore.js,
// recurrente por weekday, no por semana concreta), fuera del alcance de
// "borrar esta semana del plan".
function deletePlanWeek() {

    setPlanOptionsMenuOpen(false);

    const weekStart = getViewedWeekStart();
    const sessions = getWeekSessions(weekStart);

    if (!sessions.length) { rerender(); return; }

    const weekNumber = getISOWeekNumber(parseISODate(weekStart));
    const dateRange = `${formatDayMonth(weekStart)} · ${formatDayMonth(addDays(weekStart, 6))}`;

    const sessionWord = sessions.length === 1 ? "la 1 sesión" : `las ${sessions.length} sesiones`;

    if (!window.confirm(`¿Borrar toda la semana ${weekNumber} (${dateRange})? Se borrará ${sessionWord} de esa semana. No se puede deshacer.`)) {
        rerender();
        return;
    }

    deletePlannedSessions(sessions.map(s => s.id));
    setSelectedWorkout(null);

    rerender();

}

// Borra TODO el plan importado (todas las plannedSessions de la app,
// cualquier semana) de golpe -- confirmación más explícita que
// deletePlanWeek() (menciona el total real, no solo "esta semana") porque
// el alcance es mucho mayor y no hay forma de deshacerlo salvo
// reimportando. Mismo criterio "no toca gimnasio" que deletePlanWeek().
function deletePlanAll() {

    setPlanOptionsMenuOpen(false);

    const allSessions = getPlannedSessions();
    if (!allSessions.length) { rerender(); return; }

    const sessionWord = allSessions.length === 1 ? "la 1 sesión" : `las ${allSessions.length} sesiones`;

    if (!window.confirm(`¿Borrar TODO el plan? Se borrará ${sessionWord} de todas las semanas. No se puede deshacer.`)) {
        rerender();
        return;
    }

    deletePlannedSessions(allSessions.map(s => s.id));
    setSelectedWorkout(null);

    rerender();

}

// Deshace de golpe la importación que se acaba de guardar — solo
// disponible desde la propia pantalla de éxito del wizard, con el
// batchId que importPlannedSessions() acaba de devolver (ver
// performPlanImport). Limpia la selección por la misma razón que
// deleteSession(): tras cerrar el wizard, cualquier selección previa
// pudo quedar obsoleta.
function undoPlanImport(batchId) {

    if (!batchId) return;

    if (!window.confirm("¿Deshacer esta importación? Se borrarán todas las sesiones que se acaban de guardar. No se puede deshacer.")) return;

    deletePlannedSessionsByBatch(batchId);
    setSelectedWorkout(null);

    closePlanImport();

}

export function initPlanEvents() {

    // Escopado a .plan-page: PlanTimeline también se reutiliza dentro del
    // selector de día de Inicio (SessionCard.js, ver
    // initSessionCardEvents.js para su propio listener) -- sin este
    // escopado, tocar un día en Inicio disparaba EXACTAMENTE esta misma
    // lógica de Plan (seleccionar/gimnasio/crear sesión), incluyendo
    // guardar en selectedWorkout (el estado de Plan, no el de Inicio) y
    // colándose como "sesión de hoy" en MasterCard.js al volver a Inicio
    // -- bug real, corregido 2026-08-26. Mismo criterio que
    // initTimelineSwipe() unas líneas más abajo, que ya escopaba por el
    // mismo motivo.
    document.querySelectorAll(".plan-page .timeline-day").forEach(day => {

        day.addEventListener("click", () => {

            setSessionMenuOpenId(null);

            const workout = getSessionById(day.dataset.sessionId);

            if (workout) {
                setSelectedWorkout(workout);
                rerender();
                return;
            }

            // Sin sesión real de running: si el hueco es en realidad un día
            // de gimnasio (ver attachGymInfo() en PlanTimeline.js), se
            // selecciona inline -- ya NO salta a Gimnasio, ver
            // selectGymOnlyDay() más arriba.
            if (day.dataset.gymDayId) {
                selectGymOnlyDay(day.dataset.date);
                return;
            }

            // Un Descanso de verdad (sin sesión, sin gimnasio) abre el
            // formulario de creación manual en vez de no hacer nada.
            startCreateSession(day.dataset.date);
            rerender();

        });

    });

    initTimelineSwipe();

    document.querySelectorAll('[data-action="select-day-item"]').forEach(button => {

        button.addEventListener("click", () => {
            selectDayItem(button.dataset.itemId);
        });

    });

    document.querySelectorAll('[data-action="toggle-plan-view"]').forEach(button => {

        button.addEventListener("click", togglePlanView);

    });

    /*==========================
        MENÚ "···" DE LA CABECERA (borrar semana/plan completo, PlanHeader.js)
    ==========================*/

    document.querySelectorAll('[data-action="toggle-plan-options-menu"]').forEach(button => {

        button.addEventListener("click", event => {
            event.stopPropagation();
            togglePlanOptionsMenu();
        });

    });

    document.querySelectorAll('[data-action="delete-plan-week"]').forEach(button => {

        button.addEventListener("click", deletePlanWeek);

    });

    document.querySelectorAll('[data-action="delete-plan-all"]').forEach(button => {

        button.addEventListener("click", deletePlanAll);

    });

    document.querySelectorAll('[data-action="calendar-prev-month"]').forEach(button => {

        button.addEventListener("click", () => changeViewedMonth(-1));

    });

    document.querySelectorAll('[data-action="calendar-next-month"]').forEach(button => {

        button.addEventListener("click", () => changeViewedMonth(1));

    });

    document.querySelectorAll('[data-action="select-plan-calendar-day"]').forEach(day => {

        day.addEventListener("click", () => {
            selectCalendarDay(day.dataset.date);
        });

    });

    document.querySelectorAll('[data-action="open-plan-import"]').forEach(button => {

        button.addEventListener("click", openPlanImport);

    });

    document.querySelectorAll('[data-action="open-plan-add-sheet"]').forEach(button => {

        button.addEventListener("click", openAddSheet);

    });

    // El backdrop entero lleva data-action="close-plan-add-sheet" (ver
    // BottomSheet.js) pero el click dentro del panel también burbujea
    // hasta él -- solo cierra si el click aterrizó de verdad en el
    // backdrop mismo, no en algo dentro del panel.
    document.querySelectorAll('[data-action="close-plan-add-sheet"]').forEach(backdrop => {

        backdrop.addEventListener("click", event => {

            if (event.target !== event.currentTarget) return;
            closeAddSheet();

        });

    });

    document.querySelectorAll('[data-action="add-sheet-import-plan"]').forEach(button => {

        button.addEventListener("click", () => {
            closeAddSheetSilently();
            openPlanImport();
        });

    });

    document.querySelectorAll('[data-action="add-sheet-create-workout"]').forEach(button => {

        button.addEventListener("click", addSheetCreateWorkout);

    });

    document.querySelectorAll('[data-action="add-sheet-add-rest"]').forEach(button => {

        button.addEventListener("click", addSheetAddRest);

    });

    document.querySelectorAll('[data-action="close-plan-import"]').forEach(button => {

        button.addEventListener("click", closePlanImport);

    });

    const fileInput = document.querySelector("#plan-import-file-input");

    if (fileInput) {

        fileInput.addEventListener("change", () => {

            const file = fileInput.files?.[0];
            if (!file) return;

            handlePlanFileSelected(file);

        });

    }

    document.querySelectorAll(".plan-review-fields [data-session][data-field]").forEach(input => {

        input.addEventListener("change", () => {

            const field = PLAN_SESSION_REVIEW_FIELDS.find(f => f.key === input.dataset.field);
            if (!field) return;

            const sessionIndex = Number(input.dataset.session);

            updateImportSessionField(sessionIndex, field.key, parseSessionFieldValue(field, input.value));
            rerender();

        });

    });

    document.querySelectorAll('[data-action="view-session-workout"]').forEach(button => {

        button.addEventListener("click", () => {
            viewSessionWorkout(button.dataset.workoutId);
        });

    });

    document.querySelectorAll('[data-action="confirm-plan-import"]').forEach(button => {

        button.addEventListener("click", performPlanImport);

    });

    document.querySelectorAll('[data-action="start-move-session"]').forEach(button => {

        button.addEventListener("click", () => {
            startMoveSession(button.dataset.sessionId);
        });

    });

    document.querySelectorAll('[data-action="cancel-move-session"]').forEach(button => {

        button.addEventListener("click", cancelMoveSession);

    });

    document.querySelectorAll('[data-action="move-session-to"]').forEach(day => {

        day.addEventListener("click", () => {
            moveSessionTo(day.dataset.date);
        });

    });

    /*==========================
        MOVER SESIÓN DE GIMNASIO (PlanGymDayCard.js/PlanGymMoveDayPicker.js)
    ==========================*/

    document.querySelectorAll('[data-action="start-move-gym-day"]').forEach(button => {

        button.addEventListener("click", () => {
            startMoveGymDay(button.dataset.dayId);
        });

    });

    document.querySelectorAll('[data-action="cancel-move-gym-day"]').forEach(button => {

        button.addEventListener("click", cancelMoveGymDay);

    });

    document.querySelectorAll('[data-action="move-gym-day-to"]').forEach(day => {

        day.addEventListener("click", () => {
            moveGymDayTo(day.dataset.weekday);
        });

    });

    document.querySelectorAll('[data-action="start-duplicate-session"]').forEach(button => {

        button.addEventListener("click", () => {
            startDuplicateSession(button.dataset.sessionId);
        });

    });

    document.querySelectorAll('[data-action="cancel-duplicate-session"]').forEach(button => {

        button.addEventListener("click", cancelDuplicateSession);

    });

    document.querySelectorAll('[data-action="duplicate-session-to"]').forEach(day => {

        day.addEventListener("click", () => {
            duplicateSessionTo(day.dataset.date);
        });

    });

    document.querySelectorAll('[data-action="edit-planned-session"]').forEach(button => {

        button.addEventListener("click", () => {
            editSession(button.dataset.sessionId);
        });

    });

    /*==========================
        TARJETA DE GIMNASIO INLINE (PlanGymDayCard.js)
    ==========================*/

    document.querySelectorAll('[data-action="plan-start-gym-day"], [data-action="plan-view-completed-gym-session"]').forEach(button => {

        button.addEventListener("click", () => {
            startGymDayFromPlan(button.dataset.dayId);
        });

    });

    document.querySelectorAll('[data-action="plan-edit-gym-routine"]').forEach(button => {

        button.addEventListener("click", () => {
            editGymRoutineFromPlan(button.dataset.routineId);
        });

    });

    document.querySelectorAll('[data-action="plan-delete-gym-routine"]').forEach(button => {

        button.addEventListener("click", () => {
            deleteGymRoutineFromPlan(button.dataset.routineId);
        });

    });

    // Sin stopPropagation, el listener de "cerrar al tocar fuera"
    // (registrado una sola vez a nivel de módulo, ver más abajo) se
    // dispararía en el mismo click que abre el menú y lo cerraría en el
    // acto.
    document.querySelectorAll('[data-action="toggle-workout-menu"]').forEach(button => {

        button.addEventListener("click", event => {
            event.stopPropagation();
            toggleSessionMenu(button.dataset.sessionId);
        });

    });

    document.querySelectorAll('[data-action="toggle-workout-description"]').forEach(button => {

        button.addEventListener("click", () => {
            toggleDescriptionExpanded(button.dataset.sessionId);
        });

    });

    document.querySelectorAll('[data-action="delete-planned-session"]').forEach(button => {

        button.addEventListener("click", () => {
            deleteSession(button.dataset.sessionId);
        });

    });

    document.querySelectorAll('[data-action="undo-plan-import"]').forEach(button => {

        button.addEventListener("click", () => {
            undoPlanImport(button.dataset.batchId);
        });

    });

    document.querySelectorAll('[data-action="cancel-manual-session"]').forEach(button => {

        button.addEventListener("click", () => {
            cancelCreateSession();
            rerender();
        });

    });

    document.querySelectorAll('[data-action="save-manual-session"]').forEach(button => {

        button.addEventListener("click", saveManualSession);

    });

    document.querySelectorAll('[data-action="set-manual-session-type"]').forEach(select => {

        select.addEventListener("change", () => {
            setNewSessionType(select.value);
        });

    });

    document.querySelectorAll('[data-action="set-manual-session-notes"]').forEach(textarea => {

        textarea.addEventListener("change", () => {
            setNewSessionNotes(textarea.value);
        });

    });

    document.querySelectorAll(".review-textarea").forEach(textarea => {

        autoResizeTextarea(textarea);
        textarea.addEventListener("input", () => autoResizeTextarea(textarea));

    });

}
