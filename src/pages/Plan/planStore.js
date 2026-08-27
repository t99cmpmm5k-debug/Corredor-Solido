import { getState, setState } from "../../core/state";
import { getTodaySession, getCurrentWeekSessions } from "../../data/workoutStore.js";
import { formatISODate, getWeekStartDate, parseISODate } from "../../utils/date.js";

function currentWeekStart() {

    return getWeekStartDate(formatISODate(new Date()));

}

export function getSelectedWorkout() {

    const state = getState();

    if (!state.selectedWorkout) {

        const sessions = getCurrentWeekSessions();

        setState(
            "selectedWorkout",
            getTodaySession() ?? sessions[0] ?? null
        );

    }

    return getState().selectedWorkout;

}

export function setSelectedWorkout(workout) {

    setState("selectedWorkout", workout);

}

export function getViewedWeekStart() {

    const state = getState();

    if (!state.viewedWeekStart) {
        setState("viewedWeekStart", currentWeekStart());
    }

    return getState().viewedWeekStart;

}

export function setViewedWeekStart(weekStartDate) {

    setState("viewedWeekStart", weekStartDate);

}

// "week" (por defecto) o "month" — qué vista de Plan está activa ahora
// mismo. Independiente de viewedWeekStart/viewedMonth a propósito: cada
// vista lleva su propia posición de navegación, para que alternar entre
// ellas no le haga perder el sitio a la otra.
export function getPlanViewMode() {

    return getState().planViewMode ?? "week";

}

export function setPlanViewMode(mode) {

    setState("planViewMode", mode);

}

// Mes (1er día, ISO) que muestra la vista mensual. Se inicializa una
// sola vez al mes de la semana que se estuviera viendo (no siempre "hoy")
// para que la primera vez que se alterna a mensual no salte de sitio si
// el usuario ya había navegado a otra semana — a partir de ahí navega de
// forma independiente, igual que viewedWeekStart.
export function getViewedMonth() {

    const state = getState();

    if (!state.viewedMonth) {

        const base = state.viewedWeekStart ? parseISODate(state.viewedWeekStart) : new Date();
        setState("viewedMonth", formatISODate(new Date(base.getFullYear(), base.getMonth(), 1)));

    }

    return getState().viewedMonth;

}

export function setViewedMonth(monthStartIso) {

    setState("viewedMonth", monthStartIso);

}

export function shiftViewedMonth(deltaMonths) {

    const current = parseISODate(getViewedMonth());
    const shifted = new Date(current.getFullYear(), current.getMonth() + deltaMonths, 1);

    setState("viewedMonth", formatISODate(shifted));

}

// Id de la sesión que se está moviendo a otro día — null cuando no hay
// ningún movimiento en curso. Aparte de selectedWorkout a propósito: la
// sesión que se ve en la tarjeta no tiene por qué ser la que se está
// moviendo (mover no cambia qué hay seleccionado hasta que se confirma).
export function getMovingSessionId() {

    return getState().movingSessionId;

}

export function setMovingSessionId(id) {

    setState("movingSessionId", id);

}

// Id de la sesión que se está duplicando a otro día — mismo patrón que
// movingSessionId, comparte el selector de día (PlanMoveDayPicker) en
// modo "duplicate" en vez de "move" (ver Plan.js/initPlanEvents.js).
export function getDuplicatingSessionId() {

    return getState().duplicatingSessionId;

}

export function setDuplicatingSessionId(id) {

    setState("duplicatingSessionId", id);

}

// Id de la sesión cuyo menú "···" está abierto ahora mismo (fase 4 del
// pulido de Plan) — solo puede haber una tarjeta de sesión a la vez, así
// que un simple id (no un Set) basta; null cuando no hay ningún menú
// abierto.
export function getSessionMenuOpenId() {

    return getState().sessionMenuOpenId ?? null;

}

export function setSessionMenuOpenId(id) {

    setState("sessionMenuOpenId", id);

}

