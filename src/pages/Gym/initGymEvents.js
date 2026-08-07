import { rerender } from "../../core/router.js";
import { startSession, updateSet, finishSession, getSessionById, hydrate } from "../../data/gymSessionStore.js";
import { getActiveSessionId, setActiveSessionId, setStep } from "./gymStore.js";

const WEIGHT_STEP = 2.5;
const REPS_STEP = 1;

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

}
