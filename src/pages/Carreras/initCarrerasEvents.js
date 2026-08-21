import { rerender, navigate } from "../../core/router.js";
import { openDetail as openRunningDetail } from "../Running/initRunningEvents.js";
import { Running } from "../Running/Running.js";
import { getSelectedDate, setSelectedDate, shiftViewedMonth } from "./carrerasStore.js";

import { importRaces } from "../../importers/races/index.js";
import { importPlannedRaces, deletePlannedRacesByBatch } from "../../data/workoutStore.js";
import { RACE_REVIEW_FIELDS, parseRaceFieldValue } from "./components/RaceImportReviewStep.js";

import {
    getRaceImportStep,
    setRaceImportStep,
    resetRaceImport,
    getParsedRaces,
    setParsedRaces,
    setRaceImportParseError,
    setRaceImportSaveError,
    setRaceImportSavedCount,
    setRaceImportSavedBatchId,
    updateImportRaceField
} from "./raceImportStore.js";

const RACE_IMPORT_HISTORY_STATE = { raceImport: true };

function selectDay(iso) {

    setSelectedDate(iso === getSelectedDate() ? null : iso);
    rerender();

}

// Mismo patrón que viewSessionWorkout() en Plan/initPlanEvents.js: salta
// de página (router global) y, ya en Running, abre directamente su vista
// de detalle (estado propio de runningStore.js, ajeno al router).
function openRaceDetail(workoutId) {

    navigate(Running);
    openRunningDetail(workoutId);

}

function openRaceImport() {

    resetRaceImport();
    setRaceImportStep("upload");

    // Sin esto, el gesto de atrás del móvil no tiene una entrada de
    // historial propia que consumir y se sale directo de la app — mismo
    // motivo que openPlanImport() en Plan/initPlanEvents.js.
    history.pushState(RACE_IMPORT_HISTORY_STATE, "");

    rerender();

}

function closeRaceImport() {

    if (history.state?.raceImport) {
        history.back();
        return;
    }

    setRaceImportStep("closed");
    rerender();

}

// Registrado una sola vez a nivel de módulo (no dentro de
// initCarrerasEvents, que se vuelve a llamar en cada render) — mismo
// motivo que el listener equivalente de initPlanEvents.js.
window.addEventListener("popstate", () => {

    if (getRaceImportStep() !== "closed") {
        setRaceImportStep("closed");
        rerender();
    }

});

async function handleRaceFileSelected(file) {

    setRaceImportParseError(null);

    let text;

    try {
        text = await file.text();
    } catch {
        setRaceImportParseError(`No se pudo leer "${file.name}".`);
        rerender();
        return;
    }

    try {

        const plan = importRaces("json", text);

        setParsedRaces(plan);
        setRaceImportStep("review");

    } catch (err) {

        setRaceImportParseError(err.message);

    }

    rerender();

}

function performRaceImport() {

    const plan = getParsedRaces();
    if (!plan) return;

    const missingDate = plan.races.some(r => !r.date);

    if (missingDate) {
        setRaceImportSaveError("Hay carreras sin fecha — rellénala en todas antes de confirmar.");
        rerender();
        return;
    }

    importPlannedRaces(plan.races).then(({ written, batchId }) => {

        setRaceImportSavedCount(written);
        setRaceImportSavedBatchId(batchId);
        setRaceImportSaveError(null);
        setRaceImportStep("success");
        rerender();

    });

}

// Deshace de golpe la importación que se acaba de guardar — mismo patrón
// que undoPlanImport() en Plan/initPlanEvents.js.
function undoRaceImport(batchId) {

    if (!batchId) return;

    if (!window.confirm("¿Deshacer esta importación? Se borrarán todas las carreras que se acaban de guardar. No se puede deshacer.")) return;

    deletePlannedRacesByBatch(batchId);
    closeRaceImport();

}

// Enlace de inscripción de una carrera planificada — se abre en pestaña
// nueva porque es un sitio externo (alcanzatumeta.es u otro organizador),
// no una vista propia de la app.
function openRaceUrl(url) {

    window.open(url, "_blank", "noopener,noreferrer");

}

export function initCarrerasEvents() {

    document.querySelectorAll('[data-action="calendar-prev-month"]').forEach(button => {

        button.addEventListener("click", () => {
            shiftViewedMonth(-1);
            rerender();
        });

    });

    document.querySelectorAll('[data-action="calendar-next-month"]').forEach(button => {

        button.addEventListener("click", () => {
            shiftViewedMonth(1);
            rerender();
        });

    });

    document.querySelectorAll('[data-action="select-race-day"]').forEach(day => {

        day.addEventListener("click", () => selectDay(day.dataset.date));

    });

    document.querySelectorAll('[data-action="open-race-detail"]').forEach(row => {

        row.addEventListener("click", () => openRaceDetail(row.dataset.workoutId));

    });

    document.querySelectorAll('[data-action="open-race-url"]').forEach(button => {

        button.addEventListener("click", () => openRaceUrl(button.dataset.url));

    });

    document.querySelectorAll('[data-action="open-race-import"]').forEach(button => {

        button.addEventListener("click", openRaceImport);

    });

    document.querySelectorAll('[data-action="close-race-import"]').forEach(button => {

        button.addEventListener("click", closeRaceImport);

    });

    const fileInput = document.querySelector("#race-import-file-input");

    if (fileInput) {

        fileInput.addEventListener("change", () => {

            const file = fileInput.files?.[0];
            if (!file) return;

            handleRaceFileSelected(file);

        });

    }

    document.querySelectorAll(".race-review-fields [data-race][data-field]").forEach(input => {

        input.addEventListener("change", () => {

            const field = RACE_REVIEW_FIELDS.find(f => f.key === input.dataset.field);
            if (!field) return;

            const raceIndex = Number(input.dataset.race);

            updateImportRaceField(raceIndex, field.key, parseRaceFieldValue(field, input.value));
            rerender();

        });

    });

    document.querySelectorAll('[data-action="confirm-race-import"]').forEach(button => {

        button.addEventListener("click", performRaceImport);

    });

    document.querySelectorAll('[data-action="undo-race-import"]').forEach(button => {

        button.addEventListener("click", () => {
            undoRaceImport(button.dataset.batchId);
        });

    });

}
