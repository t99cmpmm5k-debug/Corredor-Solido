import { rerender } from "../../core/router.js";
import { startSession, updateSet, updateExerciseNotes, finishSession, getSessionById, deleteSession, hydrate, getPreviousExerciseSummary } from "../../data/gymSessionStore.js";
import { getRoutineById, createRoutine, updateRoutine, deleteRoutine, getGymDay } from "../../data/gymRoutineStore.js";
import { addCustomExercise } from "../../data/customExerciseStore.js";
import { getAllExercises } from "./exerciseSearch.js";

import {
    getActiveSessionId,
    setActiveSessionId,
    getStep,
    setStep,
    getCurrentExerciseIndex,
    setCurrentExerciseIndex,
    isRestRunning,
    getRestRemainingSec,
    getRestDurationSec,
    startRestTimer,
    stopRestTimer,
    adjustRestTimer,
    REST_STEP_SEC,
    setDetailExerciseId,
    setDetailTab,
    getDetailExpandedSessionId,
    setDetailExpandedSessionId,
    resetExerciseDetail,
    toggleWeekSummaryExpanded,
    getHighlightedDayId,
    setHighlightedDayId,
    getRoutineMenuOpenId,
    setRoutineMenuOpenId,
    getEditingCell,
    setEditingCell,
    clearEditingCell,
    setExerciseCompletionOverlay,
    clearExerciseCompletionOverlay,
    isRestCriticalNotified,
    setRestCriticalNotified
} from "./gymStore.js";

import {
    isBuilderOpen,
    getBuilderState,
    openBuilder,
    closeBuilder,
    setRoutineName,
    setProgressionNote,
    setSaveError,
    addDay,
    removeDay,
    setDayTitle,
    setDayWeekday,
    openExercisePicker,
    closeExercisePicker,
    setPickerQuery,
    setPickerFilter,
    addExerciseToDay,
    removeExerciseFromDay,
    updateExerciseField
} from "./gymRoutineBuilderStore.js";

const WEIGHT_STEP = 2.5;
const REPS_STEP = 1;

const GYM_BUILDER_HISTORY_STATE = { gymBuilder: true };
const GYM_EXERCISE_DETAIL_HISTORY_STATE = { gymExerciseDetail: true };

// Igual que openPlanImport() en initPlanEvents.js — su propia entrada de
// historial para que el gesto de atrás del móvil cierre el constructor en
// vez de salir de la app. Exportada: la reutiliza también "Editar rutina"
// desde la tarjeta de detalle de gimnasio en Plan (ver
// initPlanEvents.js/PlanGymDayCard.js) -- mismo flujo exacto que editar
// una rutina desde la propia lista de Gimnasio, sin duplicar el
// pushState/rerender.
export function openRoutineBuilder(routine = null) {

    openBuilder(routine);
    history.pushState(GYM_BUILDER_HISTORY_STATE, "");

    rerender();

}

function closeRoutineBuilder() {

    if (history.state?.gymBuilder) {
        history.back();
        return;
    }

    closeBuilder();
    rerender();

}

// Igual que openExerciseDetail — su propia entrada de historial para que
// el gesto de atrás del móvil cierre el detalle en vez de salir de la app.
function openExerciseDetail(exerciseId) {

    setDetailExerciseId(exerciseId);
    setDetailTab("historial");
    setDetailExpandedSessionId(null);
    setStep("exercise-detail");

    history.pushState(GYM_EXERCISE_DETAIL_HISTORY_STATE, "");

    rerender();

}

function closeExerciseDetail() {

    if (history.state?.gymExerciseDetail) {
        history.back();
        return;
    }

    resetExerciseDetail();

    // Solo se llega aquí desde dentro de una sesión (ver GymSessionView.js)
    // — cerrar siempre vuelve a ella, no a la selección de día.
    setStep("session");
    rerender();

}

// Registrado una sola vez a nivel de módulo (no dentro de initGymEvents,
// que se vuelve a llamar en cada render) — mismo motivo que el listener
// equivalente de initPlanEvents.js.
window.addEventListener("popstate", () => {

    if (isBuilderOpen()) {
        closeBuilder();
        rerender();
        return;
    }

    if (getStep() === "exercise-detail") {
        resetExerciseDetail();
        setStep("session");
        rerender();
    }

});

