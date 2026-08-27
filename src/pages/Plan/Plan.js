import "./Plan.css";

import { PlanHeader } from "./components/PlanHeader";
import { PlanTimeline } from "./components/PlanTimeline";
import "./components/PlanTimeline.css";
import { PlanConnector } from "./components/PlanConnector";
import { PlanWorkoutCard } from "./components/PlanWorkoutCard";
import { PlanGymDayCard } from "./components/PlanGymDayCard.js";
import { PlanMoveDayPicker } from "./components/PlanMoveDayPicker.js";
import { PlanMovePanel } from "./components/PlanMovePanel.js";
import { PlanImportWizard } from "./components/PlanImportWizard.js";
import { PlanMonthCalendar } from "./components/PlanMonthCalendar.js";
import { PlanCreateSessionPanel } from "./components/PlanCreateSessionPanel.js";
import { BottomSheet } from "../../components/BottomSheet/BottomSheet.js";

import { getSelectedWorkout, getViewedWeekStart, getMovingSessionId, getDuplicatingSessionId, getPlanViewMode, getViewedMonth, getCreatingSessionDate, getEditingSessionId, getNewSessionType, getNewSessionNotes, isAddSheetOpen } from "./planStore";
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

    // Mismo patrón que movingSession -- duplicar comparte panel de
    // instrucciones y selector de día con mover (PlanMovePanel/
    // PlanMoveDayPicker en modo "duplicate", ver esos componentes), fase
    // 4 del pulido de Plan.
    const duplicatingSessionId = getDuplicatingSessionId();
    const duplicatingSession = duplicatingSessionId ? getSessionById(duplicatingSessionId) : null;

    // PlanEmptyState solo cubre "nunca se ha importado ningún plan" (cero
    // plannedSessions en toda la app) — una semana concreta sin sesiones
    // ya no manda aquí, la línea temporal pinta sus 7 días igual, con
    // "Descanso" en los que no tengan sesión (ver fillWeekDays() en
    // PlanTimeline.js). Solo en vista semanal: la vista mensual nunca debe
    // quedar bloqueada por esto (puede tener sesiones en otras semanas del
    // mismo mes, ver PlanMonthCalendar). Si hay un movimiento o duplicado
    // en curso, se deja ver el selector de día igualmente (defensivo: en
    // la práctica no puede haber una sesión que mover/duplicar si nunca
    // se importó ninguna).
    if (viewMode === "week" && getPlannedSessions().length === 0 && !movingSession && !duplicatingSession) {
        return PlanEmptyState(viewedWeekStart);
    }

    const selectedWorkout = getSelectedWorkout();

    // Qué tarjeta ocupa el hueco de detalle bajo el calendario/línea
    // temporal -- mutuamente excluyentes (ver planStore.js), creando una
    // sesión manda sobre moviendo/duplicando una y sobre la seleccionada.
    // Compartido entre semanal y mensual para que "tocar un día vacío"
    // abra el mismo formulario venga de donde venga (ver requisito en
    // initPlanEvents.js: selectCalendarDay() / listener de ".timeline-day").
    // "Editar sesión" (menú "···") reutiliza este mismo formulario de
    // creación -- getEditingSessionId() solo cambia sus textos, ver
    // PlanCreateSessionPanel.js.
    const creatingSessionDate = getCreatingSessionDate();
    const editingSessionId = getEditingSessionId();

    const detailCardHtml = creatingSessionDate
        ? PlanCreateSessionPanel(creatingSessionDate, getNewSessionType(), getNewSessionNotes(), !!editingSessionId)
        : movingSession
            ? PlanMovePanel(movingSession, "move")
            : duplicatingSession
                ? PlanMovePanel(duplicatingSession, "duplicate")
                // Un día "solo gimnasio" (sin running, ver attachGymInfo()
                // en PlanTimeline.js) guarda su objeto sintético en el mismo
                // selectedWorkout -- gymOnly decide qué tarjeta pintar aquí,
                // sin añadir un cuarto estado paralelo al ya existente.
                : selectedWorkout?.gymOnly
                    ? PlanGymDayCard(selectedWorkout)
                    : PlanWorkoutCard(selectedWorkout);

    // Capa flotante por encima de toda la pantalla (fase 5 del pulido de
    // Plan) -- independiente de qué ocupe el hueco de detalle, así que se
    // añade al final del markup en vez de en detailCardHtml.
    const addSheetHtml = isAddSheetOpen() ? BottomSheet({
        title: "Añadir a la semana",
        closeAction: "close-plan-add-sheet",
        options: [
            { icon: "solar:upload-square-bold-duotone", label: "Importar plan", hint: "Desde un PDF, CSV o JSON", action: "add-sheet-import-plan" },
            { icon: "solar:add-circle-bold-duotone", label: "Crear entrenamiento", hint: "Sesión manual para hoy", action: "add-sheet-create-workout" },
            { icon: "solar:moon-bold-duotone", label: "Añadir descanso", hint: "Recuperación para hoy", action: "add-sheet-add-rest" }
        ]
    }) : "";

    if (viewMode === "month") {

        const calendarHtml = PlanMonthCalendar(getViewedMonth(), selectedWorkout?.date ?? null);

        return `

            <section class="plan-page">

                ${PlanHeader(viewedWeekStart, sessions, "", { viewMode })}

                <div class="plan-month-section">

                    ${calendarHtml}

                </div>

                ${detailCardHtml}

            </section>

            ${BottomNavigation()}

            ${addSheetHtml}

        `;

    }

    const timelineHtml = movingSession
        ? PlanMoveDayPicker(viewedWeekStart, sessions, movingSession, "move")
        : duplicatingSession
            ? PlanMoveDayPicker(viewedWeekStart, sessions, duplicatingSession, "duplicate")
            : PlanTimeline(selectedWorkout, sessions, viewedWeekStart);

    return `

        <section class="plan-page">

            ${PlanHeader(viewedWeekStart, sessions, timelineHtml, { viewMode })}

            ${PlanConnector()}

            ${detailCardHtml}

        </section>

        ${BottomNavigation()}

        ${addSheetHtml}

    `;

}