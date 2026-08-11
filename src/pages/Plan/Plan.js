import "./Plan.css";

import { PlanHeader } from "./components/PlanHeader";
import { PlanTimeline } from "./components/PlanTimeline";
import { PlanConnector } from "./components/PlanConnector";
import { PlanWorkoutCard } from "./components/PlanWorkoutCard";
import { PlanImportWizard } from "./components/PlanImportWizard.js";

import { getSelectedWorkout } from "./planStore";
import { getImportStep } from "./planImportStore.js";
import { getCurrentWeekSessions } from "../../data/workoutStore.js";
import { BottomNavigation } from "../../components/Navigation/BottomNavigation.js";

function PlanEmptyState() {

    return `

        <section class="plan-page plan-empty-state">

            <h1>PLAN</h1>

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

    if (getCurrentWeekSessions().length === 0) {
        return PlanEmptyState();
    }

    const selectedWorkout = getSelectedWorkout();

    return `

        <section class="plan-page">

            ${PlanHeader(PlanTimeline(selectedWorkout))}

            ${PlanConnector()}

            ${PlanWorkoutCard(selectedWorkout)}

        </section>

        ${BottomNavigation()}

    `;

}