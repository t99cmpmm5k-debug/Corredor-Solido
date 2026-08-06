const initial = () => ({

    step: "idle",
    files: [],
    progress: null,
    ocrError: null,
    merged: null,
    workout: null,
    parseError: null,
    selectedShoeId: null,
    addingNewShoe: false,
    saveError: null,
    savedWorkout: null,
    duplicateWarning: null,
    timingLog: []

});

let wizard = initial();

export function getWizardStep() {

    return wizard.step;

}

export function setWizardStep(step) {

    wizard.step = step;

}

export function getFiles() {

    return wizard.files;

}

export function setFiles(files) {

    wizard.files = files;

}

export function getProgress() {

    return wizard.progress;

}

export function setProgress(progress) {

    wizard.progress = progress;

}

export function getOcrError() {

    return wizard.ocrError;

}

export function setOcrError(message) {

    wizard.ocrError = message;

}

export function getMerged() {

    return wizard.merged;

}

export function setMerged(merged) {

    wizard.merged = merged;

}

export function getWorkout() {

    return wizard.workout;

}

export function setWorkout(workout) {

    wizard.workout = workout;

}

export function updateWorkoutField(key, value) {

    if (!wizard.workout) return;

    wizard.workout[key] = value;

    if (!wizard.workout.fieldMeta[key]) {
        wizard.workout.fieldMeta[key] = { confidence: null, corrected: false };
    }

    wizard.workout.fieldMeta[key].corrected = true;

}

export function getParseError() {

    return wizard.parseError;

}

export function setParseError(message) {

    wizard.parseError = message;

}

export function getSelectedShoeId() {

    return wizard.selectedShoeId;

}

export function setSelectedShoeId(id) {

    wizard.selectedShoeId = id;

}

export function getAddingNewShoe() {

    return wizard.addingNewShoe;

}

export function setAddingNewShoe(value) {

    wizard.addingNewShoe = value;

}

export function getSaveError() {

    return wizard.saveError;

}

export function setSaveError(message) {

    wizard.saveError = message;

}

export function getSavedWorkout() {

    return wizard.savedWorkout;

}

export function setSavedWorkout(workout) {

    wizard.savedWorkout = workout;

}

export function getDuplicateWarning() {

    return wizard.duplicateWarning;

}

export function setDuplicateWarning(existingWorkout) {

    wizard.duplicateWarning = existingWorkout;

}

// TEMPORAL - MIENTRAS SE MIDE EL RENDIMIENTO DEL OCR, QUITAR LUEGO
const MAX_TIMING_LINES = 40;

export function getTimingLog() {

    return wizard.timingLog;

}

export function appendTiming(line) {

    wizard.timingLog.push(line);

    if (wizard.timingLog.length > MAX_TIMING_LINES) {
        wizard.timingLog.shift();
    }

}

export function resetWizard() {

    wizard = initial();

}