// Cierra el menú "···" de una rutina al tocar fuera de él -- mismo patrón
// que el equivalente de Carreras/Running, registrado una sola vez a nivel
// de módulo (initGymEvents se vuelve a llamar en cada render y apilaría un
// listener nuevo cada vez sin desengancharse).
document.addEventListener("click", event => {

    if (!getRoutineMenuOpenId()) return;
    if (event.target.closest(".gym-routine-menu")) return;

    setRoutineMenuOpenId(null);
    rerender();

});

const GYM_DAY_HIGHLIGHT_MS = 1600;

// Arranca o retoma (startSession ya tiene el checkpoint por dayId+fecha,
// terminada o no, ver gymSessionStore.js) la sesión de un día y deja la
// pantalla en la vista de sesión -- exactamente lo mismo que tocar la fila
// del día a mano en Gimnasio (ver "select-day" más abajo, que ahora reutiliza
// esta misma función). También es el mecanismo para "ver el resumen de una
// sesión ya terminada hoy": no hay una pantalla de solo-lectura aparte
// (ver openGymDay más abajo) -- reabrir vía startSession() muestra
// exactamente lo registrado (ejercicios, series, reps, peso), reutilizando
// GymSessionView tal cual en vez de construir una vista nueva.
export function openDaySession(dayId) {

    return hydrate().then(() => {

        const session = startSession(dayId);
        if (!session) return;

        setActiveSessionId(session.id);
        setCurrentExerciseIndex(0);
        stopRestTimer();
        setStep("session");
        rerender();

    });

}

// Llamada desde Plan (ver viewGymDay() en initPlanEvents.js) al tocar un
// día de gimnasio en la línea temporal semanal.
// - Sin completar: resalta y deja a la vista esa fila en la lista de
//   rutinas, sin arrancar la sesión por sí solo -- eso sigue siendo una
//   acción explícita del usuario, no algo que un tap en Plan deba
//   disparar. El resaltado se limpia solo, ver initGymEvents() más abajo.
// - Ya completado hoy: la sesión ya existe (terminada), así que abrirla
//   directamente con openDaySession() no "arranca" nada nuevo, solo
//   muestra lo ya registrado -- aquí sí tiene sentido saltar directo, es
//   el equivalente de "ver detalle" que Running ya tiene para un workout
//   real (viewSessionWorkout() en initPlanEvents.js).
export function openGymDay(dayId, { completed = false } = {}) {

    if (completed) {
        openDaySession(dayId);
        return;
    }

    setHighlightedDayId(dayId);
    rerender();

}

function saveRoutine() {

    const state = getBuilderState();
    if (!state) return;

    const name = state.name.trim();

    if (!name) {
        setSaveError("Ponle un nombre a la rutina antes de guardar.");
        rerender();
        return;
    }

    if (!state.days.length || state.days.every(day => day.exercises.length === 0)) {
        setSaveError("Añade al menos un día con un ejercicio antes de guardar.");
        rerender();
        return;
    }

    const payload = { name, days: state.days, progressionNote: state.progressionNote.trim() };

    const saved = state.routineId
        ? Promise.resolve(updateRoutine(state.routineId, payload))
        : createRoutine(payload);

    Promise.resolve(saved).then(() => {

        closeBuilder();
        rerender();

    });

}

