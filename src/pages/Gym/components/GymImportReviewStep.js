import "./GymImportReviewStep.css";

// Un único sitio con la forma de cada campo editable — reutilizado también
// por initGymEvents.js para parsear de vuelta lo que se edite aquí. Mismo
// patrón que PLAN_SESSION_REVIEW_FIELDS en PlanImportReviewStep.js.
//
// targetWeight/weightUnit NO son editables aquí a propósito: si el usuario
// corrige targetLoadText (p. ej. arreglar un corte mal hecho del
// heurístico de fusión), el número ya parseado se queda como estaba — es
// una simplificación consciente de la Fase 1, no un descuido.
export const GYM_EXERCISE_REVIEW_FIELDS = [
    { key: "name", label: "Ejercicio", type: "text" },
    { key: "sets", label: "Series", type: "number" },
    { key: "targetReps", label: "Reps", type: "text" },
    { key: "targetLoadText", label: "Peso", type: "text" }
];

export function parseExerciseFieldValue(field, rawText) {

    const trimmed = String(rawText ?? "").trim();

    if (field.type === "number") {
        if (trimmed === "") return null;
        const n = Number(trimmed);
        return Number.isNaN(n) ? null : n;
    }

    return trimmed || null;

}

function displayValue(field, exercise) {

    const raw = exercise[field.key];
    return raw == null ? "" : raw;

}

function renderFieldInput(field, dayIndex, exerciseIndex, value) {

    return `

        <input
            type="${field.type}"
            data-day="${dayIndex}"
            data-exercise="${exerciseIndex}"
            data-field="${field.key}"
            value="${value}"
            class="gym-review-cell-input"
        >

    `;

}

function renderExerciseRow(exercise, dayIndex, exerciseIndex) {

    const warnings = exercise.importWarnings || [];
    const hasLowConfidence = GYM_EXERCISE_REVIEW_FIELDS.some(field => {
        const meta = exercise.fieldMeta?.[field.key];
        return meta && (meta.confidence ?? 1) < 0.9;
    });

    return `

        <div class="gym-review-row ${hasLowConfidence ? "is-low-confidence" : ""}">

            <div class="gym-review-row-cells">

                ${GYM_EXERCISE_REVIEW_FIELDS.map(field => `

                    <label class="gym-review-cell gym-review-cell-${field.key}">

                        <span class="gym-review-cell-label">${field.label}</span>

                        ${renderFieldInput(field, dayIndex, exerciseIndex, displayValue(field, exercise))}

                    </label>

                `).join("")}

            </div>

            ${warnings.length ? `

                <div class="wizard-banner wizard-banner-warning gym-review-row-warning">

                    <iconify-icon icon="solar:danger-circle-bold-duotone"></iconify-icon>

                    <ul>

                        ${warnings.map(w => `<li>${w}</li>`).join("")}

                    </ul>

                </div>

            ` : ""}

        </div>

    `;

}

function renderDayGroup(day, dayIndex) {

    return `

        <div class="gym-import-day-group">

            <p class="gym-import-day-title">${day.title} <span class="gym-import-day-weekday">${day.weekday}</span></p>

            <div class="gym-review-table">

                ${day.exercises.map((exercise, exerciseIndex) => renderExerciseRow(exercise, dayIndex, exerciseIndex)).join("")}

            </div>

        </div>

    `;

}

export function GymImportReviewStep(routine, saveError) {

    return `

        <section class="gym-wizard wizard-step-review">

            <header class="wizard-header">

                <button class="wizard-close" data-action="close-gym-import">

                    <iconify-icon icon="solar:close-circle-bold-duotone"></iconify-icon>

                </button>

                <h2>Revisar rutina</h2>

            </header>

            ${routine.routineWarnings?.length ? `

                <div class="wizard-banner wizard-banner-warning">

                    <iconify-icon icon="solar:danger-circle-bold-duotone"></iconify-icon>

                    <ul>

                        ${routine.routineWarnings.map(w => `<li>${w}</li>`).join("")}

                    </ul>

                </div>

            ` : ""}

            ${saveError ? `

                <div class="wizard-banner wizard-banner-error">

                    <iconify-icon icon="solar:danger-triangle-bold-duotone"></iconify-icon>

                    <span>${saveError}</span>

                </div>

            ` : ""}

            ${routine.days.map(renderDayGroup).join("")}

            ${routine.routineNotes ? `

                <p class="gym-import-notes">${routine.routineNotes}</p>

            ` : ""}

            <button class="wizard-primary-button" data-action="confirm-gym-import">

                Confirmar e importar

            </button>

        </section>

    `;

}
