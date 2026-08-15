import "./Plan.css";

import { PlanHeader } from "./components/PlanHeader";
import { PlanTimeline } from "./components/PlanTimeline";
import "./components/PlanTimeline.css";
import { PlanConnector } from "./components/PlanConnector";
import { PlanWorkoutCard } from "./components/PlanWorkoutCard";
import { PlanImportWizard } from "./components/PlanImportWizard.js";

import { getSelectedWorkout, getViewedWeekStart } from "./planStore";
import { getImportStep } from "./planImportStore.js";
import { getWeekSessions } from "../../data/workoutStore.js";
import { BottomNavigation } from "../../components/Navigation/BottomNavigation.js";
import { parseISODate, addDays, formatDayMonth, getISOWeekNumber } from "../../utils/date.js";

// Lleva su propia tira vacía (misma clase .plan-timeline que
// PlanTimeline, sin días dentro) para que el swipe de cambio de semana
// (ver initTimelineSwipe() en initPlanEvents.js) siga funcionando ahí —
// si no, "Importar plan" sería la única salida de una semana vacía.
function PlanEmptyState(weekStartDate) {

    const weekNumber = getISOWeekNumber(parseISODate(weekStartDate));
    const dateRange = `${formatDayMonth(weekStartDate)} · ${formatDayMonth(addDays(weekStartDate, 6))}`;

    return `

        <section class="plan-page plan-empty-state">

            <h1>PLAN</h1>

            <div class="plan-empty-week">

                <span class="plan-empty-week-number">

                    SEMANA ${weekNumber}

                </span>

                <span class="plan-empty-week-date">

                    ${dateRange}

                </span>

            </div>

            <div class="plan-timeline plan-timeline--empty"></div>

            <iconify-icon icon="solar:calendar-add-bold-duotone"></iconify-icon>

            <p>Todavía no has importado ningún plan para esta semana.</p>

            <button class="wizard-primary-button" data-action="open-plan-import">

                Importar plan

            </button>

        </section>

        ${BottomNavigation()}

    `;

}

export function Plan() {

    // El wizard de importación se superpone a la pantalla normal de Plan
    // (mismo patrón que "shoes"/"historyTable" en Running) en vez de vivir
    // en su propia ruta — así el gesto de atrás del móvil puede cerrarlo
    // sin salir de la app.
    if (getImportStep() !== "closed") {

        return `

            <section class="plan-page">

                ${PlanImportWizard()}

            </section>

            ${BottomNavigation()}

        `;

    }

    const viewedWeekStart = getViewedWeekStart();
    const sessions = getWeekSessions(viewedWeekStart);

    if (sessions.length === 0) {
        return PlanEmptyState(viewedWeekStart);
    }

    const selectedWorkout = getSelectedWorkout();

    return `

        <section class="plan-page">

            ${PlanHeader(viewedWeekStart, sessions, PlanTimeline(selectedWorkout, sessions))}

            ${PlanConnector()}

            ${PlanWorkoutCard(selectedWorkout)}

        </section>

        ${BottomNavigation()}

    `;

}