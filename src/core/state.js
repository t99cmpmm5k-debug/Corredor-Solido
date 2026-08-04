const state = {

    currentPage: null,

    selectedWorkout: null,

    selectedRun: null,

    selectedExercise: null,

    selectedShoe: null

};

export function getState() {

    return state;

}

export function setState(key, value) {

    state[key] = value;

}