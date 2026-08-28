import "./Gym.css";

import { BottomNavigation } from "../../components/Navigation/BottomNavigation.js";
import { getRoutines, getGymDay } from "../../data/gymRoutineStore.js";
import { getSessionById, getGymSessions, getExerciseSessionHistory } from "../../data/gymSessionStore.js";
import { getStep, getActiveSessionId, getDetailExerciseId, getDetailTab, getDetailExpandedSessionId, getWeekSummaryExpanded, getHighlightedDayId, getRoutineMenuOpenId } from "./gymStore.js";
import { GymSessionView } from "./components/GymSessionView.js";
import { GymSessionSummaryView } from "./components/GymSessionSummaryView.js";
import { GymExerciseDetailView } from "./components/GymExerciseDetailView.js";
import { GymRoutineBuilder } from "./components/GymRoutineBuilder.js";
import { GymHomeSummary } from "./components/GymHomeSummary.js";
import { GymHeader } from "./components/GymHeader.js";
import { isBuilderOpen } from "./gymRoutineBuilderStore.js";
import { hasWeeklySchedule, getTodayGymDay, getUpcomingGymDays, getWeekProgress, getWeekSessions } from "./gymSchedule.js";
import { formatISODate } from "../../utils/date.js";

function DayRow(day) {

    const highlighted = getHighlightedDayId() === day.id;

    return `

        <button class="gym-day-row ${highlighted ? "is-highlighted" : ""}" data-action="select-day" data-day-id="${day.id}">

            <span>${day.title}</span>

            <span class="gym-day-row-count">${day.exercises.length} ejercicios</span>

        </button>

    `;

}

// Menú "···" (Editar/Eliminar) en vez de los iconos de lápiz y papelera
// sueltos que llevaba antes -- mismo patrón que .race-card-menu en
// Carreras y .workout-menu en PlanGymDayCard.js (esta última ya lo usa
// para la MISMA rutina cuando se ve desde Plan; esta tarjeta, la lista
// real de Gimnasio, es la que se había quedado atrás).
function RoutineMenu(routine) {

    const isMenuOpen = getRoutineMenuOpenId() === routine.id;

    return `

        <div class="gym-routine-menu">

            <button
                class="gym-routine-menu-toggle"
                data-action="toggle-routine-menu"
                data-routine-id="${routine.id}"
                aria-label="Más opciones"
            >

                <iconify-icon icon="solar:menu-dots-bold-duotone"></iconify-icon>

            </button>

            ${isMenuOpen ? `

                <div class="gym-routine-menu-popover">

                    <button data-action="edit-gym-routine" data-routine-id="${routine.id}">
                        <iconify-icon icon="solar:pen-bold-duotone"></iconify-icon>
                        Editar
                    </button>

                    <button class="gym-routine-menu-danger" data-action="delete-gym-routine" data-routine-id="${routine.id}">
                        <iconify-icon icon="solar:trash-bin-trash-bold-duotone"></iconify-icon>
                        Eliminar
                    </button>

                </div>

            ` : ""}

        </div>

    `;

}

function RoutineCard(routine) {

    return `

        <div class="gym-routine-card">

            <div class="gym-routine-card-header">

                <h2>${routine.name}</h2>

                ${RoutineMenu(routine)}

            </div>

            <div class="gym-routine-card-days">

                ${routine.days.map(DayRow).join("")}

            </div>

        </div>

    `;

}

function GymRoutinesEmptyState() {

    return `

        <div class="gym-routine-empty">

            <iconify-icon icon="solar:dumbbell-large-bold-duotone"></iconify-icon>

            <p>Todavía no tienes ninguna rutina. Crea la primera con el botón de arriba.</p>

        </div>

    `;

}

// La rutina por defecto (antes de este cambio) no traía weekday por día —
// solo lo tenía una rutina importada por PDF (funcionalidad ya retirada,
// ver CLAUDE.md) — así que "hoy" / "próximos" / "resumen semanal" solo
// tienen sentido cuando hay ese dato real de calendario. Sin él, no se
// muestra nada aquí (ninguna regresión para quien construye sus rutinas a
// mano, que tampoco lo traían).
function GymHomeSummarySection(days) {

    if (!hasWeeklySchedule(days)) return "";

    const today = formatISODate(new Date());
    const expanded = getWeekSummaryExpanded();

    // El listado de sesiones (con el título del día ya resuelto) solo
    // hace falta calcularlo si el desplegable está abierto — evita tirar
    // de getGymDay() por cada sesión de la semana en cada render normal.
    const sessions = expanded
        ? getWeekSessions(days, getGymSessions(), today).map(session => ({
            id: session.id,
            date: session.date,
            dayTitle: getGymDay(session.dayId)?.title ?? "Entrenamiento"
        }))
        : [];

    return GymHomeSummary({
        todayDay: getTodayGymDay(days, today),
        upcoming: getUpcomingGymDays(days, today),
        weekProgress: { ...getWeekProgress(days, getGymSessions(), today), expanded, sessions }
    });

}

function GymDaySelect() {

    const routines = getRoutines();
    const allDays = routines.flatMap(r => r.days);

    return `

        <div class="gym-content">

            ${GymHeader()}

            ${GymHomeSummarySection(allDays)}

            <div class="gym-routine-list">

                ${routines.length ? routines.map(RoutineCard).join("") : GymRoutinesEmptyState()}

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

    // El constructor de rutinas se superpone a la pantalla normal de Gym,
    // mismo patrón que el wizard de importación que sustituye (y que el
    // resto de la app usa para overlays similares — ver Plan()).
    if (isBuilderOpen()) {

        return `

            <div class="gym-page">

                ${GymRoutineBuilder()}

            </div>

            ${BottomNavigation()}

        `;

    }

    const step = getStep();
    const session = step === "session" || step === "session-summary" ? getSessionById(getActiveSessionId()) : null;

    function StepContent() {

        if (step === "exercise-detail") return ExerciseDetailSection();
        if (step === "session-summary" && session) return GymSessionSummaryView(session);
        if (session) return GymSessionView(session);

        return GymDaySelect();

    }

    return `

        <div class="gym-page">

            ${StepContent()}

            ${BottomNavigation()}

        </div>

    `;

}
