import "./RunningReviewStep.css";

import { formatSecondsAsClock, parseClockToSeconds } from "../../../utils/format.js";
import { RUNNING_WORKOUT_TYPES } from "../../../data/runningWorkoutTypes.js";
import { getCaptures } from "../runningStore.js";

export const LOW_CONFIDENCE_THRESHOLD = 0.9;

// Un solo sitio con la forma/tipo de cada campo — lo reutiliza también
// initRunningEvents.js para parsear de vuelta lo que se edite aquí.
export const REVIEW_FIELDS = [
    { key: "date", label: "Fecha", type: "date" },
    { key: "time", label: "Hora", type: "text" },
    { key: "type", label: "Tipo", type: "select", options: RUNNING_WORKOUT_TYPES },
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

    if (field.type === "date" || field.type === "text" || field.type === "select") return trimmed || null;
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

function renderFieldControl(field, workout, value, isMissing) {

    if (field.type === "select") {

        return `

            <select data-field="${field.key}">

                ${field.options.map(option => `

                    <option value="${option.id}" ${value === option.id ? "selected" : ""}>

                        ${option.label}

                    </option>

                `).join("")}

            </select>

        `;

    }

    return `

        <input
            type="${field.type === "clock" ? "text" : field.type}"
            data-field="${field.key}"
            value="${value}"
            placeholder="${isMissing ? "No detectado" : ""}"
            ${field.step ? `step="${field.step}"` : ""}
        >

    `;

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

                ${renderFieldControl(field, workout, value, isMissing)}

                ${field.unit ? `<span class="review-field-unit">${field.unit}</span>` : ""}

            </span>

        </label>

    `;

}

function escapeHtml(text) {

    return String(text ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

}

// TEMPORAL - para poder diagnosticar fallos de OCR/parsing mandando el
// texto crudo, sin depender de devtools en el móvil. Quitar cuando exista
// una pantalla de revisión post-importación más completa.
function renderOcrDebug() {

    const captures = getCaptures();
    if (!captures.length) return "";

    return `

        <details class="review-ocr-debug">

            <summary>Ver texto OCR</summary>

            ${captures.map(c => `

                <div class="review-ocr-capture">

                    <p class="review-ocr-capture-meta">
                        ${escapeHtml(c.file)} — pantalla: ${escapeHtml(c.parsed.screen.type)},
                        confianza OCR: ${c.ocr_confidence}%
                    </p>

                    <pre>${escapeHtml(c.text)}</pre>

                </div>

            `).join("")}

        </details>

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

            ${renderOcrDebug()}

            <button class="wizard-primary-button" data-action="go-to-shoe">

                Siguiente: zapatilla

            </button>

        </section>

    `;

}
