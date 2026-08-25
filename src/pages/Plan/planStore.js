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

// Vuelve a la semana actual y olvida cualquier sesión seleccionada de
// otra semana — se llama solo al entrar en Plan desde la barra de
// navegación (ver BottomNavigation.js), nunca en cada render de Plan(),
// para que navegar entre semanas dentro de la propia pantalla no se
// resetee solo.
export function resetPlanView() {

    setState("viewedWeekStart", currentWeekStart());
    setState("selectedWorkout", null);
    setState("movingSessionId", null);
    setState("planViewMode", "week");
    setState("viewedMonth", null);
    setState("creatingSessionDate", null);
    setState("newSessionType", null);
    setState("newSessionNotes", null);

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

}

export function cancelCreateSession() {

    setState("creatingSessionDate", null);

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
