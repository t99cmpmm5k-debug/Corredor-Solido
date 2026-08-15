import { setSelectedWorkout, getViewedWeekStart, setViewedWeekStart } from "./planStore";
import { rerender, navigate } from "../../core/router";

import { importPlan } from "../../importers/plan/index.js";
import { importPlannedSessions, getWeekSessions, getSessionById } from "../../data/workoutStore.js";
import { addDays } from "../../utils/date.js";
import { PLAN_SESSION_REVIEW_FIELDS, parseSessionFieldValue } from "./components/PlanImportReviewStep.js";
import { Running } from "../Running/Running.js";
import { openDetail as openRunningDetail } from "../Running/initRunningEvents.js";

import {
    getImportStep,
    setImportStep,
    resetPlanImport,
    getParsedPlan,
    setParsedPlan,
    setImportParseError,
    setImportSaveError,
    setImportSavedCount,
    updateImportSessionField
} from "./planImportStore.js";

const PLAN_IMPORT_HISTORY_STATE = { planImport: true };

function openPlanImport() {

    resetPlanImport();
    setImportStep("upload");

    // Sin esto, el gesto de atrás del móvil no tiene una entrada de
    // historial propia que consumir y se sale directo de la app — mismo
    // motivo que openDetail()/openShoes() en initRunningEvents.js.
    history.pushState(PLAN_IMPORT_HISTORY_STATE, "");

    rerender();

}

function closePlanImport() {

    if (history.state?.planImport) {
        history.back();
        return;
    }

    setImportStep("closed");
    rerender();

}

// Registrado una sola vez a nivel de módulo (no dentro de initPlanEvents,
// que se vuelve a llamar en cada render) — mismo motivo que el listener
// equivalente de initRunningEvents.js.
window.addEventListener("popstate", () => {

    if (getImportStep() !== "closed") {
        setImportStep("closed");
        rerender();
    }

});

// Igual que looksLikeTcx() en initRunningEvents.js: se decide por el
// contenido real, no por la extensión del archivo — el input no restringe
// por accept a propósito.
function looksLikeJson(text) {
    return text.trim().startsWith("{");
}

const PDF_SIGNATURE = "%PDF-";

// Un PDF es binario — leerlo entero con file.text() como JSON/CSV
// produciría texto corrupto. Se lee primero solo la firma (5 bytes,
// barato) para decidir la rama antes de tocar el resto del archivo.
async function handlePlanFileSelected(file) {

    setImportParseError(null);

    let signature;

    try {
        signature = await file.slice(0, PDF_SIGNATURE.length).text();
    } catch {
        setImportParseError(`No se pudo leer "${file.name}".`);
        rerender();
        return;
    }

    if (signature === PDF_SIGNATURE) {
        return handlePdfFileSelected(file);
    }

    let text;

    try {
        text = await file.text();
    } catch {
        setImportParseError(`No se pudo leer "${file.name}".`);
        rerender();
        return;
    }

    try {

        const plan = importPlan(looksLikeJson(text) ? "json" : "csv", text);

        setParsedPlan(plan);
        setImportStep("review");

    } catch (err) {

        setImportParseError(err.message);

    }

    rerender();

}

// pdfText.js carga pdfjs-dist, que pesa — solo se importa cuando de
// verdad se elige un PDF, para no engordar el chunk principal.
async function handlePdfFileSelected(file) {

    let extractPdfText;
    try {
        ({ extractPdfText } = await import("../../importers/plan/pdfText.js"));
    } catch {
        setImportParseError("No se pudo cargar el lector de PDF — comprueba la conexión e inténtalo de nuevo.");
        rerender();
        return;
    }

    try {

        const text = await extractPdfText(file);
        const plan = importPlan("pdf", text);

        setParsedPlan(plan);
        setImportStep("review");

    } catch (err) {

        setImportParseError(err.message);

    }

    rerender();

}

