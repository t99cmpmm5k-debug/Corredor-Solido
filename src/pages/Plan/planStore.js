import { getState, setState } from "../../core/state";
import { getTodaySession, getCurrentWeekSessions } from "../../data/workoutStore.js";

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
