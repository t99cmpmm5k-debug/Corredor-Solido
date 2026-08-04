import "./PlanHeader.css";
import { themeManager } from "../../../theme/themeManager.js";
import { PLAN_IMAGES } from "../../../assets/plan";
import { week, weekStartDate, weekEndDate, getLoad } from "../../../data/planData.js";
import { parseISODate, formatDayMonth, getISOWeekNumber } from "../../../utils/date.js";

// Foto-por-tema propia del Plan, misma mecánica que el Hero
// (themeManager decide el tema, un mapa de imágenes por tema
// decide la foto) pero con su propio set de imágenes.
export function PlanHeader(timelineHtml = "") {

    const theme = themeManager.getTheme();

    const weekNumber = getISOWeekNumber(parseISODate(weekStartDate));
    const dateRange = `${formatDayMonth(weekStartDate)} · ${formatDayMonth(weekEndDate)}`;

    const completedCount = week.filter(session => session.status === "completed").length;
    const totalCount = week.length;
    const completionPercent = totalCount
        ? Math.round((completedCount / totalCount) * 100)
        : 0;

    const { completed: loadCompleted, total: loadTotal } = getLoad();
    const loadPercent = loadTotal
        ? Math.round((loadCompleted / loadTotal) * 100)
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

                <button class="plan-add-button">

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

                <div class="plan-load">

                    <span>

                        CARGA SEMANAL

                    </span>

                    <strong>

                        ${loadCompleted} / ${loadTotal}

                    </strong>

                    <div class="load-bar">

                        <div class="load-fill" style="width:${loadPercent}%"></div>

                    </div>

                    <span class="load-percent">${loadPercent}%</span>

                </div>

            </div>

            ${timelineHtml}

        </div>

    </header>

    `;

}