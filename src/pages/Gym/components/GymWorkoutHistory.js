import "./GymWorkoutHistory.css";

import { getRoutines } from "../../../data/gymRoutineStore.js";
import { getCompletedGymSessions, getSessionById, summarizeGymSession } from "../../../data/gymSessionStore.js";
import { formatDayMonth, formatWeekday } from "../../../utils/date.js";
import { formatSetText, routineExerciseWeightUnit } from "../gymSetFormat.js";

const RECENT_SESSIONS = 3;

// Nombre con el que se ve una sesión en el historial: el de su rutina
// (como en "Tus rutinas": rutina de un día → su nombre; de varios →
// "Rutina · Día"). La sesión solo guarda dayId, así que si la rutina ya
// no existe se dice "Entrenamiento", mismo texto que el resumen semanal.
export function sessionRoutineLabel(dayId) {

    for (const routine of getRoutines()) {

        const day = (routine.days || []).find(d => d.id === dayId);
        if (!day) continue;

        if (routine.days.length === 1 || !day.title || day.title === routine.name) return routine.name;

        return `${routine.name} · ${day.title}`;

    }

    return "Entrenamiento";

}

function countsText(summary) {

    const exercises = `${summary.exerciseCount} ejercicio${summary.exerciseCount === 1 ? "" : "s"}`;
    const sets = `${summary.setCount} serie${summary.setCount === 1 ? "" : "s"}`;

    return `${exercises} · ${sets}`;

}

// Fila de un entreno: fecha, rutina y nº de ejercicios/series. Toda la
// fila abre el detalle de esa sesión. returnStep: a qué pantalla vuelve
// el detalle al cerrarse.
function WorkoutRow(summary, returnStep) {

    return `

        <button class="gym-log-row" data-action="open-gym-session-detail" data-session-id="${summary.id}" data-return-step="${returnStep}">

            <span class="gym-log-row-date">${formatDayMonth(summary.date)}</span>

            <span class="gym-log-row-main">
                <span class="gym-log-row-title">${sessionRoutineLabel(summary.dayId)}</span>
                <span class="gym-log-row-meta">${countsText(summary)}</span>
            </span>

            <iconify-icon class="gym-log-row-chevron" icon="solar:alt-arrow-right-linear"></iconify-icon>

        </button>

    `;

}

const EMPTY_TEXT = "Aún no has guardado entrenos";

// Sección compacta "Entrenos hechos" de la pestaña Rutinas: los 3 últimos
// y el enlace al historial completo. Sin ninguno, una línea -- sin 0/0.
export function GymWorkoutsDoneSection() {

    const sessions = getCompletedGymSessions();

    return `

        <section class="gym-log-section">

            <h2 class="gym-section-title">Entrenos hechos</h2>

            ${sessions.length ? `

                <div class="gym-log-rows">
                    ${sessions.slice(0, RECENT_SESSIONS).map(summary => WorkoutRow(summary, "select-day")).join("")}
                </div>

                <button class="gym-log-more" data-action="open-gym-history">Ver historial completo ›</button>

            ` : `<p class="gym-log-empty">${EMPTY_TEXT}</p>`}

        </section>

    `;

}

// Menú "•••" de una sesión del historial: solo Eliminar (con
// confirmación, ver delete-gym-session en initGymEvents.js). Mismas
// clases que el ··· de las rutinas -- mismo estado de "qué menú está
// abierto" (getRoutineMenuOpenId), uno a la vez en toda la pantalla.
function SessionMenu(sessionId, openMenuId) {

    const isOpen = openMenuId === sessionId;

    return `

        <div class="gym-routine-menu gym-log-menu">

            <button
                class="gym-routine-menu-toggle"
                data-action="toggle-routine-menu"
                data-menu-id="${sessionId}"
                aria-label="Más opciones"
                aria-expanded="${isOpen}"
            >
                <iconify-icon icon="solar:menu-dots-bold"></iconify-icon>
            </button>

            ${isOpen ? `

                <div class="gym-routine-menu-popover">

                    <button class="gym-routine-menu-danger" data-action="delete-gym-session" data-session-id="${sessionId}">
                        <iconify-icon icon="solar:trash-bin-trash-bold-duotone"></iconify-icon>
                        Eliminar
                    </button>

                </div>

            ` : ""}

        </div>

    `;

}

function ScreenHeader(title, closeAction) {

    return `

        <header class="gym-detail-header">

            <button class="gym-close" data-action="${closeAction}" aria-label="Volver">
                <iconify-icon icon="solar:close-circle-bold-duotone"></iconify-icon>
            </button>

            <h2>${title}</h2>

        </header>

    `;

}

// Historial completo: todos los entrenos, más reciente primero.
export function GymWorkoutHistoryView(openMenuId) {

    const sessions = getCompletedGymSessions();

    return `

        <div class="gym-detail gym-log-screen">

            ${ScreenHeader("Historial de entrenos", "close-gym-history")}

            ${sessions.length ? `

                <ul class="gym-log-rows gym-log-rows--full">

                    ${sessions.map(summary => `

                        <li class="gym-log-item">
                            ${WorkoutRow(summary, "gym-history")}
                            ${SessionMenu(summary.id, openMenuId)}
                        </li>

                    `).join("")}

                </ul>

            ` : `<p class="gym-log-empty">${EMPTY_TEXT}</p>`}

        </div>

    `;

}

// Detalle de una sesión: cada ejercicio con sus series hechas (kg × reps),
// tal cual se guardaron.
export function GymWorkoutSessionDetailView(sessionId) {

    const session = getSessionById(sessionId);

    if (!session) {

        return `

            <div class="gym-detail gym-log-screen">
                ${ScreenHeader("Entreno", "close-gym-session-detail")}
                <p class="gym-log-empty">Este entreno ya no existe.</p>
            </div>

        `;

    }

    const summary = summarizeGymSession(session);
    const weekday = formatWeekday(summary.date);

    return `

        <div class="gym-detail gym-log-screen">

            ${ScreenHeader(sessionRoutineLabel(summary.dayId), "close-gym-session-detail")}

            <p class="gym-log-detail-meta">
                <span>${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${formatDayMonth(summary.date)}</span>
                ${summary.setCount ? `<span>${countsText(summary)}</span>` : ""}
            </p>

            ${summary.exercises.length ? `

                <div class="gym-log-exercises">

                    ${summary.exercises.map(exercise => {

                        const unit = routineExerciseWeightUnit(exercise.exerciseId);

                        return `

                            <section class="gym-log-exercise">

                                <h3>${exercise.name}</h3>

                                <ol class="gym-log-sets">
                                    ${exercise.sets.map((set, index) => `
                                        <li>
                                            <span class="gym-log-set-index">Serie ${index + 1}</span>
                                            <span class="gym-log-set-value">${formatSetText(set, unit)}</span>
                                        </li>
                                    `).join("")}
                                </ol>

                            </section>

                        `;

                    }).join("")}

                </div>

            ` : `<p class="gym-log-empty">Este entreno no tiene ninguna serie marcada como hecha.</p>`}

        </div>

    `;

}
