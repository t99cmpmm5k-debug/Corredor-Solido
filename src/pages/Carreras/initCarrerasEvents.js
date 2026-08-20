import { rerender, navigate } from "../../core/router.js";
import { openDetail as openRunningDetail } from "../Running/initRunningEvents.js";
import { Running } from "../Running/Running.js";
import { getSelectedDate, setSelectedDate, shiftViewedMonth } from "./carrerasStore.js";

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

}
