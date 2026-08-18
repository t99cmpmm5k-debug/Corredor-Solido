const store = {

    step: "select-day",
    activeSessionId: null,
    currentExerciseIndex: 0

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

export function getCurrentExerciseIndex() {

    return store.currentExerciseIndex;

}

export function setCurrentExerciseIndex(index) {

    store.currentExerciseIndex = index;

}

/*==========================
   TEMPORIZADOR DE DESCANSO
   (90s fijos, autoarranca al marcar una serie como hecha — decisión de
   producto confirmada con el usuario, sin dato real de "tiempo ideal" de
   descanso por ejercicio en ningún sitio del modelo)
==========================*/

const REST_DEFAULT_SEC = 90;
export const REST_STEP_SEC = 15;

let restDurationSec = REST_DEFAULT_SEC;
let restEndAt = null; // timestamp ms; null = sin descanso en marcha

export function getRestDurationSec() {

    return restDurationSec;

}

export function getRestRemainingSec() {

    if (restEndAt == null) return 0;

    return Math.max(0, Math.round((restEndAt - Date.now()) / 1000));

}

// restEndAt != null basta como "hay un descanso en marcha" — no se exige
// además remaining > 0, porque initGymEvents.js es quien limpia restEndAt
// al llegar a cero (ver tickRestTimerDisplay). Si aquí también exigiéramos
// remaining > 0, el propio tick nunca entraría a limpiarlo en el segundo
// exacto en que llega a cero, y el temporizador se quedaría clavado en
// "00:00" para siempre.
export function isRestRunning() {

    return restEndAt != null;

}

export function startRestTimer() {

    restDurationSec = REST_DEFAULT_SEC;
    restEndAt = Date.now() + restDurationSec * 1000;

}

export function stopRestTimer() {

    restEndAt = null;

}

export function adjustRestTimer(deltaSec) {

    if (restEndAt == null) return;

    restEndAt += deltaSec * 1000;
    restDurationSec = Math.max(REST_STEP_SEC, restDurationSec + deltaSec);

}
