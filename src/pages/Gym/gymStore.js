const store = {

    step: "select-day",
    activeSessionId: null

};

export function getStep() {

    return store.step;

}

export function setStep(step) {

    store.step = step;

}

export function getActiveSessionId() {

    return store.activeSessionId;

}

export function setActiveSessionId(id) {

    store.activeSessionId = id;

}
