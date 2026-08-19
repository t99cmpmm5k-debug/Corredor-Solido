import "./Gym.css";

import { BottomNavigation } from "../../components/Navigation/BottomNavigation.js";
import { getGymDays, getGymDay } from "../../data/gymRoutineStore.js";
import { getSessionById, getGymSessions, getExerciseSessionHistory } from "../../data/gymSessionStore.js";
import { getStep, getActiveSessionId, getDetailExerciseId, getDetailTab, getDetailExpandedSessionId } from "./gymStore.js";
import { GymSessionView } from "./components/GymSessionView.js";
import { GymExerciseDetailView } from "./components/GymExerciseDetailView.js";
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

// La sesión activa se queda intacta al abrir el detalle (solo cambia
// `step`, ver openExerciseDetail en initGymEvents.js) — así se puede
// localizar la definición del ejercicio (nombre, weightUnit, grupo
// muscular) sin duplicarla en gymStore.
function ExerciseDetailSection() {

    const exerciseId = getDetailExerciseId();
    const activeSession = getSessionById(getActiveSessionId());
    const day = activeSession ? getGymDay(activeSession.dayId) : null;
    const definition = day?.exercises.find(e => e.id === exerciseId);

    if (!definition) return "";

    // Solo se excluye si sigue de verdad en curso (sin finishedAt) — una
    // sesión de hoy ya guardada con "Guardar sesión" cuenta como historial
    // real. Sin este matiz, startSession() retoma la sesión de hoy aunque
    // ya esté terminada (ver comentario en gymSessionStore.js), y
    // excluirla por ser "la activa" hacía que el propio entreno que
    // acabas de guardar pareciera no haberse guardado nunca al abrir el
    // detalle del ejercicio justo después.
    const excludeSessionId = activeSession && !activeSession.finishedAt ? activeSession.id : null;
    const history = getExerciseSessionHistory(exerciseId, { excludeSessionId });

    return GymExerciseDetailView(definition, history, getDetailTab(), getDetailExpandedSessionId());

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

            ${step === "exercise-detail" ? ExerciseDetailSection() : session ? GymSessionView(session) : GymDaySelect()}

            ${BottomNavigation()}

        </div>

    `;

}
