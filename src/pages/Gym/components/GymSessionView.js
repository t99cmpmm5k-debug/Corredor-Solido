import "./GymSessionView.css";

import { getGymDay } from "../../../data/gymRoutineStore.js";
import { getCurrentExerciseIndex, isRestRunning, getRestRemainingSec, getRestDurationSec } from "../gymStore.js";
import { GymExerciseHistoryChart } from "./GymExerciseHistoryChart.js";

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

// Más compacto que weightStepper/repsStepper — RIR es el tercer control de
// la fila, y a diferencia de peso/reps no viene de ningún objetivo (nace
// en null, ver buildInitialSets en gymSessionStore.js).
function rirStepper(exerciseId, setIndex, set) {

    return `

        <div class="gym-stepper gym-stepper--compact">

            <button class="gym-stepper-btn" data-action="dec-rir" data-exercise-id="${exerciseId}" data-set-index="${setIndex}">−</button>

            <span class="gym-stepper-value">${set.rir != null ? set.rir : "—"}</span>

            <button class="gym-stepper-btn" data-action="inc-rir" data-exercise-id="${exerciseId}" data-set-index="${setIndex}">+</button>

        </div>

    `;

}

// Cabecera de columnas de la tabla de series — una sola vez por ejercicio,
// no repetida en cada fila (por eso rirStepper ya no lleva su propia
// etiqueta "RIR" pegada al valor).
function SetColumnsHeader(definition) {

    return `

        <div class="gym-set-columns">

            <span class="gym-set-label"></span>

            <div class="gym-set-columns-labels">

                ${definition.weightUnit ? `<span>Peso</span>` : ""}

                <span>Reps</span>

                <span class="gym-set-columns-rir">RIR</span>

            </div>

            <span class="gym-set-columns-done"></span>

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

                ${rirStepper(sessionExercise.exerciseId, index, set)}

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

function ExerciseNavHeader(index, total) {

    return `

        <div class="gym-exercise-nav">

            <button class="gym-exercise-nav-btn" data-action="prev-exercise" ${index === 0 ? "disabled" : ""}>

                <iconify-icon icon="solar:alt-arrow-left-bold-duotone"></iconify-icon>

            </button>

            <span class="gym-exercise-nav-count">Ejercicio ${index + 1} de ${total}</span>

            <button class="gym-exercise-nav-btn" data-action="next-exercise" ${index === total - 1 ? "disabled" : ""}>

                <iconify-icon icon="solar:alt-arrow-right-bold-duotone"></iconify-icon>

            </button>

        </div>

    `;

}

// Widget solo presente cuando hay un descanso en marcha (isRestRunning())
// — el conteo en vivo lo actualiza directamente initGymEvents.js sobre
// estos mismos nodos (#gym-rest-remaining/#gym-rest-fill), sin repintar
// toda la página cada segundo.
function RestTimer() {

    if (!isRestRunning()) return "";

    const remaining = getRestRemainingSec();
    const duration = getRestDurationSec();
    const percent = duration ? Math.round((remaining / duration) * 100) : 0;

    const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
    const ss = String(remaining % 60).padStart(2, "0");

    return `

        <div class="gym-rest-timer">

            <div class="gym-rest-timer-top">

                <span class="gym-rest-timer-label">DESCANSO</span>

                <span class="gym-rest-timer-value" id="gym-rest-remaining">${mm}:${ss}</span>

            </div>

            <div class="gym-rest-timer-track">

                <div class="gym-rest-timer-fill" id="gym-rest-fill" style="width:${percent}%"></div>

            </div>

            <div class="gym-rest-timer-actions">

                <button class="gym-rest-btn" data-action="rest-subtract">−15s</button>

                <button class="gym-rest-btn" data-action="rest-skip">Saltar</button>

                <button class="gym-rest-btn" data-action="rest-add">+15s</button>

            </div>

        </div>

    `;

}

function NotesField(sessionExercise) {

    return `

        <div class="gym-notes">

            <label for="gym-exercise-notes">Notas</label>

            <textarea
                id="gym-exercise-notes"
                class="gym-notes-input"
                data-action="update-notes"
                data-exercise-id="${sessionExercise.exerciseId}"
                placeholder="Cómo te sentiste, ajustes para la próxima..."
            >${sessionExercise.notes || ""}</textarea>

        </div>

    `;

}

function exerciseCard(definition, sessionExercise, sessionId) {

    return `

        <section class="gym-exercise-card">

            <header class="gym-exercise-header">

                <div>

                    <h3>${definition.name}</h3>

                    ${definition.muscleGroup ? `<span class="gym-exercise-muscle">${definition.muscleGroup}</span>` : ""}

                    <span class="gym-exercise-target">${exerciseTarget(definition)}</span>

                </div>

            </header>

            ${definition.weightUnit ? GymExerciseHistoryChart(definition.id, definition.weightUnit, sessionId) : ""}

            ${SetColumnsHeader(definition)}

            <div class="gym-set-rows">

                ${sessionExercise.sets.map((set, index) => setRow(definition, sessionExercise, set, index)).join("")}

            </div>

            ${RestTimer()}

            ${NotesField(sessionExercise)}

        </section>

    `;

}

export function GymSessionView(session) {

    const day = getGymDay(session.dayId);
    const index = getCurrentExerciseIndex();
    const sessionExercise = session.exercises[index];
    const definition = day?.exercises.find(e => e.id === sessionExercise?.exerciseId);

    return `

        <div class="gym-session">

            <header class="gym-session-header">

                <button class="gym-close" data-action="close-session">

                    <iconify-icon icon="solar:close-circle-bold-duotone"></iconify-icon>

                </button>

                <h2>${day ? day.title : "Sesión"}</h2>

            </header>

            ${ExerciseNavHeader(index, session.exercises.length)}

            ${sessionExercise && definition ? exerciseCard(definition, sessionExercise, session.id) : ""}

            <button class="gym-finish-button" data-action="finish-session">

                Guardar sesión

            </button>

        </div>

    `;

}
