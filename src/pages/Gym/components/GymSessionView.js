import "./GymSessionView.css";

import { getGymDay } from "../../../data/gymRoutineStore.js";
import { getLastLoggedSet } from "../../../data/gymSessionStore.js";
import { getCurrentExerciseIndex, isRestRunning, getRestRemainingSec, getRestDurationSec, isEditingCell, getExerciseCompletionOverlay } from "../gymStore.js";
import { GymExerciseHistoryChart } from "./GymExerciseHistoryChart.js";

function formatWeight(weight, weightUnit) {

    if (weight == null) return "—";

    const label = weightUnit === "kg/mano" ? "kg/mano" : "kg";

    return `${weight} ${label}`;

}

// Un decimal como mucho, sin ceros de sobra, coma decimal -- mismo criterio
// que formatKm() en utils/format.js, aplicado aquí a diferencias de peso
// ("+2,5kg", nunca "+2,50kg").
function formatSignedWeight(delta) {

    const rounded = Math.round(Math.abs(delta) * 10) / 10;
    const text = (Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)).replace(".", ",");

    return `${delta > 0 ? "+" : "−"}${text}`;

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

// Celda Kg/Reps de la tabla de series: en reposo muestra el valor tocable
// (blanco -- dato principal, ver jerarquía de color de CLAUDE.md/Fase 2);
// tocarla la pone en modo stepper (cian -- controles) sin abrir un teclado
// ni un modal aparte, reutilizando el mismo +/- de siempre pero solo para
// ESA celda concreta (ver isEditingCell()/gymStore.js, una sola celda
// activa a la vez en toda la pantalla).
function setCell(exerciseId, setIndex, field, value) {

    const editing = isEditingCell(exerciseId, setIndex, field);
    const incAction = field === "weight" ? "inc-weight" : "inc-reps";
    const decAction = field === "weight" ? "dec-weight" : "dec-reps";

    if (editing) {

        return `

            <div class="gym-set-cell gym-set-cell--${field} is-editing">

                <div class="gym-stepper">

                    <button class="gym-stepper-btn" data-action="${decAction}" data-exercise-id="${exerciseId}" data-set-index="${setIndex}">−</button>

                    <span class="gym-stepper-value">${value != null ? value : "—"}</span>

                    <button class="gym-stepper-btn" data-action="${incAction}" data-exercise-id="${exerciseId}" data-set-index="${setIndex}">+</button>

                </div>

            </div>

        `;

    }

    return `

        <button
            class="gym-set-cell gym-set-cell--${field}"
            data-action="edit-set-cell"
            data-exercise-id="${exerciseId}"
            data-set-index="${setIndex}"
            data-field="${field}"
        >${value != null ? value : "—"}</button>

    `;

}

// Cabecera de columnas de la tabla de series — una sola vez por ejercicio,
// no repetida en cada fila. "Anterior" en gris azulado (dato secundario,
// ver jerarquía de color) porque no es editable ni el foco de la fila.
function SetColumnsHeader(definition) {

    return `

        <div class="gym-set-table-row gym-set-table-row--header">

            <span class="gym-set-label"></span>

            <span class="gym-set-col-prev">Anterior</span>

            ${definition.weightUnit ? `<span class="gym-set-col-label">Kg</span>` : ""}

            <span class="gym-set-col-label">Reps</span>

            <span class="gym-set-columns-done"></span>

        </div>

    `;

}

// "Anterior" de esta fila concreta: la MISMA serie (por índice) la última
// vez que se hizo -- comparación serie a serie (pirámide incluida), no el
// resumen de toda la sesión anterior (eso vive en la cabecera de la
// tarjeta, ver GymExerciseHistoryChart.js/Fase 2.2).
function previousCellText(definition, exerciseId, index, excludeSessionId) {

    if (!definition.weightUnit) return "—";

    const previous = getLastLoggedSet(exerciseId, index, { excludeSessionId });
    if (!previous) return "—";

    return `${previous.weight}${previous.reps != null ? `×${previous.reps}` : ""}`;

}