// Un <textarea> de una sola fila no muestra el texto completo cuando es
// largo (recorta visualmente, bug real con la descripción concatenada de
// un PDF) — se ajusta la altura a mano al contenido real en vez de fiarlo
// a una propiedad CSS (field-sizing:content) sin soporte fiable en Safari.
function autoResizeTextarea(textarea) {

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;

}

// Salta de página (router global) y, ya en Running, abre directamente su
// vista de detalle (estado propio de runningStore.js, ajeno al router) —
// dos renders seguidos, mismo patrón que ya encadena el resto de la app.
function viewSessionWorkout(workoutId) {

    navigate(Running);
    openRunningDetail(workoutId);

}

// Cambiar de semana también reasigna la sesión seleccionada — la que
// hubiera (de la semana anterior) puede no existir ya en la nueva, y
// "hoy" solo tiene sentido dentro de la semana actual.
function changeViewedWeek(deltaWeeks) {

    const newWeekStart = addDays(getViewedWeekStart(), deltaWeeks * 7);
    setViewedWeekStart(newWeekStart);

    const sessions = getWeekSessions(newWeekStart);
    setSelectedWorkout(sessions[0] ?? null);

    rerender();

}

function performPlanImport() {

    const plan = getParsedPlan();
    if (!plan) return;

    // Una sesión recurrente (weekday, p. ej. una tabla de gimnasio semanal
    // de un PDF) no tiene fecha A PROPÓSITO — no cuenta como "sin fecha"
    // para este guard, solo las que de verdad no se pudieron determinar.
    const missingDate = plan.sessions.some(s => !s.date && !s.weekday);

    if (missingDate) {
        setImportSaveError("Hay sesiones sin fecha — rellénala en todas antes de confirmar.");
        rerender();
        return;
    }

    importPlannedSessions(plan.sessions).then(({ written }) => {

        setImportSavedCount(written);
        setImportSaveError(null);
        setImportStep("success");
        rerender();

    });

}

export function initPlanEvents() {

    document.querySelectorAll(".timeline-day").forEach(day => {

        day.addEventListener("click", () => {

            const workout = getSessionById(day.dataset.sessionId);

            if (!workout) return;

            setSelectedWorkout(workout);

            rerender();

        });

    });

    document.querySelectorAll('[data-action="prev-week"]').forEach(button => {

        button.addEventListener("click", () => changeViewedWeek(-1));

    });

    document.querySelectorAll('[data-action="next-week"]').forEach(button => {

        button.addEventListener("click", () => changeViewedWeek(1));

    });

    document.querySelectorAll('[data-action="open-plan-import"]').forEach(button => {

        button.addEventListener("click", openPlanImport);

    });

    document.querySelectorAll('[data-action="close-plan-import"]').forEach(button => {

        button.addEventListener("click", closePlanImport);

    });

    const fileInput = document.querySelector("#plan-import-file-input");

    if (fileInput) {

        fileInput.addEventListener("change", () => {

            const file = fileInput.files?.[0];
            if (!file) return;

            handlePlanFileSelected(file);

        });

    }

    document.querySelectorAll(".plan-review-fields [data-session][data-field]").forEach(input => {

        input.addEventListener("change", () => {

            const field = PLAN_SESSION_REVIEW_FIELDS.find(f => f.key === input.dataset.field);
            if (!field) return;

            const sessionIndex = Number(input.dataset.session);

            updateImportSessionField(sessionIndex, field.key, parseSessionFieldValue(field, input.value));
            rerender();

        });

    });

    document.querySelectorAll('[data-action="view-session-workout"]').forEach(button => {

        button.addEventListener("click", () => {
            viewSessionWorkout(button.dataset.workoutId);
        });

    });

    document.querySelectorAll('[data-action="confirm-plan-import"]').forEach(button => {

        button.addEventListener("click", performPlanImport);

    });

    document.querySelectorAll(".review-textarea").forEach(textarea => {

        autoResizeTextarea(textarea);
        textarea.addEventListener("input", () => autoResizeTextarea(textarea));

    });

}
