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
import { getWeekSessions, getSessionById, getPlannedSessions } from "../../data/workoutStore.js";
import { BottomNavigation } from "../../components/Navigation/BottomNavigation.js";
import { parseISODate, addDays, formatDayMonth, getISOWeekNumber } from "../../utils/date.js";

// Solo para "nunca se ha importado ningún plan" (getPlannedSessions()
// vacío del todo) -- una semana concreta sin sesiones ya no cae aquí, la
// línea temporal siempre pinta sus 7 días con "Descanso" (ver
// fillWeekDays() en PlanTimeline.js). Lleva su propia tira vacía (misma
// clase .plan-timeline que PlanTimeline, sin días dentro) para que el
// swipe de cambio de semana (ver initTimelineSwipe() en initPlanEvents.js)
// siga funcionando ahí — si no, "Importar plan" sería la única salida.
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

            <p>Todavía no has importado ningún plan de entrenamiento.</p>

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

    // PlanEmptyState solo cubre "nunca se ha importado ningún plan" (cero
    // plannedSessions en toda la app) — una semana concreta sin sesiones
    // ya no manda aquí, la línea temporal pinta sus 7 días igual, con
    // "Descanso" en los que no tengan sesión (ver fillWeekDays() en
    // PlanTimeline.js). Solo en vista semanal: la vista mensual nunca debe
    // quedar bloqueada por esto (puede tener sesiones en otras semanas del
    // mismo mes, ver PlanMonthCalendar). Si hay un movimiento en curso, se
    // deja ver el selector de día igualmente (defensivo: en la práctica no
    // puede haber una sesión que mover si nunca se importó ninguna).
    if (viewMode === "week" && getPlannedSessions().length === 0 && !movingSession) {
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
        : PlanTimeline(selectedWorkout, sessions, viewedWeekStart);

    return `

        <section class="plan-page">

            ${PlanHeader(viewedWeekStart, sessions, timelineHtml, { viewMode })}

            ${PlanConnector()}

            ${movingSession ? PlanMovePanel(movingSession) : PlanWorkoutCard(selectedWorkout)}

        </section>

        ${BottomNavigation()}

    `;

}