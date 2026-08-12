import { setSelectedWorkout } from "./planStore";
import { rerender } from "../../core/router";

import { importPlan } from "../../importers/plan/index.js";
import { importPlannedSessions, getCurrentWeekSessions } from "../../data/workoutStore.js";
import { PLAN_SESSION_REVIEW_FIELDS, parseSessionFieldValue } from "./components/PlanImportReviewStep.js";

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

// TEMPORAL — diagnóstico del bug real de iPhone. El issue de pdf.js más
// parecido al nuestro lo describe como "Unhandled Promise Rejection", no
// como un rechazo normal de la promesa que awaiteamos — puede que el
// fallo salte dentro de una promesa interna de pdfjs-dist (p. ej. al
// arrancar el Worker) que nunca se conecta con la que esperamos, y por
// tanto ningún try/catch normal lo vea. Esto captura cualquier error o
// promesa sin capturar que ocurra mientras dura `run()`, venga de donde
// venga, y lo convierte en un rechazo normal que sí podemos mostrar.
function withGlobalErrorCapture(run) {

    return new Promise((resolve, reject) => {

        let settled = false;

        function finish(fn, value) {
            if (settled) return;
            settled = true;
            window.removeEventListener("error", onError);
            window.removeEventListener("unhandledrejection", onRejection);
            fn(value);
        }

        function onError(event) {
            finish(reject, describeGlobalError("error global", event.error ?? event.message));
        }

        function onRejection(event) {
            finish(reject, describeGlobalError("promesa sin capturar", event.reason));
        }

        window.addEventListener("error", onError);
        window.addEventListener("unhandledrejection", onRejection);

        run().then(
            value => finish(resolve, value),
            err => finish(reject, err)
        );

    });

}

function describeGlobalError(stage, err) {

    const name = err?.name || typeof err;
    const message = err?.message || String(err);
    const stack = err?.stack ? ` | stack: ${String(err.stack).slice(0, 300)}` : "";

    return new Error(`[${stage}] ${name}: ${message}${stack}`);

}

// Un PDF es binario — leerlo entero con file.text() como JSON/CSV
// produciría texto corrupto. Se lee primero solo la firma (5 bytes,
// barato) para decidir la rama antes de tocar el resto del archivo.
async function handlePlanFileSelected(file) {

    setImportParseError(null);

    let signature;

    try {
        signature = await file.slice(0, PDF_SIGNATURE.length).text();
    } catch (err) {
        // TEMPORAL — ver comentario en pdfText.js, mismo diagnóstico del
        // bug real de iPhone. Quitar el prefijo [firma] cuando se resuelva.
        setImportParseError(`[firma] ${err?.name || typeof err}: ${err?.message || err}`);
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

    // TEMPORAL — diagnóstico del bug real de iPhone (ver pdfText.js):
    // separado del resto para saber si el fallo es cargar el propio
    // módulo (import() dinámico) o algo dentro de él.
    let extractPdfText;
    try {
        ({ extractPdfText } = await import("../../importers/plan/pdfText.js"));
    } catch (err) {
        setImportParseError(`[carga del módulo PDF] ${err?.name || typeof err}: ${err?.message || err}`);
        rerender();
        return;
    }

    try {

        const text = await withGlobalErrorCapture(() => extractPdfText(file));
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

function performPlanImport() {

    const plan = getParsedPlan();
    if (!plan) return;

    const missingDate = plan.sessions.some(s => !s.date);

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

            const workout = getCurrentWeekSessions().find(
                session => session.date === day.dataset.date
            );

            if (!workout) return;

            setSelectedWorkout(workout);

            rerender();

        });

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

    document.querySelectorAll('[data-action="confirm-plan-import"]').forEach(button => {

        button.addEventListener("click", performPlanImport);

    });

    document.querySelectorAll(".review-textarea").forEach(textarea => {

        autoResizeTextarea(textarea);
        textarea.addEventListener("input", () => autoResizeTextarea(textarea));

    });

}
