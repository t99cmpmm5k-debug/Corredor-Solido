import "./Gym.css";

import { BottomNavigation } from "../../components/Navigation/BottomNavigation.js";
import { getRoutines, getGymDay } from "../../data/gymRoutineStore.js";
import { getSessionById, getGymSessions, getExerciseSessionHistory } from "../../data/gymSessionStore.js";
import { getStep, getActiveSessionId, getDetailExerciseId, getDetailTab, getDetailExpandedSessionId, getWeekSummaryExpanded, getHighlightedDayId, getRoutineMenuOpenId, getHomeTab } from "./gymStore.js";
import { GymSessionView } from "./components/GymSessionView.js";
import { GymSessionSummaryView } from "./components/GymSessionSummaryView.js";
import { GymExerciseDetailView } from "./components/GymExerciseDetailView.js";
import { GymRoutineBuilder } from "./components/GymRoutineBuilder.js";
import { GymHomeSummary } from "./components/GymHomeSummary.js";
import { GymHeader } from "./components/GymHeader.js";
import { GymBodyComposition } from "./components/GymBodyComposition.js";
import { GymNutrition } from "./components/GymNutrition.js";
import { isBuilderOpen } from "./gymRoutineBuilderStore.js";
import { hasWeeklySchedule, getTodayGymDay, getUpcomingGymDays, getWeekProgress, getWeekSessions } from "./gymSchedule.js";
import { formatISODate } from "../../utils/date.js";

function exerciseCount(day) {

    const count = day.exercises.length;
    return `${count} ejercicio${count === 1 ? "" : "s"}`;

}

// Fila de un día: toda la fila arranca (o retoma) la sesión de ese día.
// .gym-day-row/.is-highlighted se conservan -- es lo que busca
// scrollToHighlightedDay() al venir desde Plan (ver openGymDay()).
function DayRow(day, { label = day.title, nested = false } = {}) {

    const highlighted = getHighlightedDayId() === day.id;

    return `

        <button class="gym-day-row ${nested ? "is-nested" : ""} ${highlighted ? "is-highlighted" : ""}" data-action="select-day" data-day-id="${day.id}">

            <span class="gym-day-row-title">${label}</span>

            <span class="gym-day-row-count">${exerciseCount(day)}</span>

        </button>

    `;

}

// Menú "···" con las acciones que ya existían (Editar/Eliminar) -- mismo
// patrón que .race-card-menu en Carreras y .workout-menu en
// PlanGymDayCard.js. data-menu-id: el mismo estado de "qué menú está
// abierto" (getRoutineMenuOpenId) sirve también para el ··· de cada
// sesión del resumen semanal (ver GymHomeSummary.js); solo uno abierto a
// la vez en toda la pantalla.
function RoutineMenu(routine) {

    const isMenuOpen = getRoutineMenuOpenId() === routine.id;

    return `

        <div class="gym-routine-menu">

            <button
                class="gym-routine-menu-toggle"
                data-action="toggle-routine-menu"
                data-menu-id="${routine.id}"
                aria-label="Más opciones de ${routine.name}"
                aria-expanded="${isMenuOpen}"
            >

                <iconify-icon icon="solar:menu-dots-bold"></iconify-icon>

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

// Una fila por rutina, sin caja interior: nombre + nº de ejercicios + ···.
// Rutina de un solo día (el caso normal, p. ej. las de Ana): la fila
// entera abre ese día. Varios días: la rutina hace de cabecera y cada día
// cuelga debajo como fila propia, también sin caja.
function RoutineRow(routine) {

    const days = routine.days;

    if (days.length === 1) {

        const [day] = days;
        // El título del día solo se repite si dice algo distinto del nombre
        // de la rutina ("Día 1" dentro de "Torso"), nunca dos veces lo mismo.
        const label = day.title && day.title !== routine.name
            ? `${routine.name} <small>· ${day.title}</small>`
            : routine.name;

        return `

            <li class="gym-routine-row">
                ${DayRow(day, { label })}
                ${RoutineMenu(routine)}
            </li>

        `;

    }

    return `

        <li class="gym-routine-row is-group">

            <div class="gym-routine-row-head">
                <span class="gym-day-row-title">${routine.name}</span>
                <span class="gym-day-row-count">${days.length ? `${days.length} días` : "Sin días"}</span>
            </div>

            ${RoutineMenu(routine)}

            ${days.length ? `<div class="gym-routine-row-days">${days.map(day => DayRow(day, { nested: true })).join("")}</div>` : ""}

        </li>

    `;

}

function RoutineList(routines) {

    return `

        <section class="gym-routine-list">

            <h2 class="gym-section-title">Tus rutinas</h2>

            <ul class="gym-routine-rows">
                ${routines.map(RoutineRow).join("")}
            </ul>

        </section>

    `;

}

function GymRoutinesEmptyState() {

    return `

        <div class="gym-routine-empty">

            <iconify-icon icon="solar:dumbbell-large-bold-duotone"></iconify-icon>

            <p class="gym-routine-empty-title">Aún no tienes ninguna rutina</p>

            <p>Crea la primera con sus ejercicios, series, repeticiones y peso.</p>

            <button class="gym-finish-button gym-routine-empty-cta" data-action="open-routine-builder">

                <iconify-icon icon="solar:add-circle-bold-duotone"></iconify-icon>

                Crear rutina

            </button>

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

    // Rutinas guardadas pero ninguna con día de la semana: una línea, no
    // una tarjeta de "hoy" vacía. Sin ninguna rutina, ya habla el estado
    // vacío de la lista (GymRoutinesEmptyState).
    if (!hasWeeklySchedule(days)) {
        return days.length ? `<p class="gym-schedule-empty">Aún no tienes entrenamientos programados.</p>` : "";
    }

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
        upcoming: getUpcomingGymDays(days, today, 3),
        weekProgress: { ...getWeekProgress(days, getGymSessions(), today), expanded, sessions },
        todayISO: today,
        openMenuId: getRoutineMenuOpenId()
    });

}

// Pestañas de la pantalla principal -- mismo selector (.gym-detail-tabs)
// que HISTORIAL/GRÁFICAS del detalle de ejercicio, sin un estilo nuevo.
function GymHomeTabs(activeTab) {

    return `

        <div class="gym-detail-tabs gym-home-tabs">

            <button class="gym-detail-tab ${activeTab === "rutinas" ? "is-active" : ""}" data-action="set-gym-home-tab" data-tab="rutinas">RUTINAS</button>

            <button class="gym-detail-tab ${activeTab === "composicion" ? "is-active" : ""}" data-action="set-gym-home-tab" data-tab="composicion">COMPOSICIÓN</button>

            <button class="gym-detail-tab ${activeTab === "nutricion" ? "is-active" : ""}" data-action="set-gym-home-tab" data-tab="nutricion">NUTRICIÓN</button>

        </div>

    `;

}

function GymDaySelect() {

    const routines = getRoutines();
    const allDays = routines.flatMap(r => r.days);
    const tab = getHomeTab();

    return `

        <div class="gym-content">

            ${GymHeader(tab)}

            ${GymHomeTabs(tab)}

            ${tab === "composicion" ? GymBodyComposition() : tab === "nutricion" ? GymNutrition() : `

                ${GymHomeSummarySection(allDays)}

                ${routines.length ? RoutineList(routines) : GymRoutinesEmptyState()}

            `}

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
