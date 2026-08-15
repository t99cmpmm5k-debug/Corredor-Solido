import "./Plan.css";

import { PlanHeader } from "./components/PlanHeader";
import { PlanTimeline } from "./components/PlanTimeline";
import { PlanConnector } from "./components/PlanConnector";
import { PlanWorkoutCard } from "./components/PlanWorkoutCard";
import { PlanImportWizard } from "./components/PlanImportWizard.js";
import { PlanWeekNav } from "./components/PlanWeekNav.js";

import { getSelectedWorkout, getViewedWeekStart } from "./planStore";
import { getImportStep } from "./planImportStore.js";
import { getWeekSessions } from "../../data/workoutStore.js";
import { BottomNavigation } from "../../components/Navigation/BottomNavigation.js";
import { parseISODate, addDays, formatDayMonth, getISOWeekNumber } from "../../utils/date.js";

// Lleva sus propias flechas de semana (mismo componente que PlanHeader)
// para no dejar al usuario atrapado si navega a una semana vacía —
// si no, "Importar plan" sería la única salida.
function PlanEmptyState(weekStartDate) {

    const weekNumber = getISOWeekNumber(parseISODate(weekStartDate));
    const dateRange = `${formatDayMonth(weekStartDate)} · ${formatDayMonth(addDays(weekStartDate, 6))}`;

    return `

        <section class="plan-page plan-empty-state">

            <h1>PLAN</h1>

            ${PlanWeekNav(weekNumber, dateRange)}

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