import "./GymRoutineBuilder.css";

import { getBuilderState } from "../gymRoutineBuilderStore.js";
import { searchExercises, FILTER_OPTIONS, MUSCLE_GROUPS } from "../exerciseSearch.js";
import { WEEKDAY_OPTIONS } from "../gymSchedule.js";

function ExerciseRow(dayId, exercise) {

    return `

        <div class="gym-builder-exercise">

            <div class="gym-builder-exercise-head">

                <span class="gym-builder-exercise-name">${exercise.name}</span>

                ${exercise.muscleGroup ? `<span class="gym-builder-exercise-muscle">${exercise.muscleGroup}</span>` : ""}

                <button class="gym-builder-remove" data-action="remove-routine-exercise" data-day-id="${dayId}" data-exercise-id="${exercise.id}">
                    <iconify-icon icon="solar:trash-bin-trash-bold-duotone"></iconify-icon>
                </button>

            </div>

            <div class="gym-builder-exercise-fields">

                <label>
                    <span>Series</span>
                    <input type="number" min="1" inputmode="numeric" data-action="set-exercise-sets" data-day-id="${dayId}" data-exercise-id="${exercise.id}" value="${exercise.sets}">
                </label>

                <label>
                    <span>Reps</span>
                    <input type="text" inputmode="numeric" data-action="set-exercise-reps" data-day-id="${dayId}" data-exercise-id="${exercise.id}" value="${exercise.targetReps}" placeholder="8-10">
                </label>

                <label>
                    <span>Peso (kg)</span>
                    <input type="number" min="0" step="0.5" inputmode="decimal" data-action="set-exercise-weight" data-day-id="${dayId}" data-exercise-id="${exercise.id}" value="${exercise.targetWeight ?? ""}" placeholder="—">
                </label>

            </div>

        </div>

    `;

}

function DayEditor(day) {

    return `

        <section class="gym-builder-day">

            <div class="gym-builder-day-header">

                <input type="text" class="gym-builder-day-title" data-action="set-day-title" data-day-id="${day.id}" value="${day.title}" placeholder="Ej. Torso">

                <button class="gym-builder-remove" data-action="remove-routine-day" data-day-id="${day.id}">
                    <iconify-icon icon="solar:trash-bin-trash-bold-duotone"></iconify-icon>
                </button>

            </div>

            <label class="gym-builder-field gym-builder-day-weekday-field">

                <span>Día de la semana</span>

                <select class="gym-builder-day-weekday" data-action="set-day-weekday" data-day-id="${day.id}">

                    <option value="" ${!day.weekday ? "selected" : ""}>Sin día fijo</option>

                    ${WEEKDAY_OPTIONS.map(option => `
                        <option value="${option.id}" ${day.weekday === option.id ? "selected" : ""}>${option.label}</option>
                    `).join("")}

                </select>

            </label>

            <div class="gym-builder-exercises">

                ${day.exercises.map(exercise => ExerciseRow(day.id, exercise)).join("")}

                ${day.exercises.length === 0 ? `<p class="gym-builder-empty-day">Todavía no hay ejercicios en este día.</p>` : ""}

            </div>

            <button class="gym-builder-add-exercise" data-action="open-exercise-picker" data-day-id="${day.id}">
                <iconify-icon icon="solar:add-circle-bold-duotone"></iconify-icon>
                Añadir ejercicio
            </button>

        </section>

    `;

}

// Tope de resultados pintados a la vez -- con los 873 del dataset base
// más los personalizados, sin límite se pintarían de golpe con cada
// pulsación de teclado. Basta con acotar más la búsqueda para ver el
// resto, ningún ejercicio queda inalcanzable.
const PICKER_RESULTS_LIMIT = 60;

function ExercisePicker(picker) {

    const results = searchExercises(picker.query, picker.filter);
    const shown = results.slice(0, PICKER_RESULTS_LIMIT);

    return `

        <div class="gym-picker-overlay">

            <div class="gym-picker">

                <header class="gym-picker-header">

                    <h3>Añadir ejercicio</h3>

                    <button class="gym-close" data-action="close-exercise-picker">
                        <iconify-icon icon="solar:close-circle-bold-duotone"></iconify-icon>
                    </button>

                </header>

                <input
                    type="text"
                    class="gym-picker-search"
                    data-action="set-picker-query"
                    value="${picker.query}"
                    placeholder="Buscar ejercicio…"
                    autofocus
                >

                <div class="gym-picker-pills">

                    ${FILTER_OPTIONS.map(opt => `

                        <button
                            class="gym-picker-pill ${picker.filter === opt.id ? "is-active" : ""}"
                            data-action="set-picker-filter"
                            data-filter="${opt.id}"
                        >${opt.label}</button>

                    `).join("")}

                </div>

                <div class="gym-picker-results">

                    ${shown.length ? shown.map(exercise => `

                        <button class="gym-picker-result" data-action="pick-exercise" data-day-id="${picker.dayId}" data-exercise-id="${exercise.id}">

                            <span>${exercise.name}</span>

                            <span class="gym-picker-result-muscle">${exercise.muscleGroup ?? ""}</span>

                        </button>

                    `).join("") : `<p class="gym-picker-empty">Ningún ejercicio coincide con la búsqueda.</p>`}

                    ${results.length > PICKER_RESULTS_LIMIT ? `<p class="gym-picker-more">Y ${results.length - PICKER_RESULTS_LIMIT} más — afina la búsqueda para verlos.</p>` : ""}

                </div>

                <div class="gym-picker-custom">

                    <p>¿No está en la lista?</p>

                    <form data-action="add-custom-exercise-form" data-day-id="${picker.dayId}">

                        <input type="text" name="name" placeholder="Nombre del ejercicio" required>

                        <select name="muscleGroup" required>
                            <option value="">Grupo muscular</option>
                            ${MUSCLE_GROUPS.map(g => `<option value="${g}">${g}</option>`).join("")}
                        </select>

                        <button type="submit">Añadir</button>

                    </form>

                </div>

            </div>

        </div>

    `;

}

export function GymRoutineBuilder() {

    const state = getBuilderState();
    if (!state) return "";

    return `

        <div class="gym-builder">

            <header class="gym-builder-header">

                <button class="gym-close" data-action="close-routine-builder">
                    <iconify-icon icon="solar:close-circle-bold-duotone"></iconify-icon>
                </button>

                <h2>${state.routineId ? "Editar rutina" : "Nueva rutina"}</h2>

            </header>

            ${state.saveError ? `<div class="gym-builder-error">${state.saveError}</div>` : ""}

            <label class="gym-builder-field">
                <span>Nombre de la rutina</span>
                <input type="text" data-action="set-routine-name" value="${state.name}" placeholder="Ej. Torso Completo">
            </label>

            <div class="gym-builder-days">

                ${state.days.map(DayEditor).join("")}

            </div>

            <button class="gym-builder-add-day" data-action="add-routine-day">
                <iconify-icon icon="solar:add-circle-bold-duotone"></iconify-icon>
                Añadir día
            </button>

            <label class="gym-builder-field">
                <span>Nota de progresión</span>
                <textarea data-action="set-progression-note" placeholder="Ej. Sube 2,5 kg en press banca cuando completes todas las series de todos los días.">${state.progressionNote}</textarea>
            </label>

            <button class="gym-finish-button" data-action="save-routine">Guardar rutina</button>

            ${state.picker ? ExercisePicker(state.picker) : ""}

        </div>

    `;

}
