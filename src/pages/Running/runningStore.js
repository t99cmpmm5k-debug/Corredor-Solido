const initial = () => ({

    step: "idle",
    files: [],
    progress: null,
    ocrError: null,
    merged: null,
    captures: [],
    workout: null,
    parseError: null,
    selectedShoeId: null,
    addingNewShoe: false,
    saveError: null,
    savedWorkout: null,
    duplicateWarning: null,
    timingLog: [],
    detailWorkoutId: null,
    newShoePhoto: null,
    editingShoeId: null

});

let wizard = initial();

// Filtro de tipo de la lista de Running — aparte de `wizard` a propósito:
// resetWizard() se llama tanto al terminar una importación como al pulsar
// "Importar", y meter el filtro ahí lo borraría sin que el usuario lo
// haya tocado.
let typeFilter = null;

export function getTypeFilter() {

    return typeFilter;

}

export function setTypeFilter(type) {

    typeFilter = type || null;

}

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

export function getCaptures() {

    return wizard.captures;

}

export function setCaptures(captures) {

    wizard.captures = captures;

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

export function getDetailWorkoutId() {

    return wizard.detailWorkoutId;

}

export function setDetailWorkoutId(id) {

    wizard.detailWorkoutId = id;

}

// Foto pendiente del formulario de alta/edición de zapatilla — hace
// falta guardarla en el store (no solo en el DOM) porque render()
// reconstruye el HTML en cada rerender y se perdería el preview.
export function getNewShoePhoto() {

    return wizard.newShoePhoto;

}

export function setNewShoePhoto(dataUrl) {

    wizard.newShoePhoto = dataUrl;

}

export function getEditingShoeId() {

    return wizard.editingShoeId;

}

export function setEditingShoeId(id) {

    wizard.editingShoeId = id;
    wizard.newShoePhoto = null;

}

export function resetWizard() {

    wizard = initial();

}
