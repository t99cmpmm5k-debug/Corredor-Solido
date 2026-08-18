import { rerender } from "../../core/router.js";
import { startSession, updateSet, finishSession, getSessionById, hydrate } from "../../data/gymSessionStore.js";
import { saveImportedRoutine, undoRoutineImport } from "../../data/gymRoutineStore.js";
import { importGymRoutine } from "../../importers/gym/index.js";
import { getActiveSessionId, setActiveSessionId, setStep } from "./gymStore.js";

import {
    getImportStep,
    setImportStep,
    resetGymImport,
    getParsedRoutine,
    setParsedRoutine,
    setImportParseError,
    setImportSaveError,
    setImportSavedRoutineId,
    setImportSavedPreviousActiveId,
    updateImportExerciseField
} from "./gymImportStore.js";

import { GYM_EXERCISE_REVIEW_FIELDS, parseExerciseFieldValue } from "./components/GymImportReviewStep.js";

const WEIGHT_STEP = 2.5;
const REPS_STEP = 1;

const GYM_IMPORT_HISTORY_STATE = { gymImport: true };

function openGymImport() {

    resetGymImport();
    setImportStep("upload");

    // Sin esto, el gesto de atrás del móvil no tiene una entrada de
    // historial propia que consumir y se sale directo de la app — mismo
    // motivo que openPlanImport() en initPlanEvents.js.
    history.pushState(GYM_IMPORT_HISTORY_STATE, "");

    rerender();

}

function closeGymImport() {

    if (history.state?.gymImport) {
        history.back();
        return;
    }

    setImportStep("closed");
    rerender();

}

// Registrado una sola vez a nivel de módulo (no dentro de initGymEvents,
// que se vuelve a llamar en cada render) — mismo motivo que el listener
// equivalente de initPlanEvents.js.
window.addEventListener("popstate", () => {

    if (getImportStep() !== "closed") {
        setImportStep("closed");
        rerender();
    }

});

// pdfText.js carga pdfjs-dist, que pesa — solo se importa cuando de verdad
// se elige un archivo, mismo motivo que handlePdfFileSelected() en
// initPlanEvents.js. Solo PDF por ahora (sin sniff de firma): todo archivo
// elegido aquí se trata directamente como PDF.
async function handleGymFileSelected(file) {

    setImportParseError(null);

    let extractPdfRows;
    try {
        ({ extractPdfRows } = await import("../../importers/gym/pdfText.js"));
    } catch {
        setImportParseError("No se pudo cargar el lector de PDF — comprueba la conexión e inténtalo de nuevo.");
        rerender();
        return;
    }

    try {

        const rows = await extractPdfRows(file);
        const routine = importGymRoutine("pdf", rows);

        setParsedRoutine(routine);
        setImportStep("review");

    } catch (err) {

        setImportParseError(err.message);

    }

    rerender();

}

function performGymImport() {

    const routine = getParsedRoutine();
    if (!routine) return;

    saveImportedRoutine(routine.days, routine.routineName).then(({ routineId, previousActiveId }) => {

        setImportSavedRoutineId(routineId);
        setImportSavedPreviousActiveId(previousActiveId);
        setImportSaveError(null);
        setImportStep("success");
        rerender();

    });

}

// Deshace de golpe la importación que se acaba de guardar — la rutina
// nueva se queda en la store (ver undoRoutineImport en gymRoutineStore.js),
// solo se mueve el puntero de "activa" de vuelta a la anterior. Sin
// window.confirm: a diferencia de deletePlannedSessionsByBatch en Plan, no
// se borra nada, así que no hay nada que perder de verdad.
function undoGymImport(previousActiveIdRaw) {

    const previousActiveId = previousActiveIdRaw || null;

    undoRoutineImport(previousActiveId).then(() => {

        closeGymImport();

    });

}

function currentSet(exerciseId, setIndex) {

    const session = getSessionById(getActiveSessionId());
    if (!session) return null;

    const exercise = session.exercises.find(e => e.exerciseId === exerciseId);

    return exercise ? exercise.sets[setIndex] : null;

}

function adjustWeight(exerciseId, setIndex, delta) {

    const set = currentSet(exerciseId, setIndex);
    if (!set) return;

    const next = Math.max(0, (set.weight ?? 0) + delta);

    updateSet(getActiveSessionId(), exerciseId, setIndex, { weight: next });
    rerender();

}

