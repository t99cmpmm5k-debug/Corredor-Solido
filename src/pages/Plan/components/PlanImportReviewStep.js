import "./PlanImportReviewStep.css";

import { formatSecondsAsClock, parseClockToSeconds } from "../../../utils/format.js";
import { WORKOUT_TYPES } from "../../../data/workoutTypes.js";
import { getWeekStartDate, formatDayMonth } from "../../../utils/date.js";

export const LOW_CONFIDENCE_THRESHOLD = 0.9;

const TYPE_OPTIONS = Object.keys(WORKOUT_TYPES).map(id => ({ id, label: WORKOUT_TYPES[id].label }));

// Un solo sitio con la forma/tipo de cada campo — lo reutiliza también
// initPlanEvents.js para parsear de vuelta lo que se edite aquí. Mismo
// patrón que REVIEW_FIELDS en RunningReviewStep.js.
export const PLAN_SESSION_REVIEW_FIELDS = [
    { key: "date", label: "Fecha", type: "date" },
    { key: "type", label: "Tipo", type: "select", options: TYPE_OPTIONS },
    { key: "title", label: "Título", type: "text" },
    { key: "distanceKm", label: "Distancia", unit: "km", type: "number", step: "0.01" },
    { key: "durationSec", label: "Duración", unit: "min:seg", type: "clock" },
    { key: "targetPaceSecPerKm", label: "Ritmo objetivo", unit: "/km", type: "clock" },
    { key: "targetHrZone", label: "Zona de FC", type: "text" },
    { key: "description", label: "Descripción", type: "textarea" }
];

export function parseSessionFieldValue(field, rawText) {

    const trimmed = String(rawText ?? "").trim();

    if (field.type === "date" || field.type === "text" || field.type === "textarea" || field.type === "select") return trimmed || null;
    if (field.type === "clock") return parseClockToSeconds(trimmed);

    if (trimmed === "") return null;

    const n = Number(trimmed);
    return Number.isNaN(n) ? null : n;

}

function displayValue(field, session) {

    const raw = session[field.key];
    if (raw == null) return "";

    return field.type === "clock" ? formatSecondsAsClock(raw) : raw;

}

function renderFieldControl(field, sessionIndex, value, isMissing) {

    if (field.type === "select") {

        return `

            <select data-session="${sessionIndex}" data-field="${field.key}">

                <option value="" ${value === "" ? "selected" : ""}>Sin tipo</option>

                ${field.options.map(option => `

                    <option value="${option.id}" ${value === option.id ? "selected" : ""}>

                        ${option.label}

                    </option>

                `).join("")}

            </select>

        `;

    }

    if (field.type === "textarea") {

        // Contenido entre etiquetas, no un atributo value — un <input> de
        // una sola línea recorta visualmente un texto largo (el bug real:
        // la descripción del PDF concatena Objetivo/Estructura/Intensidad/
        // Clave, mucho más larga que una línea). Altura real la ajusta
        // autoResizeTextarea() en initPlanEvents.js tras cada render.
        // </textarea> literal escapado — es lo único que rompería el
        // contenido en bruto de un textarea, el resto de caracteres no
        // se interpretan como marcado ahí dentro.
        const safeValue = String(value).replace(/<\/textarea/gi, "&lt;/textarea");

        return `

            <textarea
                class="review-textarea"
                data-session="${sessionIndex}"
                data-field="${field.key}"
                rows="1"
                placeholder="${isMissing ? "Sin dato" : ""}"
            >${safeValue}</textarea>

        `;

    }

    return `

        <input
            type="${field.type === "clock" ? "text" : field.type}"
            data-session="${sessionIndex}"
            data-field="${field.key}"
            value="${value}"
            placeholder="${isMissing ? "Sin dato" : ""}"
            ${field.step ? `step="${field.step}"` : ""}
        >

    `;

}

function renderField(field, session, sessionIndex) {

    const meta = session.fieldMeta?.[field.key] || { confidence: null, corrected: false };
    const value = displayValue(field, session);
    const isMissing = session[field.key] == null;
    const isLowConfidence = !isMissing && (meta.confidence ?? 0) < LOW_CONFIDENCE_THRESHOLD;

    return `

        <label class="review-field ${isMissing ? "is-missing" : ""} ${isLowConfidence ? "is-low-confidence" : ""}">

            <span class="review-field-label">

                ${field.label}

                ${isLowConfidence ? `<iconify-icon icon="solar:danger-triangle-bold-duotone" class="review-field-flag" title="Confianza baja — revisar"></iconify-icon>` : ""}

                ${meta.corrected ? `<iconify-icon icon="solar:pen-2-bold-duotone" class="review-field-corrected" title="Editado a mano"></iconify-icon>` : ""}

            </span>

            <span class="review-field-input">

                ${renderFieldControl(field, sessionIndex, value, isMissing)}

                ${field.unit ? `<span class="review-field-unit">${field.unit}</span>` : ""}

            </span>

        </label>

    `;

}

function renderSessionCard(session, sessionIndex) {

    const warnings = session.importWarnings || [];

    return `

        <div class="plan-import-session-card">

            ${warnings.length ? `

                <div class="wizard-banner wizard-banner-warning">

                    <iconify-icon icon="solar:danger-circle-bold-duotone"></iconify-icon>

                    <ul>

                        ${warnings.map(w => `<li>${w}</li>`).join("")}

                    </ul>

                </div>

            ` : ""}

            <div class="plan-review-fields">

                ${PLAN_SESSION_REVIEW_FIELDS.map(field => renderField(field, session, sessionIndex)).join("")}

            </div>

        </div>

    `;

}

// Agrupación solo de presentación — el dato que se guarda sigue siendo la
// lista plana de sessions con su propio índice original (sessionIndex),
// para que el listener de cambios no tenga que traducir índices de grupo.
function groupSessionsByWeek(sessions) {

    const groups = new Map();

    sessions.forEach((session, index) => {

        const key = session.date ? getWeekStartDate(session.date) : "sin-fecha";

        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push({ session, index });

    });

    const sortedKeys = [...groups.keys()].sort((a, b) => {
        if (a === "sin-fecha") return 1;
        if (b === "sin-fecha") return -1;
        return a.localeCompare(b);
    });

    return sortedKeys.map(key => ({ key, entries: groups.get(key) }));

}

function renderWeekGroup(group) {

    const title = group.key === "sin-fecha"
        ? "Sin fecha"
        : `Semana del ${formatDayMonth(group.key)}`;

    return `

        <div class="plan-import-week-group">

            <p class="plan-import-week-title">${title}</p>

            <div class="plan-import-sessions">

                ${group.entries.map(({ session, index }) => renderSessionCard(session, index)).join("")}

            </div>

        </div>

    `;

}

export function PlanImportReviewStep(plan, saveError) {

    const groups = groupSessionsByWeek(plan.sessions);

    return `

        <section class="plan-wizard plan-step-review">

            <header class="wizard-header">

                <button class="wizard-close" data-action="close-plan-import">

                    <iconify-icon icon="solar:close-circle-bold-duotone"></iconify-icon>

                </button>

                <h2>Revisar plan</h2>

            </header>

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

            ${groups.map(renderWeekGroup).join("")}

            <button class="wizard-primary-button" data-action="confirm-plan-import">

                Confirmar e importar

            </button>

        </section>

    `;

}
