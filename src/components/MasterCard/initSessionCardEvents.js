import { getState, setState } from "../../core/state.js";
import { rerender, navigate } from "../../core/router.js";
import { Running } from "../../pages/Running/Running.js";
import { openDetail as openRunningDetail } from "../../pages/Running/initRunningEvents.js";
import { Gym } from "../../pages/Gym/Gym.js";
import { openDaySession, openGymDay } from "../../pages/Gym/initGymEvents.js";
import { getSessionById } from "../../data/workoutStore.js";

// Selector de día propio de Inicio (el "Cambiar" de SessionCard.js,
// PlanTimeline dentro de .session-week-picker) -- escrito aparte del
// listener equivalente de Plan (ver initPlanEvents.js, escopado a
// .plan-page) para que tocar un día AQUÍ guarde en homeSelectedWorkout
// (state.js), nunca en selectedWorkout (el de Plan). Un día de gimnasio
// sigue saltando a Gimnasio igual que en Plan -- eso no es lo que
// generaba el bug real. Un "Descanso" de verdad aquí no abre el
// formulario de creación de Plan a propósito: este selector es solo
// para elegir qué sesión de la semana previsualizar en Inicio, no para
// crear una nueva -- y como el propio panel de creación vive en la
// pantalla de Plan, abrirlo desde aquí no se vería en ningún sitio hasta
// que el usuario navegara a Plan por su cuenta, una sorpresa igual de
// mala que el bug que se está corrigiendo.
function initHomeWeekPickerEvents() {

    document.querySelectorAll(".session-week-picker .timeline-day").forEach(day => {

        day.addEventListener("click", () => {

            const workout = getSessionById(day.dataset.sessionId);

            if (workout) {
                setState("homeSelectedWorkout", workout);
                // resetScroll: cambia el contenido de la tarjeta de arriba
                // de Inicio (mismo motivo que los dos toggles de más abajo).
                rerender({ resetScroll: true });
                return;
            }

            if (day.dataset.gymDayId) {
                navigate(Gym);
                openGymDay(day.dataset.gymDayId, { completed: day.dataset.gymCompleted === "true" });
            }

        });

    });

}

export function initSessionCardEvents() {

    initHomeWeekPickerEvents();

    // Cada botón se cablea por separado -- un early return compartido
    // dejaba el de "Cambiar" sin cablear en cualquier sesión sin
    // description (sin botón "Ver entrenamiento" que buscar primero).
    // resetScroll en los dos: cambian la altura de la tarjeta de arriba de
    // Inicio (RUNNING DE HOY), justo bajo el hero -- bug real reportado
    // 2026-08-29, el botón podía reaparecer superpuesto a la barra de
    // estado si se tocaba con la pantalla ya desplazada (mismo mecanismo
    // que resetScrollToTop() ya resolvía para navigate(), ver
    // scrollReset.js, pero rerender() no lo llamaba).
    const detailToggle = document.querySelector('[data-action="toggle-session-detail"]');
    if (detailToggle) {
        detailToggle.addEventListener("click", () => {
            setState("sessionDetailExpanded", !getState().sessionDetailExpanded);
            rerender({ resetScroll: true });
        });
    }

    const weekPickerToggle = document.querySelector('[data-action="toggle-week-picker"]');
    if (weekPickerToggle) {
        weekPickerToggle.addEventListener("click", () => {
            setState("weekPickerExpanded", !getState().weekPickerExpanded);
            rerender({ resetScroll: true });
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