function deleteRoutineWithConfirm(id) {

    if (!window.confirm("¿Borrar esta rutina? No se puede deshacer.")) return;

    deleteRoutine(id);
    rerender();

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

function modeOfReps(values) {

    const counts = new Map();
    let best = values[0];
    let bestCount = 0;

    for (const value of values) {

        const count = (counts.get(value) || 0) + 1;
        counts.set(value, count);

        if (count > bestCount) {
            bestCount = count;
            best = value;
        }

    }

    return best;

}

// Datos de la tarjeta "ejercicio completado" (Fase 2.5) -- solo para
// ejercicios con peso (weightUnit), mismo criterio que el resto de
// historial de gimnasio: sin peso no hay progresión que comparar. null si
// no hay ninguna serie con peso+reps marcada (no debería pasar si se llama
// justo tras completar la última serie, pero por si el ejercicio no tiene
// weightUnit).
function buildExerciseCompletionSummary(session, definition, sessionExercise) {

    if (!definition.weightUnit) return null;

    const doneSets = sessionExercise.sets.filter(set => set.done && set.weight != null && set.reps != null);
    if (!doneSets.length) return null;

    const todayWeight = Math.max(...doneSets.map(set => set.weight));
    const todayReps = modeOfReps(doneSets.map(set => set.reps));

    const excludeSessionId = session.finishedAt ? null : session.id;
    const previous = getPreviousExerciseSummary(definition.id, { excludeSessionId });

    return {
        exerciseId: definition.id,
        title: definition.name,
        weightUnit: definition.weightUnit,
        today: { weight: todayWeight, reps: todayReps },
        previous: previous ? { weight: previous.weight, reps: previous.reps } : null,
        delta: previous ? Math.round((todayWeight - previous.weight) * 10) / 10 : null
    };

}

const EXERCISE_COMPLETE_AUTO_ADVANCE_MS = 2200;
let exerciseCompleteAdvanceTimer = null;

function clearExerciseCompleteAdvanceTimer() {

    if (exerciseCompleteAdvanceTimer) {
        clearTimeout(exerciseCompleteAdvanceTimer);
        exerciseCompleteAdvanceTimer = null;
    }

}

// Cierra la tarjeta y avanza al siguiente ejercicio -- llamada tanto por el
// avance automático como por tocar la propia tarjeta para saltarlo antes.
// En el último ejercicio no hay a dónde avanzar: simplemente se cierra.
function advanceAfterExerciseComplete() {

    clearExerciseCompletionOverlay();

    const session = getSessionById(getActiveSessionId());

    if (session) {
        const lastIndex = session.exercises.length - 1;
        setCurrentExerciseIndex(Math.min(lastIndex, getCurrentExerciseIndex() + 1));
    }

    stopRestTimer();
    rerender();

}

function toggleDone(exerciseId, setIndex) {

    const set = currentSet(exerciseId, setIndex);
    if (!set) return;

    const nextDone = !set.done;

    updateSet(getActiveSessionId(), exerciseId, setIndex, { done: nextDone });
    clearEditingCell();

    // Autoarranca el descanso solo al completar una serie, no al
    // desmarcarla — decisión de producto confirmada con el usuario (ver
    // gymStore.js).
    if (nextDone) {

        startRestTimer();

        const session = getSessionById(getActiveSessionId());
        const sessionExercise = session?.exercises.find(e => e.exerciseId === exerciseId);

        if (session && sessionExercise && sessionExercise.sets.every(s => s.done)) {

            const day = getGymDay(session.dayId);
            const definition = day?.exercises.find(e => e.id === exerciseId);
            const summary = definition ? buildExerciseCompletionSummary(session, definition, sessionExercise) : null;

            if (summary) {

                setExerciseCompletionOverlay(summary);

                clearExerciseCompleteAdvanceTimer();
                exerciseCompleteAdvanceTimer = setTimeout(() => {
                    exerciseCompleteAdvanceTimer = null;
                    advanceAfterExerciseComplete();
                }, EXERCISE_COMPLETE_AUTO_ADVANCE_MS);

            }

        }

    }

    rerender();

}

const REST_CRITICAL_SEC = 10;
const REST_READY_DISPLAY_MS = 900;

// true mientras se muestra "LISTO" a la espera de que el widget desaparezca
// -- evita que un tick de por medio (el intervalo sigue corriendo cada
// segundo) reinicie la cuenta atrás mostrando otra vez el mm:ss.
let restFinishing = false;

function vibrate(pattern) {

    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(pattern);
    }

}