function setRow(definition, sessionExercise, set, index, excludeSessionId) {

    return `

        <div class="gym-set-table-row ${set.done ? "is-done" : ""}">

            <span class="gym-set-label">${index + 1}</span>

            <span class="gym-set-col-prev">${previousCellText(definition, sessionExercise.exerciseId, index, excludeSessionId)}</span>

            ${definition.weightUnit ? setCell(sessionExercise.exerciseId, index, "weight", set.weight) : ""}

            ${setCell(sessionExercise.exerciseId, index, "reps", set.reps)}

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

// Series (no ejercicios) hechas/totales de TODA la sesión -- para la barra
// de progreso, que avanza con cada serie marcada, no solo al cambiar de
// ejercicio.
function sessionSetsProgress(session) {

    let total = 0;
    let done = 0;

    session.exercises.forEach(exercise => {

        total += exercise.sets.length;
        done += exercise.sets.filter(set => set.done).length;

    });

    return { total, done };

}

// Visible durante toda la sesión (Fase 2.6): nombre del ejercicio actual +
// posición, barra de progreso a nivel de SERIES (más fina que solo contar
// ejercicios) y el contador "12/28 series" debajo -- sin repetir
// "X/Y ejercicios" aquí, ya lo dice la línea de arriba, para no saturar.
function SessionProgressHeader(session, index, definition) {

    const totalExercises = session.exercises.length;
    const { total: totalSets, done: doneSets } = sessionSetsProgress(session);
    const percent = totalSets ? Math.round((doneSets / totalSets) * 100) : 0;

    return `

        <div class="gym-session-progress">

            <div class="gym-session-progress-top">

                <span class="gym-session-progress-title">${definition ? `${definition.name} · ` : ""}Ejercicio ${index + 1} de ${totalExercises}</span>

            </div>

            <div class="gym-session-progress-track">

                <div class="gym-session-progress-fill" style="width:${percent}%"></div>

            </div>

            <span class="gym-session-progress-sets">${doneSets}/${totalSets} series</span>

        </div>

    `;

}

// Tarjeta breve al completar todas las series de un ejercicio (Fase 2.5) --
// datos reales de la propia sesión (today) y de getPreviousExerciseSummary
// (previous), calculados por buildExerciseCompletionSummary() en
// initGymEvents.js. Tocar en cualquier parte (o esperar el avance
// automático) la cierra -- ver dismiss-exercise-complete.
function ExerciseCompleteOverlay() {

    const data = getExerciseCompletionOverlay();
    if (!data) return "";

    const unit = data.weightUnit === "kg/mano" ? "kg/mano" : "kg";
    const todayText = `Hoy: ${data.today.weight}${unit}×${data.today.reps}`;
    const previousText = data.previous ? `Anterior: ${data.previous.weight}${unit}×${data.previous.reps}` : "";

    let deltaHtml = "";

    if (data.delta != null) {

        if (data.delta > 0) deltaHtml = `<span class="gym-complete-delta is-up">${formatSignedWeight(data.delta)}${unit}</span>`;
        else if (data.delta < 0) deltaHtml = `<span class="gym-complete-delta is-down">${formatSignedWeight(data.delta)}${unit}</span>`;
        else deltaHtml = `<span class="gym-complete-delta is-equal">=</span>`;

    }

    return `

        <div class="gym-complete-overlay" data-action="dismiss-exercise-complete">

            <div class="gym-complete-card">

                <iconify-icon icon="solar:medal-star-bold-duotone"></iconify-icon>

                <h3>${data.title.toUpperCase()} COMPLETADO</h3>

                <p class="gym-complete-today">${todayText}</p>

                ${previousText ? `<p class="gym-complete-prev">${previousText}</p>` : ""}

                ${deltaHtml}

            </div>

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

    // Últimos 10s: cambio de intensidad visual (ver .is-critical en
    // GymSessionView.css) -- la vibración y el texto "LISTO" al llegar a 0
    // los dispara initGymEvents.js directamente sobre el DOM en cada tick,
    // este render solo cubre el estado inicial al pintar el widget.
    const critical = remaining > 0 && remaining <= 10;

    const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
    const ss = String(remaining % 60).padStart(2, "0");

    return `

        <div class="gym-rest-timer ${critical ? "is-critical" : ""}">

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

// Peso máximo ya marcado como hecho HOY para este ejercicio -- para el
// "+2,5kg vs última sesión" en verde de la cabecera de la tarjeta (Fase
// 2.2). null mientras no haya ninguna serie hecha todavía, para no fingir
// una comparación con un peso que aún no se ha levantado de verdad.
function todayBestWeight(sessionExercise) {

    const doneWeights = sessionExercise.sets.filter(s => s.done && s.weight != null).map(s => s.weight);
    return doneWeights.length ? Math.max(...doneWeights) : null;

}

function exerciseCard(definition, sessionExercise, excludeSessionId) {

    return `

        <section class="gym-exercise-card">

            <header class="gym-exercise-header">

                <div>

                    ${definition.weightUnit ? `

                        <button class="gym-exercise-title" data-action="open-exercise-detail" data-exercise-id="${definition.id}">

                            <h3>${definition.name}</h3>

                            <iconify-icon icon="solar:alt-arrow-right-bold-duotone"></iconify-icon>

                        </button>

                    ` : `<h3>${definition.name}</h3>`}

                    ${definition.muscleGroup ? `<span class="gym-exercise-muscle">${definition.muscleGroup}</span>` : ""}

                    <span class="gym-exercise-target">${exerciseTarget(definition)}</span>

                </div>

            </header>

            ${definition.weightUnit ? GymExerciseHistoryChart(definition.id, definition.weightUnit, excludeSessionId, todayBestWeight(sessionExercise)) : ""}

            <div class="gym-set-table ${definition.weightUnit ? "" : "gym-set-table--no-weight"}">

                ${SetColumnsHeader(definition)}

                ${sessionExercise.sets.map((set, index) => setRow(definition, sessionExercise, set, index, excludeSessionId)).join("")}

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

    // Mismo criterio que ExerciseDetailSection() en Gym.js: startSession()
    // retoma la sesión de hoy aunque ya tenga finishedAt (es un checkpoint,
    // no un cierre — ver gymSessionStore.js), así que "activa" no basta
    // para excluirla de su propio historial. Sin este matiz, el badge se
    // quedaba en "Primera vez" para siempre nada más guardar, aunque esa
    // misma sesión ya tuviera una serie real hecha.
    const excludeSessionId = session.finishedAt ? null : session.id;

    return `

        <div class="gym-session">

            <header class="gym-session-header">

                <button class="gym-close" data-action="close-session">

                    <iconify-icon icon="solar:close-circle-bold-duotone"></iconify-icon>

                </button>

                <h2>${day ? day.title : "Sesión"}</h2>

            </header>

            ${SessionProgressHeader(session, index, definition)}

            ${ExerciseNavHeader(index, session.exercises.length)}

            ${sessionExercise && definition ? exerciseCard(definition, sessionExercise, excludeSessionId) : ""}

            <button class="gym-finish-button" data-action="finish-session">

                Finalizar entrenamiento

            </button>

        </div>

        ${ExerciseCompleteOverlay()}

    `;

}
