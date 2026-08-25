import { getState, setState } from "../../core/state.js";
import { rerender, navigate } from "../../core/router.js";
import { Running } from "../../pages/Running/Running.js";
import { openDetail as openRunningDetail } from "../../pages/Running/initRunningEvents.js";
import { Gym } from "../../pages/Gym/Gym.js";
import { openDaySession } from "../../pages/Gym/initGymEvents.js";

export function initSessionCardEvents() {

    // Cada botón se cablea por separado -- un early return compartido
    // dejaba el de "Cambiar" sin cablear en cualquier sesión sin
    // description (sin botón "Ver entrenamiento" que buscar primero).
    const detailToggle = document.querySelector('[data-action="toggle-session-detail"]');
    if (detailToggle) {
        detailToggle.addEventListener("click", () => {
            setState("sessionDetailExpanded", !getState().sessionDetailExpanded);
            rerender();
        });
    }

    const weekPickerToggle = document.querySelector('[data-action="toggle-week-picker"]');
    if (weekPickerToggle) {
        weekPickerToggle.addEventListener("click", () => {
            setState("weekPickerExpanded", !getState().weekPickerExpanded);
            rerender();
        });
    }

    // Mismo patrón que viewSessionWorkout() en Plan/initPlanEvents.js:
    // salta de página y, ya en Running, abre directamente el detalle del
    // workout real (nunca uno inventado -- ver comentario en
    // SessionCard.js sobre completedWorkoutId).
    const viewCompletedWorkoutButton = document.querySelector('[data-action="view-completed-workout"]');
    if (viewCompletedWorkoutButton) {
        viewCompletedWorkoutButton.addEventListener("click", () => {
            navigate(Running);
            openRunningDetail(viewCompletedWorkoutButton.dataset.workoutId);
        });
    }

    // "Empezar rutina" y "Ver resumen" del hueco de gimnasio (ver
    // GymTodayCard.js) hacen exactamente lo mismo -- openDaySession()
    // retoma la sesión de hoy si ya existe (terminada o no) en vez de
    // crear una nueva, así que "ver resumen" no es más que reabrir lo ya
    // registrado. Nunca coexisten los dos botones a la vez.
    const gymActionButton = document.querySelector('[data-action="start-gym-day"], [data-action="view-completed-gym-session"]');
    if (gymActionButton) {
        gymActionButton.addEventListener("click", () => {
            navigate(Gym);
            openDaySession(gymActionButton.dataset.dayId);
        });
    }

}
