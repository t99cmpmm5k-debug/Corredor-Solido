const state = {

    currentPage: null,

    selectedWorkout: null,

    viewedWeekStart: null,

    selectedRun: null,

    selectedExercise: null,

    selectedShoe: null,

    sessionDetailExpanded: false,

    weekPickerExpanded: false

};

export function getState() {

    return state;

}

export function setState(key, value) {

    state[key] = value;

}