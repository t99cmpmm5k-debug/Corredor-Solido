import { getState, setState } from "../../core/state";
import { week } from "../../data/planData";
import { isToday } from "../../utils/date";

export function getSelectedWorkout() {

    const state = getState();

    if (!state.selectedWorkout) {

        setState(
            "selectedWorkout",
            week.find(session => isToday(session.date)) || week[0]
        );

    }

    return getState().selectedWorkout;

}

export function setSelectedWorkout(workout) {

    setState("selectedWorkout", workout);

}