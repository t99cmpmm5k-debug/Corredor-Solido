import "./Plan.css";

import { PlanHeader } from "./components/PlanHeader";
import { PlanTimeline } from "./components/PlanTimeline";
import "./components/PlanTimeline.css";
import { PlanConnector } from "./components/PlanConnector";
import { PlanWorkoutCard } from "./components/PlanWorkoutCard";
import { PlanMoveDayPicker } from "./components/PlanMoveDayPicker.js";
import { PlanMovePanel } from "./components/PlanMovePanel.js";
import { PlanImportWizard } from "./components/PlanImportWizard.js";
import { PlanMonthCalendar } from "./components/PlanMonthCalendar.js";

import { getSelectedWorkout, getViewedWeekStart, getMovingSessionId, getPlanViewMode, getViewedMonth } from "./planStore";
import { getImportStep } from "./planImportStore.js";
import { getWeekSessions, getSessionById } from "../../data/workoutStore.js";
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

            <div class="plan-empty-top">

                <h1>PLAN</h1>

                <button
                    class="plan-add-button plan-view-toggle"
                    data-action="toggle-plan-view"
                    aria-label="Ver calendario mensual"
                >

                    <iconify-icon icon="solar:calendar-bold-duotone"></iconify-icon>

                </button>

            </div>

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

    const viewMode = getPlanViewMode();
    const viewedWeekStart = getViewedWeekStart();
    const sessions = getWeekSessions(viewedWeekStart);

    // La sesión que se está moviendo puede pertenecer a una semana
    // distinta de la que se está viendo ahora (el usuario desliza para
    // buscar el día destino) — se busca por id, no dentro de `sessions`.
    const movingSessionId = getMovingSessionId();
    const movingSession = movingSessionId ? getSessionById(movingSessionId) : null;

    // Una semana sin sesiones normalmente manda a PlanEmptyState — pero
    // solo en vista semanal: la semana actual puede estar vacía y aun
    // así el mes tener sesiones en otros días (ver PlanMonthCalendar),
    // así que la vista mensual nunca debe quedar bloqueada por esto. Si
    // hay un movimiento en curso, esa semana vacía puede ser exactamente
    // el destino que el usuario está buscando (p. ej. mover a una semana
    // de descanso todavía sin plan), así que el selector de día tiene
    // que seguir pudiéndose ver ahí.
    if (viewMode === "week" && sessions.length === 0 && !movingSession) {
        return PlanEmptyState(viewedWeekStart);
    }

    const selectedWorkout = getSelectedWorkout();

    if (viewMode === "month") {

        const calendarHtml = PlanMonthCalendar(getViewedMonth(), selectedWorkout?.date ?? null);

        return `

            <section class="plan-page">

                ${PlanHeader(viewedWeekStart, sessions, "", { viewMode })}

                <div class="plan-month-section">

                    ${calendarHtml}

                </div>

                ${PlanWorkoutCard(selectedWorkout)}

            </section>

            ${BottomNavigation()}

        `;

    }

    const timelineHtml = movingSession
        ? PlanMoveDayPicker(viewedWeekStart, sessions, movingSession)
        : PlanTimeline(selectedWorkout, sessions);

    return `

        <section class="plan-page">

            ${PlanHeader(viewedWeekStart, sessions, timelineHtml, { viewMode })}

            ${PlanConnector()}

            ${movingSession ? PlanMovePanel(movingSession) : PlanWorkoutCard(selectedWorkout)}

        </section>

        ${BottomNavigation()}

    `;

}