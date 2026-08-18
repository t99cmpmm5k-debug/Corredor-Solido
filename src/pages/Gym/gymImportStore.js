const initial = () => ({

    step: "closed",
    parsedRoutine: null,
    parseError: null,
    saveError: null,
    savedPreviousActiveId: undefined,
    savedRoutineId: null

});

let wizard = initial();

export function getImportStep() {

    return wizard.step;

}

export function setImportStep(step) {

    wizard.step = step;

}

export function getParsedRoutine() {

    return wizard.parsedRoutine;

}

export function setParsedRoutine(routine) {

    wizard.parsedRoutine = routine;

}

// sessionIndex aquí es en realidad [dayIndex, exerciseIndex] — GymImportReviewStep.js
// pasa el par ya calculado, mismo motivo que updateImportSessionField en Plan
// (un único sitio que sabe editar el dato en bruto, reutilizado al re-renderizar).
export function updateImportExerciseField(dayIndex, exerciseIndex, key, value) {

    if (!wizard.parsedRoutine) return;

    const exercise = wizard.parsedRoutine.days[dayIndex]?.exercises[exerciseIndex];
    if (!exercise) return;

    exercise[key] = value;

    if (!exercise.fieldMeta[key]) {
        exercise.fieldMeta[key] = { confidence: null, corrected: false };
    }

    exercise.fieldMeta[key].corrected = true;

}

export function getImportParseError() {

    return wizard.parseError;

}

export function setImportParseError(message) {

    wizard.parseError = message;

}

export function getImportSaveError() {

    return wizard.saveError;

}

export function setImportSaveError(message) {

    wizard.saveError = message;

}

export function getImportSavedPreviousActiveId() {

    return wizard.savedPreviousActiveId;

}

export function setImportSavedPreviousActiveId(id) {

    wizard.savedPreviousActiveId = id;

}

export function getImportSavedRoutineId() {

    return wizard.savedRoutineId;

}

export function setImportSavedRoutineId(id) {

    wizard.savedRoutineId = id;

}

export function resetGymImport() {

    wizard = initial();

}