// Id de la sesión cuya descripción larga está expandida ("Ver sesión
// completa", fase 4 del pulido de Plan) — null = todas colapsadas (el
// estado por defecto). Aparte de selectedWorkout porque cambiar de día
// no debería heredar "expandida" del día anterior.
export function getExpandedSessionId() {

    return getState().expandedSessionId ?? null;

}

export function setExpandedSessionId(id) {

    setState("expandedSessionId", id);

}

// Bottom sheet del botón "+" (fase 5 del pulido de Plan) -- true/false
// simple, solo puede haber uno abierto a la vez. Aparte de
// creatingSessionDate/movingSessionId/etc. porque no comparte tarjeta con
// ellos: es una capa flotante por encima de toda la pantalla, no un
// contenido del hueco de detalle.
export function isAddSheetOpen() {

    return getState().addSheetOpen ?? false;

}

export function setAddSheetOpen(open) {

    setState("addSheetOpen", open);

}

// Vuelve a la semana actual y olvida cualquier sesión seleccionada de
// otra semana — se llama solo al entrar en Plan desde la barra de
// navegación (ver BottomNavigation.js), nunca en cada render de Plan(),
// para que navegar entre semanas dentro de la propia pantalla no se
// resetee solo.
export function resetPlanView() {

    setState("viewedWeekStart", currentWeekStart());
    setState("selectedWorkout", null);
    setState("movingSessionId", null);
    setState("duplicatingSessionId", null);
    setState("sessionMenuOpenId", null);
    setState("expandedSessionId", null);
    setState("addSheetOpen", false);
    setState("planViewMode", "week");
    setState("viewedMonth", null);
    setState("creatingSessionDate", null);
    setState("newSessionType", null);
    setState("newSessionNotes", null);
    setState("editingSessionId", null);

}

// Fecha (ISO) del día "Descanso" que se acaba de tocar para crear una
// sesión manual a mano — null cuando el formulario no está abierto.
// Aparte de selectedWorkout/movingSessionId a propósito: son tres estados
// de la misma tarjeta (ver PlanWorkoutCard/PlanMovePanel/
// PlanCreateSessionPanel en Plan.js) que nunca conviven a la vez.
const DEFAULT_NEW_SESSION_TYPE = "z2";

export function getCreatingSessionDate() {

    return getState().creatingSessionDate ?? null;

}

// Abre el formulario para `date` con los valores de partida de siempre
// (no arrastra lo que se hubiera escrito la última vez que se abrió para
// otro día).
export function startCreateSession(date) {

    setState("creatingSessionDate", date);
    setState("newSessionType", DEFAULT_NEW_SESSION_TYPE);
    setState("newSessionNotes", "");
    setState("editingSessionId", null);

}

// Id de la sesión real que se está editando -- null cuando el formulario
// está en modo "crear" (o cerrado). Comparte panel y campos con
// startCreateSession() (mismo PlanCreateSessionPanel, ver Plan.js) --
// solo cambia que aquí la fecha/tipo/notas de partida son los REALES de
// la sesión existente, y guardar actualiza en vez de crear (ver
// updatePlannedSession() en workoutStore.js).
export function getEditingSessionId() {

    return getState().editingSessionId ?? null;

}

export function startEditSession(session) {

    setState("creatingSessionDate", session.date);
    setState("newSessionType", session.type);
    setState("newSessionNotes", session.description ?? "");
    setState("editingSessionId", session.id);

}

export function cancelCreateSession() {

    setState("creatingSessionDate", null);
    setState("editingSessionId", null);

}

export function getNewSessionType() {

    return getState().newSessionType ?? DEFAULT_NEW_SESSION_TYPE;

}

export function setNewSessionType(type) {

    setState("newSessionType", type);

}

export function getNewSessionNotes() {

    return getState().newSessionNotes ?? "";

}

export function setNewSessionNotes(notes) {

    setState("newSessionNotes", notes);

}
