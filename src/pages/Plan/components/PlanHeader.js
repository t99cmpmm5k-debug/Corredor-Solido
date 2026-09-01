import "./PlanHeader.css";
import { themeManager } from "../../../theme/themeManager.js";
import { PLAN_IMAGES } from "../../../assets/plan";
import { parseISODate, addDays, formatDayMonth, getISOWeekNumber } from "../../../utils/date.js";
import { formatKm } from "../../../utils/format.js";

// Foto-por-tema propia del Plan, misma mecánica que el Hero
// (themeManager decide el tema, un mapa de imágenes por tema
// decide la foto) pero con su propio set de imágenes.
//
// viewMode "month" oculta las stats de la semana (semana/progreso) y el
// timeline — no pintan nada en vista mensual, MonthCalendar ya trae su
// propia cabecera con el mes y la navegación entre meses.
//
// optionsMenuOpen: menú "···" con "Borrar esta semana"/"Borrar plan
// completo" (ver planStore.js/initPlanEvents.js) -- hasta ahora solo se
// podía borrar sesión por sesión (menú "···" de cada tarjeta), sin forma
// de tirar de golpe una semana entera o un plan importado por error.
export function PlanHeader(weekStartDate, sessions, timelineHtml = "", { viewMode = "week", optionsMenuOpen = false } = {}) {

    const theme = themeManager.getTheme();
    const showWeekStats = viewMode === "week";

    const weekEndDate = addDays(weekStartDate, 6);

    const weekNumber = getISOWeekNumber(parseISODate(weekStartDate));
    const dateRange = `${formatDayMonth(weekStartDate)} · ${formatDayMonth(weekEndDate)}`;

    const completedCount = sessions.filter(session => session.status === "completed").length;
    const totalCount = sessions.length;
    const completionPercent = totalCount
        ? Math.round((completedCount / totalCount) * 100)
        : 0;

    // Km reales además del conteo de sesiones -- más útil para un
    // corredor que solo el %, mismo campo `volume` (= distanceKm ?? 0,
    // ver withDerivedFields() en workoutStore.js) que ya usa Home para su
    // objetivo semanal.
    const completedKm = sessions
        .filter(session => session.status === "completed")
        .reduce((sum, session) => sum + (session.volume || 0), 0);
    const totalKm = sessions.reduce((sum, session) => sum + (session.volume || 0), 0);

    return `

    <header class="plan-header">

        <img
            class="plan-background-image"
            src="${PLAN_IMAGES[theme.id]}"
            alt=""
        >

        <div class="plan-overlay"></div>

        <div class="plan-glow"></div>

        <div class="plan-bottom-fade"></div>

        <div class="plan-content">

            <div class="plan-header-top">

                <div class="plan-title">

                    <h1>PLAN</h1>

                    <p class="plan-subtitle">

                        TU MAPA DE ENTRENAMIENTO

                    </p>

                </div>

                <div class="plan-header-actions">

                    <button class="plan-add-button" data-action="open-plan-add-sheet">

                        +

                    </button>

                    <div class="plan-options-menu">

                        <button
                            class="plan-add-button"
                            data-action="toggle-plan-options-menu"
                            aria-label="Más opciones del plan"
                        >

                            <iconify-icon icon="solar:menu-dots-bold-duotone"></iconify-icon>

                        </button>

                        ${optionsMenuOpen ? `

                            <div class="plan-options-popover">

                                <button data-action="delete-plan-week">
                                    <iconify-icon icon="solar:calendar-mark-bold-duotone"></iconify-icon>
                                    Borrar esta semana
                                </button>

                                <button class="plan-options-danger" data-action="delete-plan-all">
                                    <iconify-icon icon="solar:trash-bin-trash-bold-duotone"></iconify-icon>
                                    Borrar plan completo
                                </button>

                            </div>

                        ` : ""}

                    </div>

                    <button
                        class="plan-add-button plan-view-toggle"
                        data-action="toggle-plan-view"
                        aria-label="${showWeekStats ? "Ver calendario mensual" : "Ver semana"}"
                    >

                        <iconify-icon icon="${showWeekStats ? "solar:calendar-bold-duotone" : "solar:list-bold-duotone"}"></iconify-icon>

                    </button>

                </div>

            </div>

            ${showWeekStats ? `

                <div class="plan-stats">

                    <div class="plan-week">

                        <span class="week-label">

                            SEMANA ${weekNumber} · ${dateRange}

                        </span>

                        <small>

                            ${completedCount}/${totalCount} sesiones · ${formatKm(completedKm)}/${formatKm(totalKm)} km

                        </small>

                    </div>

                    <div class="progress-ring" style="--ring-percent:${completionPercent}">

                        <span>${completionPercent}%</span>

                    </div>

                </div>

                ${timelineHtml}

            ` : ""}

        </div>

    </header>

    `;

}