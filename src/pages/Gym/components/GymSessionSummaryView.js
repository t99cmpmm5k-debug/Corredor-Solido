import "./GymSessionSummaryView.css";

import { getGymDay } from "../../../data/gymRoutineStore.js";
import { getPreviousExerciseSummary } from "../../../data/gymSessionStore.js";
import { formatKm } from "../../../utils/format.js";

// Nunca un número inventado -- mismo criterio que durationUnreliable en
// gymSessionStore.js (ver MAX_REASONABLE_SESSION_DURATION_SEC): si el
// reloj no era de fiar, se omite el dato en vez de mostrar algo dudoso.
function formatDuration(durationSec, durationUnreliable) {

    if (durationSec == null || durationUnreliable) return "—";

    return `${Math.round(durationSec / 60)} min`;

}

function sessionSetsProgress(session) {

    let total = 0;
    let done = 0;

    session.exercises.forEach(exercise => {

        total += exercise.sets.length;
        done += exercise.sets.filter(set => set.done).length;

    });

    return { total, done };

}

function formatWeightValue(weight, weightUnit) {

    return `${formatKm(weight)}${weightUnit === "kg/mano" ? "kg/mano" : "kg"}`;

}

// Progreso de un ejercicio frente a su sesión anterior real: prioriza el
// peso (el dato que de verdad indica progresión de fuerza) y solo mira las
// reps si el peso se mantuvo igual (mismo peso con más reps también es
// progreso, pero uno de los dos hubiera hecho ya que el otro no se note,
// así que no se muestran ambos a la vez). Se muestra el valor real
// anterior y el de hoy ("72,5kg → 75kg", "8 → 10 reps"), no un delta --
// pedido explícito de la Fase 3: comparación directa, sin inventar
// métricas (tonelaje, volumen, 1RM) que esta pantalla no lleva.
// "excludeSessionId: session.id" -- la propia sesión que se acaba de
// terminar ya vive en el histórico (finishSession() ya la marcó con
// finishedAt antes de llegar aquí, ver initGymEvents.js), así que sin
// excluirla se compararía consigo misma.
function exerciseProgressLine(definition, sessionExercise, session) {

    const doneSets = sessionExercise.sets.filter(set => set.done && set.weight != null && set.reps != null);

    if (!doneSets.length) return { text: "Sin series completadas", tone: "muted" };

    const todayWeight = Math.max(...doneSets.map(set => set.weight));
    const todayReps = doneSets.find(set => set.weight === todayWeight).reps;

    const previous = getPreviousExerciseSummary(definition.id, { excludeSessionId: session.id });

    if (!previous) return { text: "Primera vez", tone: "muted" };

    const weightDelta = todayWeight - previous.weight;

    if (weightDelta !== 0) {

        return {
            text: `${formatWeightValue(previous.weight, definition.weightUnit)} → ${formatWeightValue(todayWeight, definition.weightUnit)}`,
            tone: weightDelta > 0 ? "up" : "down"
        };

    }

    const repsDelta = todayReps - previous.reps;

    if (repsDelta !== 0) {

        return {
            text: `${previous.reps} → ${todayReps} reps`,
            tone: repsDelta > 0 ? "up" : "down"
        };

    }

    return { text: "=", tone: "equal" };

}

function ExerciseProgressRow(definition, sessionExercise, session) {

    const progress = definition.weightUnit
        ? exerciseProgressLine(definition, sessionExercise, session)
        : { text: "—", tone: "muted" };

    return `

        <div class="gym-summary-exercise-row">

            <span class="gym-summary-exercise-name">${definition.name}</span>

            <span class="gym-summary-exercise-delta is-${progress.tone}">${progress.text}</span>

        </div>

    `;

}

// Pantalla de cierre (Fase 2.7): se muestra DESPUÉS de que finishSession()
// ya haya guardado la sesión (ver "finish-session" en initGymEvents.js) --
// "Guardar entrenamiento" no vuelve a persistir nada, solo confirma y
// vuelve a la lista de rutinas. Duración real (startedAt/finishedAt, nunca
// estimada) y comparación por ejercicio con datos reales de historial.
export function GymSessionSummaryView(session) {

    const day = getGymDay(session.dayId);
    const { total: totalSets, done: doneSets } = sessionSetsProgress(session);

    return `

        <div class="gym-summary">

            <div class="gym-summary-hero">

                <iconify-icon icon="solar:cup-star-bold-duotone"></iconify-icon>

                <h2>ENTRENAMIENTO COMPLETADO</h2>

                <div class="gym-summary-stats">

                    <div class="gym-summary-stat">
                        <span class="gym-summary-stat-value">${formatDuration(session.durationSec, session.durationUnreliable)}</span>
                        <span class="gym-summary-stat-label">Duración</span>
                    </div>

                    <div class="gym-summary-stat">
                        <span class="gym-summary-stat-value">${session.exercises.length}</span>
                        <span class="gym-summary-stat-label">Ejercicios</span>
                    </div>

                    <div class="gym-summary-stat">
                        <span class="gym-summary-stat-value">${doneSets}/${totalSets}</span>
                        <span class="gym-summary-stat-label">Series</span>
                    </div>

                </div>

            </div>

            <div class="gym-summary-exercises">

                ${session.exercises.map(sessionExercise => {

                    const definition = day?.exercises.find(e => e.id === sessionExercise.exerciseId);
                    return definition ? ExerciseProgressRow(definition, sessionExercise, session) : "";

                }).join("")}

            </div>

            <button class="gym-finish-button" data-action="save-session-summary">

                Guardar entrenamiento

            </button>

        </div>

    `;

}