// Actualiza el conteo del descanso directamente sobre el DOM ya pintado,
// sin pasar por rerender() — así no se repinta la página entera (y no se
// pierde el foco de las notas, por ejemplo) solo porque pasa un segundo.
// Últimos 10s (Fase 2.4): cambio de intensidad visual + vibración corta,
// una sola vez al entrar en la zona crítica (ver isRestCriticalNotified()/
// gymStore.js). Al llegar a 0: "LISTO" + vibración distinta, visible un
// momento antes de que el widget desaparezca (ahí sí hace falta un
// rerender(), ver isRestRunning() en gymStore.js).
function tickRestTimerDisplay() {

    if (restFinishing) return;

    const remainingEl = document.querySelector("#gym-rest-remaining");
    const fillEl = document.querySelector("#gym-rest-fill");
    const timerEl = document.querySelector(".gym-rest-timer");
    if (!remainingEl || !fillEl || !timerEl) return;

    const remaining = getRestRemainingSec();

    if (remaining <= 0) {

        restFinishing = true;

        remainingEl.textContent = "LISTO";
        fillEl.style.width = "100%";
        timerEl.classList.remove("is-critical");
        timerEl.classList.add("is-ready");

        vibrate([120, 60, 120]);

        setTimeout(() => {
            restFinishing = false;
            stopRestTimer();
            rerender();
        }, REST_READY_DISPLAY_MS);

        return;

    }

    const duration = getRestDurationSec();
    const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
    const ss = String(remaining % 60).padStart(2, "0");

    remainingEl.textContent = `${mm}:${ss}`;
    fillEl.style.width = `${Math.round((remaining / duration) * 100)}%`;

    if (remaining <= REST_CRITICAL_SEC) {

        timerEl.classList.add("is-critical");

        if (!isRestCriticalNotified()) {
            setRestCriticalNotified(true);
            vibrate(80);
        }

    } else {

        timerEl.classList.remove("is-critical");
        setRestCriticalNotified(false);

    }

}

// Registrado una sola vez a nivel de módulo (no dentro de initGymEvents,
// que se vuelve a llamar en cada render) — mismo motivo que el listener
// de popstate más arriba: si no, cada repintado añadiría otro intervalo y
// el conteo se aceleraría solo con navegar por la app.
setInterval(() => {

    if (isRestRunning()) tickRestTimerDisplay();

}, 1000);

function wireStepper(action, handler) {

    document.querySelectorAll(`[data-action="${action}"]`).forEach(button => {

        button.addEventListener("click", () => {

            handler(button.dataset.exerciseId, Number(button.dataset.setIndex));

        });

    });

}

// Mismo hueco que .gym-content reserva como padding-bottom (ver Gym.css,
// misma convención que el resto de páginas) para la barra de navegación
// inferior (position:fixed). scrollIntoView({block:"center"}) centra en el
// viewport COMPLETO sin saber que sus últimos ~110px están tapados por la
// barra -- confirmado con Playwright/WebKit contra el sitio ya desplegado:
// la fila resaltada quedaba centrada justo debajo de la barra, invisible
// en la práctica aunque is-highlighted sí se aplicaba. Se calcula el
// scroll a mano centrando dentro del área realmente visible en vez de
// depender de scroll-margin (probado también, mismo resultado incorrecto
// en WebKit con block:"center").
const BOTTOM_NAV_RESERVED_PX = 110;

function scrollToHighlightedDay() {

    const row = document.querySelector(".gym-day-row.is-highlighted");
    if (!row) return;

    const rect = row.getBoundingClientRect();
    const visibleHeight = window.innerHeight - BOTTOM_NAV_RESERVED_PX;
    const targetY = window.scrollY + rect.top - (visibleHeight / 2 - rect.height / 2);

    window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });

}

