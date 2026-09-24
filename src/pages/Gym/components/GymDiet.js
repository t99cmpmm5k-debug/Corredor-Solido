import "./GymDiet.css";

import {
    getActiveDietPlan,
    resolveDietDay,
    getEatenForDate,
    getWeekendLongRunDay,
    computeDayCompliance,
    getComplianceHistory
} from "../../../data/dietStore.js";
import { formatISODate, formatDayMonth, getDayAbbreviation, getWeekStartDate, addDays } from "../../../utils/date.js";
import { getDietImport, isDietWeekendPickerOpen, isDietDeletePending } from "../gymStore.js";

// "Mi dieta" (Nutrición, Gimnasio): la dieta de la plantilla CSV (ver
// utils/dietCsv.js) día a día, con qué opción se comió de cada comida, el
// selector semanal de fin de semana, y el cumplimiento. Mismo lenguaje
// visual que Composición corporal. El texto de la dieta se muestra tal
// cual viene en el CSV.

// Texto del CSV -- siempre escapado.
function escapeHtml(text) {

    return String(text ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

}

const DAY_LABELS = {
    LUNES: "Lunes",
    MARTES: "Martes",
    MIERCOLES: "Miércoles",
    JUEVES: "Jueves",
    VIERNES: "Viernes",
    TIRADA_LARGA: "Tirada larga",
    DESCANSO: "Descanso"
};

// Sin "accept" a propósito: en iOS deja en gris archivos válidos (ver
// project_ios_file_input_no_accept). El contenido lo valida el parser.
function CsvPicker(label, { primary = false } = {}) {

    return `

        <label class="${primary ? "gym-finish-button" : "gym-bodycomp-cancel"} gym-diet-file">
            <iconify-icon icon="solar:upload-bold-duotone"></iconify-icon>
            <span>${label}</span>
            <input type="file" data-action="diet-csv-input" hidden>
        </label>

    `;

}

function TemplateButton() {

    return `

        <button class="gym-bodycomp-cancel gym-diet-file" data-action="diet-download-template">
            <iconify-icon icon="solar:download-minimalistic-bold-duotone"></iconify-icon>
            <span>Descargar plantilla</span>
        </button>

    `;

}

// Todos los errores del CSV rechazado, con su línea: no se importa nada
// hasta que el archivo encaja entero.
function ImportErrors(state) {

    if (!state.errors.length) return "";

    return `

        <div class="gym-builder-error gym-diet-errors" role="alert">
            <p><strong>No se ha importado ${state.fileName ? `«${escapeHtml(state.fileName)}»` : "el archivo"}</strong>: no sigue la plantilla. Corrige esto y vuelve a elegirlo:</p>
            <ul>
                ${state.errors.map(e => `<li>${e.line ? `<b>Línea ${e.line}</b>: ` : ""}${escapeHtml(e.message)}</li>`).join("")}
            </ul>
        </div>

    `;

}

function EmptyState(state) {

    return `

        <section class="gym-bodycomp-form">

            <h3 class="gym-bodycomp-title">Importa tu dieta</h3>

            <p class="gym-diet-text">Elige tu dieta en CSV con la plantilla de Corredor Sólido: columnas <code>dia, momento, opcion, alimento, notas</code>, un día por cada LUNES…VIERNES, TIRADA_LARGA y DESCANSO, y REGLAS_GENERALES para las notas generales.</p>

            ${ImportErrors(state)}

            <div class="gym-diet-actions">
                ${CsvPicker("Elegir CSV", { primary: true })}
                ${TemplateButton()}
            </div>

        </section>

    `;

}

// Qué día real del fin de semana es la tirada larga -- una vez por
// semana. Mientras no se elige, sábado y domingo no tienen menú.
function WeekendPicker(date, current) {

    const saturday = addDays(getWeekStartDate(date), 5);
    const sunday = addDays(saturday, 1);

    return `

        <section class="gym-bodycomp-form gym-diet-weekend">

            <h3 class="gym-bodycomp-title"><iconify-icon icon="solar:running-round-bold-duotone"></iconify-icon> Fin de semana ${formatDayMonth(saturday)}–${formatDayMonth(sunday)}</h3>

            <p class="gym-diet-text">¿Qué día haces la tirada larga? El otro será tu día de descanso.</p>

            <div class="gym-detail-tabs gym-diet-weekend-options">
                <button class="gym-detail-tab ${current === "sabado" ? "is-active" : ""}" data-action="diet-weekend" data-date="${date}" data-long-run="sabado">SÁBADO</button>
                <button class="gym-detail-tab ${current === "domingo" ? "is-active" : ""}" data-action="diet-weekend" data-date="${date}" data-long-run="domingo">DOMINGO</button>
            </div>

        </section>

    `;

}

function ComplianceCard(compliance, history) {

    return `

        <section class="gym-bodycomp-form gym-diet-compliance">

            <h3 class="gym-bodycomp-title">Cumplimiento</h3>

            <div class="gym-nutrition-kcal">
                <strong>${compliance ? `${compliance.percent}%` : "—"}</strong>
                <span>${compliance ? `${compliance.done} de ${compliance.total} comidas` : "sin menú este día"}</span>
            </div>

            <div class="gym-diet-history" aria-label="Últimos 7 días">
                ${history.map(day => `
                    <span class="gym-diet-history-day ${day.percent == null ? "is-empty" : ""}">
                        <span class="gym-diet-history-bar"><span style="height:${day.percent ?? 0}%"></span></span>
                        <small>${getDayAbbreviation(day.date)}</small>
                        <b>${day.percent == null ? "—" : `${day.percent}%`}</b>
                    </span>
                `).join("")}
            </div>

        </section>

    `;

}

// HIDRATACION y AJUSTE: información del día, no comida -- sin casillas y
// con su propio estilo.
function DayInfo(day) {

    if (!day.hydration && !day.adjustment) return "";

    return `

        <div class="gym-diet-info">
            ${day.hydration ? `<p><iconify-icon icon="solar:waterdrop-bold-duotone"></iconify-icon><span><b>Hidratación</b> ${escapeHtml(day.hydration)}</span></p>` : ""}
            ${day.adjustment ? `<p><iconify-icon icon="solar:info-circle-bold-duotone"></iconify-icon><span><b>Ajuste</b> ${escapeHtml(day.adjustment)}</span></p>` : ""}
        </div>

    `;

}

// Una comida: sus opciones, y cuál se comió. Con una sola opción es una
// casilla; con varias, se elige una (tocar otra cambia la elegida, tocar
// la elegida la desmarca).
function MealBlock(meal, eatenKey) {

    const multiple = meal.options.length > 1;

    return `

        <div class="gym-diet-meal">

            <h4 class="gym-nutrition-meal-title">${escapeHtml(meal.moment)}${multiple ? ` <span>elige 1 de ${meal.options.length}</span>` : ""}</h4>

            ${meal.options.map(option => {

                const eaten = eatenKey === option.key;

                return `

                    <button class="gym-diet-item ${eaten ? "is-checked" : ""} ${multiple ? "is-choice" : ""}" data-action="diet-toggle-meal" data-meal-key="${escapeHtml(meal.key)}" data-option-key="${escapeHtml(option.key)}" aria-pressed="${eaten}">
                        <span class="gym-diet-check" aria-hidden="true">${eaten ? `<iconify-icon icon="solar:check-square-bold"></iconify-icon>` : ""}</span>
                        <span>${multiple ? `<small>Opción ${option.number}</small>` : ""}${escapeHtml(option.text)}</span>
                    </button>

                `;

            }).join("")}

        </div>

    `;

}

function DayMenu(plan, date) {

    const { dayKey } = resolveDietDay(date);
    const day = plan.days[dayKey];
    const eaten = getEatenForDate(date);
    const weekend = dayKey === "TIRADA_LARGA" || dayKey === "DESCANSO";

    return `

        <section class="gym-bodycomp-history gym-diet-day">

            <div class="gym-diet-day-head">
                <h3 class="gym-bodycomp-title">${DAY_LABELS[dayKey]}</h3>
                ${weekend ? `<button class="gym-diet-edit" data-action="diet-weekend-change">Cambiar</button>` : ""}
            </div>

            ${DayInfo(day)}

            ${day.meals.map(meal => MealBlock(meal, eaten[meal.key])).join("")}

        </section>

    `;

}

// REGLAS_GENERALES: aparte, fuera del checklist de cualquier día.
function GeneralRules(plan) {

    if (!plan.generalRules.length) return "";

    return `

        <section class="gym-bodycomp-form gym-diet-rules">

            <h3 class="gym-bodycomp-title">Notas generales</h3>

            <ol>
                ${plan.generalRules.map(rule => `<li>${escapeHtml(rule.text)}</li>`).join("")}
            </ol>

        </section>

    `;

}

function PlanFooter(plan, state) {

    const deletePending = isDietDeletePending();

    return `

        <section class="gym-bodycomp-form gym-diet-footer">

            <p class="gym-diet-source">${plan.sourceFileName ? escapeHtml(plan.sourceFileName) : "Dieta"} · importada el ${new Date(plan.importedAt).toLocaleDateString("es-ES")}</p>

            ${ImportErrors(state)}

            <div class="gym-diet-actions">
                ${CsvPicker("Importar otra dieta")}
                ${TemplateButton()}
                <button class="gym-bodycomp-cancel ${deletePending ? "gym-diet-danger" : ""}" data-action="diet-delete">${deletePending ? "¿Borrar la dieta?" : "Borrar dieta"}</button>
            </div>

        </section>

    `;

}

export function GymDiet(date) {

    const plan = getActiveDietPlan();
    const state = getDietImport();

    if (!plan) return EmptyState(state);

    const { dayKey, needsWeekendChoice } = resolveDietDay(date);
    const longRunDay = getWeekendLongRunDay(date);
    // Selector: en cualquier día de una semana sin elegir (la primera vez
    // que se usa esa semana), o al pulsar "Cambiar".
    const showPicker = !longRunDay || isDietWeekendPickerOpen();

    const compliance = dayKey ? computeDayCompliance(plan.days[dayKey], getEatenForDate(date)) : null;
    const history = getComplianceHistory(formatISODate(new Date()), 7);

    return `

        ${showPicker ? WeekendPicker(date, longRunDay) : ""}

        ${ComplianceCard(compliance, history)}

        ${needsWeekendChoice ? `
            <div class="gym-detail-empty">
                <iconify-icon icon="solar:calendar-bold-duotone"></iconify-icon>
                <p>Elige arriba qué día del fin de semana haces la tirada larga para ver el menú de hoy.</p>
            </div>
        ` : DayMenu(plan, date)}

        ${GeneralRules(plan)}

        ${PlanFooter(plan, state)}

    `;

}