function adjustReps(exerciseId, setIndex, delta) {

    const set = currentSet(exerciseId, setIndex);
    if (!set) return;

    const next = Math.max(0, (set.reps ?? 0) + delta);

    updateSet(getActiveSessionId(), exerciseId, setIndex, { reps: next });
    rerender();

}

function toggleDone(exerciseId, setIndex) {

    const set = currentSet(exerciseId, setIndex);
    if (!set) return;

    updateSet(getActiveSessionId(), exerciseId, setIndex, { done: !set.done });
    rerender();

}

function wireStepper(action, handler) {

    document.querySelectorAll(`[data-action="${action}"]`).forEach(button => {

        button.addEventListener("click", () => {

            handler(button.dataset.exerciseId, Number(button.dataset.setIndex));

        });

    });

}

export function initGymEvents() {

    document.querySelectorAll('[data-action="select-day"]').forEach(card => {

        card.addEventListener("click", () => {

            // main.js arranca la app sin esperar a que termine la
            // hidratación (a propósito, para no bloquear el arranque si
            // IndexedDB tarda) — si el móvil recargó la pestaña (pantalla
            // bloqueada entre series) y se toca un día antes de que
            // gymSessionStore haya cargado lo ya guardado, startSession()
            // no encontraba la sesión de hoy y creaba otra desde cero,
            // perdiendo de vista los pesos ya registrados. hydrate() está
            // memoizado, así que esperar aquí no repite la carga.
            hydrate().then(() => {

                const session = startSession(card.dataset.dayId);
                if (!session) return;

                setActiveSessionId(session.id);
                setStep("session");
                rerender();

            });

        });

    });

    document.querySelectorAll('[data-action="close-session"]').forEach(button => {

        button.addEventListener("click", () => {

            // Todo lo marcado como hecho ya está autoguardado — cerrar aquí
            // no pierde nada, solo saca de la pantalla de sesión.
            setActiveSessionId(null);
            setStep("select-day");
            rerender();

        });

    });

    document.querySelectorAll('[data-action="finish-session"]').forEach(button => {

        button.addEventListener("click", () => {

            const id = getActiveSessionId();
            if (id) finishSession(id);

            setActiveSessionId(null);
            setStep("select-day");
            rerender();

        });

    });

    wireStepper("inc-weight", (exerciseId, setIndex) => adjustWeight(exerciseId, setIndex, WEIGHT_STEP));
    wireStepper("dec-weight", (exerciseId, setIndex) => adjustWeight(exerciseId, setIndex, -WEIGHT_STEP));
    wireStepper("inc-reps", (exerciseId, setIndex) => adjustReps(exerciseId, setIndex, REPS_STEP));
    wireStepper("dec-reps", (exerciseId, setIndex) => adjustReps(exerciseId, setIndex, -REPS_STEP));
    wireStepper("toggle-done", toggleDone);

    document.querySelectorAll('[data-action="open-gym-import"]').forEach(button => {

        button.addEventListener("click", openGymImport);

    });

    document.querySelectorAll('[data-action="close-gym-import"]').forEach(button => {

        button.addEventListener("click", closeGymImport);

    });

    const fileInput = document.querySelector("#gym-import-file-input");

    if (fileInput) {

        fileInput.addEventListener("change", () => {

            const file = fileInput.files?.[0];
            if (!file) return;

            handleGymFileSelected(file);

        });

    }

    document.querySelectorAll(".gym-review-row [data-day][data-exercise][data-field]").forEach(input => {

        input.addEventListener("change", () => {

            const field = GYM_EXERCISE_REVIEW_FIELDS.find(f => f.key === input.dataset.field);
            if (!field) return;

            const dayIndex = Number(input.dataset.day);
            const exerciseIndex = Number(input.dataset.exercise);

            updateImportExerciseField(dayIndex, exerciseIndex, field.key, parseExerciseFieldValue(field, input.value));
            rerender();

        });

    });

    document.querySelectorAll('[data-action="confirm-gym-import"]').forEach(button => {

        button.addEventListener("click", performGymImport);

    });

    document.querySelectorAll('[data-action="undo-gym-import"]').forEach(button => {

        button.addEventListener("click", () => {
            undoGymImport(button.dataset.previousActiveId);
        });

    });

}
