const initial = () => ({

    step: "closed",
    parsedRaces: null,
    parseError: null,
    saveError: null,
    savedCount: null,
    savedBatchId: null

});

let wizard = initial();

export function getRaceImportStep() {

    return wizard.step;

}

export function setRaceImportStep(step) {

    wizard.step = step;

}

export function getParsedRaces() {

    return wizard.parsedRaces;

}

export function setParsedRaces(plan) {

    wizard.parsedRaces = plan;

}

export function updateImportRaceField(raceIndex, key, value) {

    if (!wizard.parsedRaces) return;

    const race = wizard.parsedRaces.races[raceIndex];
    if (!race) return;

    race[key] = value;

    if (!race.fieldMeta[key]) {
        race.fieldMeta[key] = { confidence: null, corrected: false };
    }

    race.fieldMeta[key].corrected = true;

}

export function getRaceImportParseError() {

    return wizard.parseError;

}

export function setRaceImportParseError(message) {

    wizard.parseError = message;

}

export function getRaceImportSaveError() {

    return wizard.saveError;

}

export function setRaceImportSaveError(message) {

    wizard.saveError = message;

}

export function getRaceImportSavedCount() {

    return wizard.savedCount;

}

export function setRaceImportSavedCount(count) {

    wizard.savedCount = count;

}

export function getRaceImportSavedBatchId() {

    return wizard.savedBatchId;

}

export function setRaceImportSavedBatchId(batchId) {

    wizard.savedBatchId = batchId;

}

export function resetRaceImport() {

    wizard = initial();

}
