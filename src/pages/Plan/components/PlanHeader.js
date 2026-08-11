import "./PlanHeader.css";
import { themeManager } from "../../../theme/themeManager.js";
import { PLAN_IMAGES } from "../../../assets/plan";
import { getCurrentWeekSessions } from "../../../data/workoutStore.js";
import { parseISODate, formatISODate, formatDayMonth, getISOWeekNumber, getWeekStartDate } from "../../../utils/date.js";

// Foto-por-tema propia del Plan, misma mecánica que el Hero
// (themeManager decide el tema, un mapa de imágenes por tema
// decide la foto) pero con su propio set de imágenes.
export function PlanHeader(timelineHtml = "") {

    const theme = themeManager.getTheme();

    const weekStartDate = getWeekStartDate(formatISODate(new Date()));
    const weekEndDate = formatISODate(
        (() => {
            const start = parseISODate(weekStartDate);
            return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
        })()
    );

    const weekNumber = getISOWeekNumber(parseISODate(weekStartDate));
    const dateRange = `${formatDayMonth(weekStartDate)} · ${formatDayMonth(weekEndDate)}`;

    const sessions = getCurrentWeekSessions();
    const completedCount = sessions.filter(session => session.status === "completed").length;
    const totalCount = sessions.length;
    const completionPercent = totalCount
        ? Math.round((completedCount / totalCount) * 100)
        : 0;

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

                <button class="plan-add-button" data-action="open-plan-import">

                    +

                </button>

            </div>

            <div class="plan-stats">

                <div class="plan-week">

                    <span class="week-label">

                        SEMANA ${weekNumber}

                    </span>

                    <span class="week-date">

                        ${dateRange}

                    </span>

                </div>

                <div class="plan-progress">

                    <div class="progress-ring" style="--ring-percent:${completionPercent}">

                        <span>${completionPercent}%</span>

                    </div>

                    <small>

                        ${completedCount}/${totalCount} SESIONES

                    </small>

                </div>

            </div>

            ${timelineHtml}

        </div>

    </header>

    `;

}