export function initGymEvents() {

    const highlightedDayId = getHighlightedDayId();

    if (highlightedDayId) {

        scrollToHighlightedDay();

        // Un solo resaltado -- se limpia después de mostrarse una vez, no
        // debe seguir marcado en visitas posteriores a Gimnasio.
        setTimeout(() => {
            setHighlightedDayId(null);
            rerender();
        }, GYM_DAY_HIGHLIGHT_MS);

    }

    document.querySelectorAll('[data-action="select-day"]').forEach(card => {

        card.addEventListener("click", () => {

            // main.js arranca la app sin esperar a que termine la
            // hidratación (a propósito, para no bloquear el arranque si
            // IndexedDB tarda) — si el móvil recargó la pestaña (pantalla
            // bloqueada entre series) y se toca un día antes de que
            // gymSessionStore haya cargado lo ya guardado, startSession()
            // no encontraba la sesión de hoy y creaba otra desde cero,
            // perdiendo de vista los pesos ya registrados. openDaySession()
            // espera a hydrate() (memoizado) antes de tocar nada por esto.
            openDaySession(card.dataset.dayId);

        });

    });

    document.querySelectorAll('[data-action="close-session"]').forEach(button => {

        button.addEventListener("click", () => {

            // Todo lo marcado como hecho ya está autoguardado — cerrar aquí
            // no pierde nada, solo saca de la pantalla de sesión.
            setActiveSessionId(null);
            stopRestTimer();
            clearEditingCell();
            clearExerciseCompleteAdvanceTimer();
            clearExerciseCompletionOverlay();
            setStep("select-day");
            rerender();

        });

    });

    // "Finalizar entrenamiento" (Fase 2.7): guarda de verdad (finishSession
    // calcula la duración real ahí mismo, con el reloj todavía fresco) y
    // pasa a la pantalla de resumen -- la sesión activa se queda puesta
    // (GymSessionSummaryView la necesita, ver Gym.js) hasta que se confirme
    // con "Guardar entrenamiento" (ver save-session-summary más abajo).
    document.querySelectorAll('[data-action="finish-session"]').forEach(button => {

        button.addEventListener("click", () => {

            const id = getActiveSessionId();
            if (id) finishSession(id);

            stopRestTimer();
            clearEditingCell();
            clearExerciseCompleteAdvanceTimer();
            clearExerciseCompletionOverlay();
            setStep("session-summary");
            rerender();

        });

    });

    document.querySelectorAll('[data-action="save-session-summary"]').forEach(button => {

        button.addEventListener("click", () => {

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

    // Tocar el valor de Kg/Reps de una serie abre su stepper +/- en el
    // sitio (Fase 2.1) -- solo una celda a la vez en toda la pantalla, ver
    // isEditingCell()/gymStore.js. Tocar la MISMA celda otra vez la cierra
    // sin necesidad de un botón "hecho" aparte.
    document.querySelectorAll('[data-action="edit-set-cell"]').forEach(button => {

        button.addEventListener("click", () => {

            const cell = { exerciseId: button.dataset.exerciseId, setIndex: Number(button.dataset.setIndex), field: button.dataset.field };
            const current = getEditingCell();

            const isSameCell = current
                && current.exerciseId === cell.exerciseId
                && current.setIndex === cell.setIndex
                && current.field === cell.field;

            setEditingCell(isSameCell ? null : cell);
            rerender();

        });

    });

    // Tocar la tarjeta "ejercicio completado" (o esperar el avance
    // automático programado en toggleDone()) la cierra y pasa al siguiente
    // ejercicio.
    document.querySelectorAll('[data-action="dismiss-exercise-complete"]').forEach(overlay => {

        overlay.addEventListener("click", () => {

            clearExerciseCompleteAdvanceTimer();
            advanceAfterExerciseComplete();

        });

    });

    document.querySelectorAll('[data-action="prev-exercise"]').forEach(button => {

        button.addEventListener("click", () => {

            setCurrentExerciseIndex(Math.max(0, getCurrentExerciseIndex() - 1));

            // El descanso pertenece al ejercicio que se acaba de dejar —
            // seguir contando bajo un ejercicio distinto confundiría más
            // de lo que ayuda.
            stopRestTimer();
            clearEditingCell();
            rerender();

        });

    });

    document.querySelectorAll('[data-action="next-exercise"]').forEach(button => {

        button.addEventListener("click", () => {

            const session = getSessionById(getActiveSessionId());
            if (!session) return;

            const lastIndex = session.exercises.length - 1;
            setCurrentExerciseIndex(Math.min(lastIndex, getCurrentExerciseIndex() + 1));
            stopRestTimer();
            clearEditingCell();
            rerender();

        });

    });

    document.querySelectorAll('[data-action="update-notes"]').forEach(textarea => {

        // "change" (al perder el foco), no "input" — así no se repinta la
        // página en cada pulsación mientras el usuario está escribiendo.
        textarea.addEventListener("change", () => {

            updateExerciseNotes(getActiveSessionId(), textarea.dataset.exerciseId, textarea.value);

        });

    });

    document.querySelectorAll('[data-action="rest-skip"]').forEach(button => {

        button.addEventListener("click", () => {

            stopRestTimer();
            rerender();

        });

    });

    document.querySelectorAll('[data-action="rest-add"]').forEach(button => {

        button.addEventListener("click", () => {

            adjustRestTimer(REST_STEP_SEC);
            tickRestTimerDisplay();

        });

    });

    document.querySelectorAll('[data-action="rest-subtract"]').forEach(button => {

        button.addEventListener("click", () => {

            adjustRestTimer(-REST_STEP_SEC);
            tickRestTimerDisplay();

        });

    });

    document.querySelectorAll('[data-action="open-exercise-detail"]').forEach(button => {

        button.addEventListener("click", () => {
            openExerciseDetail(button.dataset.exerciseId);
        });

    });

    document.querySelectorAll('[data-action="close-exercise-detail"]').forEach(button => {

        button.addEventListener("click", closeExerciseDetail);

    });

    document.querySelectorAll('[data-action="set-exercise-detail-tab"]').forEach(button => {

        button.addEventListener("click", () => {

            setDetailTab(button.dataset.tab);
            setDetailExpandedSessionId(null);
            rerender();

        });

    });

    document.querySelectorAll('[data-action="toggle-history-row"]').forEach(button => {

        button.addEventListener("click", () => {

            const sessionId = button.dataset.sessionId;
            setDetailExpandedSessionId(getDetailExpandedSessionId() === sessionId ? null : sessionId);
            rerender();

        });

    });

    // TODO: sustituir este confirm() nativo por el patrón "pulsa otra vez
    // para confirmar" — pendiente a propósito, mismo motivo que
    // delete-workout en Running (ver initRunningEvents.js).
    document.querySelectorAll('[data-action="delete-gym-session"]').forEach(button => {

        button.addEventListener("click", () => {

            if (!window.confirm("¿Borrar esta sesión? No se puede deshacer.")) return;

            deleteSession(button.dataset.sessionId);
            setDetailExpandedSessionId(null);
            rerender();

        });

    });

    document.querySelectorAll('[data-action="toggle-week-summary"]').forEach(button => {

        button.addEventListener("click", () => {
            toggleWeekSummaryExpanded();
            rerender();
        });

    });

    /*==========================
        RUTINAS: crear / editar / borrar
    ==========================*/

    document.querySelectorAll('[data-action="open-routine-builder"]').forEach(button => {

        button.addEventListener("click", () => openRoutineBuilder());

    });

    document.querySelectorAll('[data-action="edit-gym-routine"]').forEach(button => {

        button.addEventListener("click", event => {

            // Vive dentro del menú "···" (ver RoutineMenu() en Gym.js) --
            // sin esto, y sin cerrar el menú antes de abrir el constructor,
            // volver de editar (isBuilderOpen() a false) reabriría el menú
            // solo porque su id seguía guardado en el store.
            event.stopPropagation();
            setRoutineMenuOpenId(null);

            const routine = getRoutineById(button.dataset.routineId);
            if (routine) openRoutineBuilder(routine);

        });

    });

    document.querySelectorAll('[data-action="delete-gym-routine"]').forEach(button => {

        button.addEventListener("click", event => {

            event.stopPropagation();
            setRoutineMenuOpenId(null);

            deleteRoutineWithConfirm(button.dataset.routineId);

        });

    });

    // Mismo motivo que toggle-history-menu en Running/toggle-race-card-menu
    // en Carreras: stopPropagation evita que el listener de "cerrar al
    // tocar fuera" (registrado a nivel de módulo, ver más abajo) se
    // dispare en el mismo click y cierre el menú justo al abrirlo.
    document.querySelectorAll('[data-action="toggle-routine-menu"]').forEach(button => {

        button.addEventListener("click", event => {

            event.stopPropagation();

            const id = button.dataset.routineId;
            setRoutineMenuOpenId(getRoutineMenuOpenId() === id ? null : id);
            rerender();

        });

    });

    document.querySelectorAll('[data-action="close-routine-builder"]').forEach(button => {

        button.addEventListener("click", closeRoutineBuilder);

    });

    document.querySelectorAll('[data-action="save-routine"]').forEach(button => {

        button.addEventListener("click", saveRoutine);

    });

    const routineNameInput = document.querySelector('[data-action="set-routine-name"]');
    if (routineNameInput) {
        routineNameInput.addEventListener("change", () => setRoutineName(routineNameInput.value));
    }

    const progressionNoteInput = document.querySelector('[data-action="set-progression-note"]');
    if (progressionNoteInput) {
        progressionNoteInput.addEventListener("change", () => setProgressionNote(progressionNoteInput.value));
    }

    document.querySelectorAll('[data-action="add-routine-day"]').forEach(button => {

        button.addEventListener("click", () => {
            addDay();
            rerender();
        });

    });

    document.querySelectorAll('[data-action="remove-routine-day"]').forEach(button => {

        button.addEventListener("click", () => {
            removeDay(button.dataset.dayId);
            rerender();
        });

    });

    document.querySelectorAll('[data-action="set-day-title"]').forEach(input => {

        input.addEventListener("change", () => {
            setDayTitle(input.dataset.dayId, input.value);
        });

    });

    document.querySelectorAll('[data-action="set-day-weekday"]').forEach(select => {

        select.addEventListener("change", () => {
            setDayWeekday(select.dataset.dayId, select.value);
            // A diferencia de set-day-title: el aviso de "día ya ocupado"
            // (ver findConflictingRoutineName() en GymRoutineBuilder.js)
            // depende de qué weekday esté elegido AHORA MISMO, así que sí
            // hace falta repintar para que aparezca/desaparezca al momento,
            // no solo en el siguiente render que llegue por otro motivo.
            rerender();
        });

    });

    document.querySelectorAll('[data-action="remove-routine-exercise"]').forEach(button => {

        button.addEventListener("click", () => {
            removeExerciseFromDay(button.dataset.dayId, button.dataset.exerciseId);
            rerender();
        });

    });

    document.querySelectorAll('[data-action="set-exercise-sets"]').forEach(input => {

        input.addEventListener("change", () => {
            updateExerciseField(input.dataset.dayId, input.dataset.exerciseId, "sets", input.value);
        });

    });

    document.querySelectorAll('[data-action="set-exercise-reps"]').forEach(input => {

        input.addEventListener("change", () => {
            updateExerciseField(input.dataset.dayId, input.dataset.exerciseId, "targetReps", input.value);
        });

    });

    document.querySelectorAll('[data-action="set-exercise-weight"]').forEach(input => {

        input.addEventListener("change", () => {
            updateExerciseField(input.dataset.dayId, input.dataset.exerciseId, "targetWeight", input.value);
        });

    });

    /*==========================
        SELECTOR DE EJERCICIO
    ==========================*/

    document.querySelectorAll('[data-action="open-exercise-picker"]').forEach(button => {

        button.addEventListener("click", () => {
            openExercisePicker(button.dataset.dayId);
            rerender();
        });

    });

    document.querySelectorAll('[data-action="close-exercise-picker"]').forEach(button => {

        button.addEventListener("click", () => {
            closeExercisePicker();
            rerender();
        });

    });

    const pickerSearchInput = document.querySelector('[data-action="set-picker-query"]');
    if (pickerSearchInput) {

        pickerSearchInput.addEventListener("input", () => {
            setPickerQuery(pickerSearchInput.value);
            rerender();
        });

    }

    document.querySelectorAll('[data-action="set-picker-filter"]').forEach(button => {

        button.addEventListener("click", () => {
            setPickerFilter(button.dataset.filter);
            rerender();
        });

    });

    document.querySelectorAll('[data-action="pick-exercise"]').forEach(button => {

        button.addEventListener("click", () => {

            const exercise = getAllExercises().find(e => e.id === button.dataset.exerciseId);
            if (!exercise) return;

            addExerciseToDay(button.dataset.dayId, exercise);
            rerender();

        });

    });

    const customExerciseForm = document.querySelector('[data-action="add-custom-exercise-form"]');
    if (customExerciseForm) {

        customExerciseForm.addEventListener("submit", event => {

            event.preventDefault();

            const formData = new FormData(customExerciseForm);
            const name = formData.get("name")?.toString().trim();
            const muscleGroup = formData.get("muscleGroup")?.toString().trim();
            if (!name || !muscleGroup) return;

            const exercise = addCustomExercise({ name, muscleGroup });
            addExerciseToDay(customExerciseForm.dataset.dayId, exercise);
            rerender();

        });

    }

}
