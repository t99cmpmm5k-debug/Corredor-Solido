import "./RunningReviewStep.css";

import { formatSecondsAsClock, parseClockToSeconds } from "../../../utils/format.js";

export const LOW_CONFIDENCE_THRESHOLD = 0.9;

// Un solo sitio con la forma/tipo de cada campo — lo reutiliza también
// initRunningEvents.js para parsear de vuelta lo que se edite aquí.
export const REVIEW_FIELDS = [
    { key: "date", label: "Fecha", type: "date" },
    { key: "distanceKm", label: "Distancia", unit: "km", type: "number", step: "0.01" },
    { key: "durationSec", label: "Duración", unit: "min:seg", type: "clock" },
    { key: "avgPaceSecPerKm", label: "Ritmo medio", unit: "/km", type: "clock" },
    { key: "avgHr", label: "FC media", unit: "ppm", type: "number", step: "1" },
    { key: "maxHr", label: "FC máxima", unit: "ppm", type: "number", step: "1" },
    { key: "calories", label: "Calorías", unit: "kcal", type: "number", step: "1" },
    { key: "avgCadence", label: "Cadencia", unit: "spm", type: "number", step: "1" },
    { key: "temperatureC", label: "Temperatura", unit: "°C", type: "number", step: "0.1" },
    { key: "elevationGainM", label: "Desnivel +", unit: "m", type: "number", step: "1" }
];

export function parseFieldValue(field, rawText) {

    const trimmed = String(rawText ?? "").trim();

    if (field.type === "date") return trimmed || null;
    if (field.type === "clock") return parseClockToSeconds(trimmed);

    if (trimmed === "") return null;

    const n = Number(trimmed);
    return Number.isNaN(n) ? null : n;

}

function displayValue(field, workout) {

    const raw = workout[field.key];
    if (raw == null) return "";

    return field.type === "clock" ? formatSecondsAsClock(raw) : raw;

}

function renderField(field, workout) {

    const meta = workout.fieldMeta?.[field.key] || { confidence: null, corrected: false };
    const value = displayValue(field, workout);
    const isMissing = workout[field.key] == null;
    const isLowConfidence = !isMissing && (meta.confidence ?? 0) < LOW_CONFIDENCE_THRESHOLD;

    return `

        <label class="review-field ${isMissing ? "is-missing" : ""} ${isLowConfidence ? "is-low-confidence" : ""}">

            <span class="review-field-label">

                ${field.label}

                ${isLowConfidence ? `<iconify-icon icon="solar:danger-triangle-bold-duotone" class="review-field-flag" title="Confianza baja — revisar"></iconify-icon>` : ""}

                ${meta.corrected ? `<iconify-icon icon="solar:pen-2-bold-duotone" class="review-field-corrected" title="Editado a mano"></iconify-icon>` : ""}

            </span>

            <span class="review-field-input">

                <input
                    type="${field.type === "clock" ? "text" : field.type}"
                    data-field="${field.key}"
                    value="${value}"
                    placeholder="${isMissing ? "No detectado" : ""}"
                    ${field.step ? `step="${field.step}"` : ""}
                >

                ${field.unit ? `<span class="review-field-unit">${field.unit}</span>` : ""}

            </span>

        </label>

    `;

}

export function RunningReviewStep(workout) {

    const warnings = workout.importWarnings || [];

    return `

        <section class="running-wizard running-step-review">

            <header class="wizard-header">

                <button class="wizard-close" data-action="cancel-wizard">

                    <iconify-icon icon="solar:close-circle-bold-duotone"></iconify-icon>

                </button>

                <h2>Revisar datos</h2>

            </header>

            ${warnings.length ? `

                <div class="wizard-banner wizard-banner-warning">

                    <iconify-icon icon="solar:danger-circle-bold-duotone"></iconify-icon>

                    <ul>

                        ${warnings.map(w => `<li>${w}</li>`).join("")}

                    </ul>

                </div>

            ` : ""}

            <div class="review-fields">

                ${REVIEW_FIELDS.map(field => renderField(field, workout)).join("")}

            </div>

            <button class="wizard-primary-button" data-action="go-to-shoe">

                Siguiente: zapatilla

            </button>

        </section>

    `;

}
