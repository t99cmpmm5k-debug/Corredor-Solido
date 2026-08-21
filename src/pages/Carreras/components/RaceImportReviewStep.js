import "./RaceImportReviewStep.css";

import { formatDayMonth } from "../../../utils/date.js";

// Un solo sitio con la forma de cada campo — lo reutiliza también
// initCarrerasEvents.js para parsear de vuelta lo que se edite aquí.
// Mismo patrón que PLAN_SESSION_REVIEW_FIELDS en Plan.
export const RACE_REVIEW_FIELDS = [
    { key: "date", label: "Fecha", type: "date" },
    { key: "type", label: "Tipo", type: "text" },
    { key: "name", label: "Nombre", type: "text" },
    { key: "location", label: "Ubicación", type: "text" },
    { key: "registrationDeadline", label: "Fecha límite de inscripción", type: "datetime-local" },
    { key: "url", label: "Enlace de inscripción", type: "text" }
];

export function parseRaceFieldValue(field, rawText) {

    const trimmed = String(rawText ?? "").trim();

    if (field.type === "datetime-local") return trimmed || null;

    return trimmed || null;

}

function displayValue(field, race) {

    const raw = race[field.key];
    if (raw == null) return "";

    // El <input type="datetime-local"> no acepta segundos salvo que su
    // step lo permita — se recorta a minutos solo para mostrarlo, el
    // valor guardado conserva lo que trajera el archivo hasta que se
    // edite este campo (parseRaceFieldValue() sí escribe sin segundos).
    if (field.type === "datetime-local") return raw.slice(0, 16);

    return raw;

}

function renderField(field, race, raceIndex) {

    const meta = race.fieldMeta?.[field.key] || { confidence: null, corrected: false };
    const value = displayValue(field, race);
    const isMissing = race[field.key] == null;

    return `

        <label class="review-field ${isMissing ? "is-missing" : ""}">

            <span class="review-field-label">

                ${field.label}

                ${meta.corrected ? `<iconify-icon icon="solar:pen-2-bold-duotone" class="review-field-corrected" title="Editado a mano"></iconify-icon>` : ""}

            </span>

            <span class="review-field-input">

                <input
                    type="${field.type}"
                    data-race="${raceIndex}"
                    data-field="${field.key}"
                    value="${value}"
                    placeholder="${isMissing ? "Sin dato" : ""}"
                >

            </span>

        </label>

    `;

}

function renderRaceCard(race, raceIndex) {

    const warnings = race.importWarnings || [];

    return `

        <div class="race-import-card">

            ${warnings.length ? `

                <div class="wizard-banner wizard-banner-warning">

                    <iconify-icon icon="solar:danger-circle-bold-duotone"></iconify-icon>

                    <ul>

                        ${warnings.map(w => `<li>${w}</li>`).join("")}

                    </ul>

                </div>

            ` : ""}

            <div class="race-review-fields">

                ${RACE_REVIEW_FIELDS.map(field => renderField(field, race, raceIndex)).join("")}

            </div>

        </div>

    `;

}

export function RaceImportReviewStep(plan, saveError) {

    return `

        <section class="carreras-wizard race-step-review">

            <header class="wizard-header">

                <button class="wizard-close" data-action="close-race-import">

                    <iconify-icon icon="solar:close-circle-bold-duotone"></iconify-icon>

                </button>

                <h2>Revisar carreras</h2>

            </header>

            <p class="race-import-count">${plan.races.length} ${plan.races.length === 1 ? "carrera encontrada" : "carreras encontradas"}${plan.planName ? ` · ${plan.planName}` : ""}</p>

            ${plan.planWarnings?.length ? `

                <div class="wizard-banner wizard-banner-warning">

                    <iconify-icon icon="solar:danger-circle-bold-duotone"></iconify-icon>

                    <ul>

                        ${plan.planWarnings.map(w => `<li>${w}</li>`).join("")}

                    </ul>

                </div>

            ` : ""}

            ${saveError ? `

                <div class="wizard-banner wizard-banner-error">

                    <iconify-icon icon="solar:danger-triangle-bold-duotone"></iconify-icon>

                    <span>${saveError}</span>

                </div>

            ` : ""}

            <div class="race-import-list">

                ${plan.races.map((race, index) => `

                    <div class="race-import-group">

                        <p class="race-import-group-title">${race.date ? formatDayMonth(race.date) : "Sin fecha"}</p>

                        ${renderRaceCard(race, index)}

                    </div>

                `).join("")}

            </div>

            <button class="wizard-primary-button" data-action="confirm-race-import">

                Confirmar e importar

            </button>

        </section>

    `;

}
