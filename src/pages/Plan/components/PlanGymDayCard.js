import "./PlanWorkoutCard.css";
import "./PlanGymDayCard.css";

import { isToday, formatDayMonth } from "../../../utils/date.js";
import { WorkoutIcon } from "../../../components/WorkoutIcon/WorkoutIcon";
import { getAverageDurationForDay } from "../../../data/gymSessionStore.js";
import { getSessionMenuOpenId } from "../planStore.js";

const EXERCISE_PREVIEW_COUNT = 4;

// Mismo criterio que compactSummary() de GymTodayCard.js (Inicio): nº de
// ejercicios real + duración media real de sesiones YA terminadas de este
// día concreto (getAverageDurationForDay(), nunca inventada) -- aquí SIN
// repetir el nombre del día, que ya va en el <h2> de arriba (evita el
// mismo bug de redundancia que se corrigió en buildSummaryLine() de
// PlanWorkoutCard.js).
function buildSummaryLine(gymDay) {

    const count = gymDay.exercises.length;
    const bits = [`${count} ejercicio${count === 1 ? "" : "s"}`];

    const avgDurationSec = getAverageDurationForDay(gymDay.gymDayId);
    if (avgDurationSec != null) bits.push(`~${Math.round(avgDurationSec / 60)} min`);

    return bits.join(" · ");

}

// Primeros N ejercicios reales, "+X más" si la lista es más larga -- nunca
// la lista entera de golpe (algunas rutinas traen 8-10 ejercicios).
function buildExerciseListHtml(exercises) {

    const preview = exercises.slice(0, EXERCISE_PREVIEW_COUNT);
    const remaining = exercises.length - preview.length;

    return `

        <ul class="gym-day-card-exercise-list">

            ${preview.map(exercise => `<li>${exercise.name}</li>`).join("")}

            ${remaining > 0 ? `<li class="gym-day-card-exercise-more">+${remaining} más</li>` : ""}

        </ul>

    `;

}

// Tarjeta de detalle inline para un día "solo gimnasio" (sin running) en
// Plan -- mismo patrón visual que PlanWorkoutCard (mismas clases
// .plan-workout-card/.workout-header/.workout-menu/.workout-button, sin
// duplicar ese CSS) para que la pantalla se lea como una sola familia de
// tarjetas, con el contenido propio de una rutina en vez de un entreno de
// running: lista de ejercicios en vez de zona de FC/ritmo, y el menú
// "···" con las únicas 2 acciones reales que existen para una rutina
// (Editar/Eliminar -- no hay "Duplicar rutina" en la app, ver
// RoutineCard() en Gym.js).
// `gymDay` es el objeto sintético de buildGymOnlyDay() (PlanTimeline.js) --
// mismo id (`gym-${date}`) que ya usa PlanTimeline para el resaltado de
// selección, así que reutiliza tal cual getSessionMenuOpenId()/
// setSessionMenuOpenId() (mismo store que la sesión de running) para el
// menú -- solo puede haber un menú abierto a la vez de todas formas.
export function PlanGymDayCard(gymDay) {

    if (!gymDay) return "";

    const isMenuOpen = getSessionMenuOpenId() === gymDay.id;
    const completed = gymDay.gymCompleted;

    return `

        <section class="plan-workout-card">

            <div class="workout-header">

                <div class="workout-title-block">

                    <span class="workout-day">

                        ${isToday(gymDay.date) ? "HOY · " : ""}${gymDay.day} ${formatDayMonth(gymDay.date)}

                    </span>

                    <h2>

                        ${gymDay.title}

                    </h2>

                    <p class="workout-summary-line">

                        ${buildSummaryLine(gymDay)}

                    </p>

                </div>

                <div class="workout-badge">

                    ${WorkoutIcon("strength")}

                </div>

                <div class="workout-menu">

                    <button
                        class="workout-menu-toggle"
                        data-action="toggle-workout-menu"
                        data-session-id="${gymDay.id}"
                        aria-label="Más opciones"
                    >

                        <iconify-icon icon="solar:menu-dots-bold-duotone"></iconify-icon>

                    </button>

                    ${isMenuOpen ? `

                        <div class="workout-menu-popover">

                            <button data-action="plan-edit-gym-routine" data-routine-id="${gymDay.gymRoutineId}">
                                <iconify-icon icon="solar:pen-bold-duotone"></iconify-icon>
                                Editar rutina
                            </button>

                            <button class="workout-menu-danger" data-action="plan-delete-gym-routine" data-routine-id="${gymDay.gymRoutineId}">
                                <iconify-icon icon="solar:trash-bin-trash-bold-duotone"></iconify-icon>
                                Eliminar rutina
                            </button>

                        </div>

                    ` : ""}

                </div>

            </div>

            ${buildExerciseListHtml(gymDay.exercises)}

            <button
                class="workout-button"
                data-action="${completed ? "plan-view-completed-gym-session" : "plan-start-gym-day"}"
                data-day-id="${gymDay.gymDayId}"
            >

                ${completed ? "VER RESUMEN" : "EMPEZAR RUTINA"}

            </button>

            ${!completed ? `

                <button
                    class="workout-button workout-button--ghost"
                    data-action="start-move-gym-day"
                    data-day-id="${gymDay.gymDayId}"
                >

                    MOVER SESIÓN

                </button>

            ` : ""}

        </section>

    `;

}
