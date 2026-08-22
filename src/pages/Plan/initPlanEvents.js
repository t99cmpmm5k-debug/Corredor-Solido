import { setSelectedWorkout, getViewedWeekStart, setViewedWeekStart, getMovingSessionId, setMovingSessionId, getPlanViewMode, setPlanViewMode, shiftViewedMonth } from "./planStore";
import { rerender, navigate } from "../../core/router";

import { importPlan } from "../../importers/plan/index.js";
import { importPlannedSessions, getWeekSessions, getSessionById, getSessionsForDate, movePlannedSession, deletePlannedSession, deletePlannedSessionsByBatch } from "../../data/workoutStore.js";
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
    setImportSavedBatchId,
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

// Alterna semanal/mensual sin perder la posición de cada una (viewedWeekStart
// y viewedMonth son estados independientes, ver planStore.js). Un
// movimiento en curso no tiene UI en vista mensual (PlanMovePanel/
// PlanMoveDayPicker son solo de la semanal) — cambiar de vista en medio
// lo cancela, en vez de dejarlo colgado sin ningún control para salir de él.
function togglePlanView() {

    setPlanViewMode(getPlanViewMode() === "week" ? "month" : "week");

    if (getMovingSessionId()) setMovingSessionId(null);

    rerender();

}

function changeViewedMonth(deltaMonths) {

    shiftViewedMonth(deltaMonths);
    rerender();

}

// Igual que tocar un día en el timeline semanal (ver más abajo,
// ".timeline-day"): selecciona la sesión y la deja lista para
// PlanWorkoutCard. Con varias sesiones el mismo día (running + gimnasio)
// se queda con la primera por orden de slot — mismo criterio que
// getWeekSessions() al ordenar la semana.
function selectCalendarDay(date) {

    const sessions = getSessionsForDate(date).sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));
    const first = sessions[0];

    setSelectedWorkout(first ? getSessionById(first.id) : null);

    rerender();

}

function startMoveSession(sessionId) {

    setMovingSessionId(sessionId);
    rerender();

}

function cancelMoveSession() {

    setMovingSessionId(null);
    rerender();

}

// Confirma el movimiento nada más tocar el día destino — sin paso de
// confirmación aparte, mismo criterio que tocar un día en el timeline
// normal ya cambia la sesión mostrada sin preguntar. La semana en la
// que se ejecuta ya es la que el usuario ha elegido deslizando, así
// que no hace falta tocar viewedWeekStart aquí.
function moveSessionTo(date) {

    const sessionId = getMovingSessionId();
    if (!sessionId) return;

    const moved = movePlannedSession(sessionId, date);

    setMovingSessionId(null);
    setSelectedWorkout(moved ? getSessionById(moved.id) : null);

    rerender();

}

const WEEK_SWIPE_THRESHOLD_PX = 50;
const HORIZONTAL_INTENT_PX = 10;

// Deslizar la tira de días cambia de semana — deslizar hacia la
// izquierda avanza (semana siguiente), hacia la derecha retrocede,
// misma convención que un carrusel/calendario. .plan-timeline lleva
// touch-action:pan-y (PlanTimeline.css) para que el navegador siga
// gestionando el scroll vertical de la página tal cual, sin que este
// listener tenga que pelear por él — solo se intercepta (preventDefault)
// el gesto una vez confirmado que es predominantemente horizontal.
function initTimelineSwipe() {

    // Escopado a .plan-page: PlanTimeline también se reutiliza dentro del
    // selector de día de Home (SessionCard.js) para elegir la sesión del
    // día — ahí no debe cambiar de semana al deslizar, solo en Plan.
    const timeline = document.querySelector(".plan-page .plan-timeline");
    if (!timeline) return;

    let startX = null;
    let startY = null;
    let isHorizontal = false;

    timeline.addEventListener("touchstart", event => {

        const touch = event.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        isHorizontal = false;

    }, { passive: true });

    timeline.addEventListener("touchmove", event => {

        if (startX == null) return;

        const touch = event.touches[0];
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;

        if (!isHorizontal && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > HORIZONTAL_INTENT_PX) {
            isHorizontal = true;
        }

        if (isHorizontal) {
            event.preventDefault();
        }

    }, { passive: false });

    timeline.addEventListener("touchend", event => {

        if (startX == null) return;

        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - startX;

        if (isHorizontal && Math.abs(deltaX) > WEEK_SWIPE_THRESHOLD_PX) {
            changeViewedWeek(deltaX < 0 ? 1 : -1);
        }

        startX = null;
        startY = null;
        isHorizontal = false;

    });

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

    importPlannedSessions(plan.sessions).then(({ written, batchId }) => {

        setImportSavedCount(written);
        setImportSavedBatchId(batchId);
        setImportSaveError(null);
        setImportStep("success");
        rerender();

    });

}

