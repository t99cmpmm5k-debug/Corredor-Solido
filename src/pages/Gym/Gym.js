import "./Gym.css";

import { BottomNavigation } from "../../components/Navigation/BottomNavigation.js";
import { getGymDays } from "../../data/gymRoutineStore.js";
import { getSessionById, getGymSessions } from "../../data/gymSessionStore.js";
import { getStep, getActiveSessionId } from "./gymStore.js";
import { GymSessionView } from "./components/GymSessionView.js";
import { GymImportWizard } from "./components/GymImportWizard.js";
import { GymHomeSummary } from "./components/GymHomeSummary.js";
import { getImportStep } from "./gymImportStore.js";
import { hasWeeklySchedule, getTodayGymDay, getUpcomingGymDays, getWeekProgress } from "./gymSchedule.js";
import { formatISODate } from "../../utils/date.js";

function DayCard(day) {

    return `

        <div class="gym-day-card" data-action="select-day" data-day-id="${day.id}">

            <div class="gym-day-card-header">

                <h2>${day.title}</h2>

                <span class="gym-day-card-count">${day.exercises.length} ejercicios</span>

            </div>

            <ul class="gym-day-card-list">

                ${day.exercises.map(exercise => `<li>${exercise.name}</li>`).join("")}

            </ul>

        </div>

    `;

}

// La rutina por defecto (gymData.js) no trae weekday por día — solo la
// rutina importada desde PDF lo tiene (ver pdf.js) — así que "hoy" /
// "próximos" / "resumen semanal" solo tienen sentido cuando hay ese dato
// real de calendario. Sin él, se mantiene el listado plano de días de
// siempre (ninguna regresión para quien no ha importado nada todavía).
function GymHomeSummarySection(days) {

    if (!hasWeeklySchedule(days)) return "";

    const today = formatISODate(new Date());

    return GymHomeSummary({
        todayDay: getTodayGymDay(days, today),
        upcoming: getUpcomingGymDays(days, today),
        weekProgress: getWeekProgress(days, getGymSessions(), today)
    });

}

function GymDaySelect() {

    const days = getGymDays();

    return `

        <div class="gym-content">

            <header class="gym-header">

                <h1>Gimnasio</h1>

                <button class="gym-import-button" data-action="open-gym-import">

                    <iconify-icon icon="solar:file-download-bold-duotone"></iconify-icon>

                    Importar rutina

                </button>

            </header>

            ${GymHomeSummarySection(days)}

            <div class="gym-day-list">

                ${days.map(DayCard).join("")}

            </div>

        </div>

    `;

}

export function Gym() {

    // El wizard de importación se superpone a la pantalla normal de Gym,
    // mismo patrón que Plan() con PlanImportWizard.
    if (getImportStep() !== "closed") {

        return `

            <div class="gym-page">

                ${GymImportWizard()}

            </div>

            ${BottomNavigation()}

        `;

    }

    const step = getStep();
    const session = step === "session" ? getSessionById(getActiveSessionId()) : null;

    return `

        <div class="gym-page">

            ${session ? GymSessionView(session) : GymDaySelect()}

            ${BottomNavigation()}

        </div>

    `;

}
