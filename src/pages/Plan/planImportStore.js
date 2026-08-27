import { resetScrollToTop } from "../../utils/scrollReset.js";

const initial = () => ({

    step: "closed",
    parsedPlan: null,
    parseError: null,
    saveError: null,
    savedCount: null,
    savedBatchId: null

});

let wizard = initial();

export function getImportStep() {

    return wizard.step;

}

export function setImportStep(step) {

    wizard.step = step;

    // Mismo bug real que Running/runningStore.js: cada paso del wizard es
    // una vista nueva -- sin esto, abrirlo estando ya desplazado en Plan
    // dejaba su cabecera asomando bajo la barra de estado.
    resetScrollToTop();

}

export function getParsedPlan() {

    return wizard.parsedPlan;

}

export function setParsedPlan(plan) {

    wizard.parsedPlan = plan;

}

export function updateImportSessionField(sessionIndex, key, value) {

    if (!wizard.parsedPlan) return;

    const session = wizard.parsedPlan.sessions[sessionIndex];
    if (!session) return;

    session[key] = value;

    if (!session.fieldMeta[key]) {
        session.fieldMeta[key] = { confidence: null, corrected: false };
    }

    session.fieldMeta[key].corrected = true;

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

export function getImportSavedCount() {

    return wizard.savedCount;

}

export function setImportSavedCount(count) {

    wizard.savedCount = count;

}

export function getImportSavedBatchId() {

    return wizard.savedBatchId;

}

export function setImportSavedBatchId(batchId) {

    wizard.savedBatchId = batchId;

}

export function resetPlanImport() {

    wizard = initial();

}