// La tarjeta de detalle solo muestra la sesión seleccionada — al
// borrarla, esa selección queda apuntando a un id que ya no existe.
// Se limpia siempre (no solo si coincide) porque en la práctica
// siempre coincide: no hay otra forma de llegar a este botón que
// viendo ya esa misma sesión. Plan() recalcula un valor por defecto
// razonable (hoy, o la primera de la semana) en el siguiente render.
function deleteSession(id) {

    if (!window.confirm("¿Borrar esta sesión del plan? No se puede deshacer.")) return;

    deletePlannedSession(id);
    setSelectedWorkout(null);

    rerender();

}

// Deshace de golpe la importación que se acaba de guardar — solo
// disponible desde la propia pantalla de éxito del wizard, con el
// batchId que importPlannedSessions() acaba de devolver (ver
// performPlanImport). Limpia la selección por la misma razón que
// deleteSession(): tras cerrar el wizard, cualquier selección previa
// pudo quedar obsoleta.
function undoPlanImport(batchId) {

    if (!batchId) return;

    if (!window.confirm("¿Deshacer esta importación? Se borrarán todas las sesiones que se acaban de guardar. No se puede deshacer.")) return;

    deletePlannedSessionsByBatch(batchId);
    setSelectedWorkout(null);

    closePlanImport();

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

    initTimelineSwipe();

    document.querySelectorAll('[data-action="toggle-plan-view"]').forEach(button => {

        button.addEventListener("click", togglePlanView);

    });

    document.querySelectorAll('[data-action="calendar-prev-month"]').forEach(button => {

        button.addEventListener("click", () => changeViewedMonth(-1));

    });

    document.querySelectorAll('[data-action="calendar-next-month"]').forEach(button => {

        button.addEventListener("click", () => changeViewedMonth(1));

    });

    document.querySelectorAll('[data-action="select-plan-calendar-day"]').forEach(day => {

        day.addEventListener("click", () => {
            selectCalendarDay(day.dataset.date);
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

    document.querySelectorAll('[data-action="view-session-workout"]').forEach(button => {

        button.addEventListener("click", () => {
            viewSessionWorkout(button.dataset.workoutId);
        });

    });

    document.querySelectorAll('[data-action="confirm-plan-import"]').forEach(button => {

        button.addEventListener("click", performPlanImport);

    });

    document.querySelectorAll('[data-action="start-move-session"]').forEach(button => {

        button.addEventListener("click", () => {
            startMoveSession(button.dataset.sessionId);
        });

    });

    document.querySelectorAll('[data-action="cancel-move-session"]').forEach(button => {

        button.addEventListener("click", cancelMoveSession);

    });

    document.querySelectorAll('[data-action="move-session-to"]').forEach(day => {

        day.addEventListener("click", () => {
            moveSessionTo(day.dataset.date);
        });

    });

    document.querySelectorAll('[data-action="delete-planned-session"]').forEach(button => {

        button.addEventListener("click", () => {
            deleteSession(button.dataset.sessionId);
        });

    });

    document.querySelectorAll('[data-action="undo-plan-import"]').forEach(button => {

        button.addEventListener("click", () => {
            undoPlanImport(button.dataset.batchId);
        });

    });

    document.querySelectorAll(".review-textarea").forEach(textarea => {

        autoResizeTextarea(textarea);
        textarea.addEventListener("input", () => autoResizeTextarea(textarea));

    });

}
