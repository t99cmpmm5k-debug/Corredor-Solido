import "./GymSessionView.css";

import { getGymDay } from "../../../data/gymRoutineStore.js";
import { getLastLoggedWeight } from "../../../data/gymSessionStore.js";

function formatWeight(weight, weightUnit) {

    if (weight == null) return "—";

    const label = weightUnit === "kg/mano" ? "kg/mano" : "kg";

    return `${weight} ${label}`;

}

function exerciseTarget(definition) {

    // targetLoadText (solo en ejercicios importados) es siempre el texto
    // más completo — conserva rangos ("45-50 kg") que formatWeight()
    // recortaría al primer número, y cubre valores cualitativos
    // (Asistencia, Moderado...) que formatWeight() no sabe representar.
    const weightPart = definition.targetLoadText
        ? ` · ${definition.targetLoadText}`
        : definition.weightUnit
            ? ` · ${formatWeight(definition.targetWeight, definition.weightUnit)}`
            : "";

    return `${definition.sets}×${definition.targetReps}${weightPart}`;

}

function lastTimeBadge(definition) {

    if (!definition.weightUnit) return "";

    const last = getLastLoggedWeight(definition.id);

    const text = last != null
        ? `Última vez: ${formatWeight(last, definition.weightUnit)}`
        : "Primera vez";

    return `<span class="gym-exercise-badge">${text}</span>`;

}

function weightStepper(exerciseId, setIndex, set) {

    return `

        <div class="gym-stepper">

            <button class="gym-stepper-btn" data-action="dec-weight" data-exercise-id="${exerciseId}" data-set-index="${setIndex}">−</button>

            <span class="gym-stepper-value">${set.weight != null ? set.weight : "—"}<small>kg</small></span>

            <button class="gym-stepper-btn" data-action="inc-weight" data-exercise-id="${exerciseId}" data-set-index="${setIndex}">+</button>

        </div>

    `;

}

function repsStepper(exerciseId, setIndex, set) {

    return `

        <div class="gym-stepper">

            <button class="gym-stepper-btn" data-action="dec-reps" data-exercise-id="${exerciseId}" data-set-index="${setIndex}">−</button>

            <span class="gym-stepper-value">${set.reps != null ? set.reps : "—"}</span>

            <button class="gym-stepper-btn" data-action="inc-reps" data-exercise-id="${exerciseId}" data-set-index="${setIndex}">+</button>

        </div>

    `;

}

function setRow(definition, sessionExercise, set, index) {

    return `

        <div class="gym-set-row ${set.done ? "is-done" : ""}">

            <span class="gym-set-label">${index + 1}</span>

            <div class="gym-set-steppers">

                ${definition.weightUnit ? weightStepper(sessionExercise.exerciseId, index, set) : ""}

                ${repsStepper(sessionExercise.exerciseId, index, set)}

            </div>

            <button
                class="gym-set-done ${set.done ? "is-done" : ""}"
                data-action="toggle-done"
                data-exercise-id="${sessionExercise.exerciseId}"
                data-set-index="${index}"
            >

                <iconify-icon icon="solar:check-circle-bold-duotone"></iconify-icon>

            </button>

        </div>

    `;

}

function exerciseCard(definition, sessionExercise) {

    return `

        <section class="gym-exercise-card">

            <header class="gym-exercise-header">

                <div>

                    <h3>${definition.name}</h3>

                    <span class="gym-exercise-target">${exerciseTarget(definition)}</span>

                </div>

                ${lastTimeBadge(definition)}

            </header>

            <div class="gym-set-rows">

                ${sessionExercise.sets.map((set, index) => setRow(definition, sessionExercise, set, index)).join("")}

            </div>

        </section>

    `;

}

export function GymSessionView(session) {

    const day = getGymDay(session.dayId);

    return `

        <div class="gym-session">

            <header class="gym-session-header">

                <button class="gym-close" data-action="close-session">

                    <iconify-icon icon="solar:close-circle-bold-duotone"></iconify-icon>

                </button>

                <h2>${day ? day.title : "Sesión"}</h2>

            </header>

            <div class="gym-exercise-list">

                ${session.exercises.map(sessionExercise => {

                    const definition = day?.exercises.find(e => e.id === sessionExercise.exerciseId);
                    return definition ? exerciseCard(definition, sessionExercise) : "";

                }).join("")}

            </div>

            <button class="gym-finish-button" data-action="finish-session">

                Guardar sesión

            </button>

        </div>

    `;

}
