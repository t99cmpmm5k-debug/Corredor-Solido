import { getState, setState } from "../../core/state";
import { getTodaySession, getCurrentWeekSessions } from "../../data/workoutStore.js";
import { formatISODate, getWeekStartDate } from "../../utils/date.js";

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

// Vuelve a la semana actual y olvida cualquier sesión seleccionada de
// otra semana — se llama solo al entrar en Plan desde la barra de
// navegación (ver BottomNavigation.js), nunca en cada render de Plan(),
// para que navegar entre semanas dentro de la propia pantalla no se
// resetee solo.
export function resetPlanView() {

    setState("viewedWeekStart", currentWeekStart());
    setState("selectedWorkout", null);

}
