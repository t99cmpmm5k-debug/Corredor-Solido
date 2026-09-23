import "./GymBodyComposition.css";

import { getBodyCompositionEntries, getBodyCompositionEntryById } from "../../../data/bodyCompositionStore.js";
import { formatISODate, formatDayMonth, parseISODate } from "../../../utils/date.js";
import { formatKm } from "../../../utils/format.js";
import { getBodyCompEditingId, getBodyCompPendingDeleteId } from "../gymStore.js";

// Pestaña "Composición corporal" de Gimnasio: formulario de alta/edición,
// gráfico de evolución del peso e historial. Los datos son exactamente los
// que registró el usuario -- un campo vacío se muestra "—", y el gráfico
// solo tiene punto donde hay un registro real (ver WeightChart).

// Un decimal como mucho, coma decimal (mismo criterio que formatKm()).
function formatNumber(value) {

    return formatKm(value);

}

function formatDate(iso) {

    const year = iso.slice(0, 4);
    return year === String(new Date().getFullYear()) ? formatDayMonth(iso) : `${formatDayMonth(iso)} ${year}`;

}

function Field(label, name, value, { required = false } = {}) {

    return `

        <label>
            <span>${label}${required ? "" : " <small>(opcional)</small>"}</span>
            <input type="number" min="0" step="0.1" inputmode="decimal" data-field="${name}" value="${value ?? ""}" placeholder="—">
        </label>

    `;

}

// Inputs sin controlar: se leen del DOM al pulsar Guardar (ver
// saveBodyCompositionEntry en initGymEvents.js) -- nunca un rerender() por
// tecla, que cerraría el teclado del móvil.
function EntryForm() {

    const editingId = getBodyCompEditingId();
    const editing = editingId ? getBodyCompositionEntryById(editingId) : null;

    return `

        <section class="gym-bodycomp-form">

            <h3 class="gym-bodycomp-title">${editing ? "Editar registro" : "Nuevo registro"}</h3>

            <!-- Lo rellena saveBodyCompositionEntry() (initGymEvents.js) en
                 sitio, sin rerender(): repintar vaciaría lo ya tecleado. -->
            <div class="gym-builder-error" data-bodycomp-error hidden></div>

            <label class="gym-builder-field">
                <span>Fecha</span>
                <input type="date" data-field="date" value="${editing?.date ?? formatISODate(new Date())}" max="${formatISODate(new Date())}">
            </label>

            <div class="gym-builder-exercise-fields gym-bodycomp-fields">

                ${Field("Peso (kg)", "weightKg", editing?.weightKg, { required: true })}
                ${Field("% grasa", "bodyFatPercent", editing?.bodyFatPercent)}
                ${Field("% agua", "waterPercent", editing?.waterPercent)}
                ${Field("% músculo", "musclePercent", editing?.musclePercent)}

            </div>

            <div class="gym-bodycomp-form-actions">

                ${editing ? `<button class="gym-bodycomp-cancel" data-action="cancel-bodycomp-edit">Cancelar</button>` : ""}

                <button class="gym-finish-button" data-action="save-bodycomp-entry">${editing ? "Guardar cambios" : "Guardar registro"}</button>

            </div>

        </section>

    `;

}

const DAY_MS = 24 * 60 * 60 * 1000;
// Margen vertical para que los puntos extremos no queden cortados.
const Y_PADDING = 10;

// Mismo patrón de SVG a mano que la gráfica de evolución del detalle de
// ejercicio (GymExerciseDetailView.js), con una diferencia a propósito: el
// eje X es la FECHA real, no el orden. Así un periodo sin pesarse se ve
// como un hueco sin puntos -- con el reparto por índice de aquel gráfico,
// dos registros separados por un mes quedarían igual de juntos que dos
// seguidos. Solo hay punto donde hay un registro; nada se rellena.
function WeightChart(entries) {

    const points = [...entries].sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));

    if (points.length < 2) {

        return `

            <div class="gym-detail-empty">
                <iconify-icon icon="solar:chart-2-bold-duotone"></iconify-icon>
                <p>${points.length ? "Con un segundo registro verás aquí la evolución de tu peso." : "Añade tu primer registro para empezar a ver la evolución de tu peso."}</p>
            </div>

        `;

    }

    const times = points.map(p => parseISODate(p.date).getTime());
    const firstTime = times[0], span = times[times.length - 1] - firstTime;

    const weights = points.map(p => p.weightKg);
    const min = Math.min(...weights), max = Math.max(...weights), range = max - min;

    const coords = points.map((p, i) => ({
        x: span === 0 ? 50 : ((times[i] - firstTime) / span) * 100,
        y: range === 0 ? 50 : Y_PADDING + ((p.weightKg - min) / range) * (100 - 2 * Y_PADDING)
    }));

    const linePoints = coords.map(c => `${c.x},${100 - c.y}`).join(" ");

    const dots = coords.map((c, i) => `
        <span class="gym-detail-chart-dot" style="left:${c.x}%;bottom:${c.y}%" title="${formatDate(points[i].date)}: ${formatNumber(points[i].weightKg)} kg"></span>
    `).join("");

    const first = points[0], last = points[points.length - 1];
    const delta = Math.round((last.weightKg - first.weightKg) * 10) / 10;
    const deltaText = delta === 0 ? "sin cambios" : `${delta > 0 ? "+" : "−"}${formatNumber(Math.abs(delta))} kg`;
    const days = Math.round(span / DAY_MS);

    return `

        <div class="gym-detail-chart">

            <div class="gym-detail-chart-header">

                <h3 class="gym-detail-chart-title">EVOLUCIÓN DEL PESO</h3>

                <span class="gym-detail-chart-badge">${formatNumber(last.weightKg)} kg</span>

            </div>

            <p class="gym-bodycomp-chart-summary">${deltaText} en ${days} ${days === 1 ? "día" : "días"} · ${points.length} registros</p>

            <div class="gym-detail-chart-track">

                <span class="gym-bodycomp-axis-y gym-bodycomp-axis-y--max">${formatNumber(max)}</span>
                <span class="gym-bodycomp-axis-y gym-bodycomp-axis-y--min">${formatNumber(min)}</span>

                <svg class="gym-detail-chart-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <polyline class="gym-detail-chart-line" points="${linePoints}" />
                </svg>

                ${dots}

            </div>

            <div class="gym-detail-chart-axis">
                <span>${formatDate(first.date)}</span>
                <span>${formatDate(last.date)}</span>
            </div>

        </div>

    `;

}

function Metric(label, value) {

    return `

        <span class="gym-bodycomp-metric ${value == null ? "is-empty" : ""}">
            <small>${label}</small>
            <strong>${value == null ? "—" : `${formatNumber(value)}%`}</strong>
        </span>

    `;

}

function HistoryRow(entry, pendingDeleteId) {

    const confirming = pendingDeleteId === entry.id;

    return `

        <div class="gym-bodycomp-entry">

            <div class="gym-bodycomp-entry-head">

                <span class="gym-bodycomp-entry-date">${formatDate(entry.date)}</span>

                <strong class="gym-bodycomp-entry-weight">${formatNumber(entry.weightKg)} kg</strong>

                <button class="gym-bodycomp-icon-button" data-action="edit-bodycomp-entry" data-entry-id="${entry.id}" aria-label="Editar registro">
                    <iconify-icon icon="solar:pen-bold-duotone"></iconify-icon>
                </button>

                <button class="gym-bodycomp-icon-button gym-bodycomp-delete ${confirming ? "is-confirming" : ""}" data-action="delete-bodycomp-entry" data-entry-id="${entry.id}" aria-label="${confirming ? "Pulsa otra vez para borrar" : "Borrar registro"}">
                    ${confirming ? "¿Borrar?" : `<iconify-icon icon="solar:trash-bin-trash-bold-duotone"></iconify-icon>`}
                </button>

            </div>

            <div class="gym-bodycomp-metrics">
                ${Metric("Grasa", entry.bodyFatPercent)}
                ${Metric("Agua", entry.waterPercent)}
                ${Metric("Músculo", entry.musclePercent)}
            </div>

        </div>

    `;

}

export function GymBodyComposition() {

    const entries = getBodyCompositionEntries();
    const pendingDeleteId = getBodyCompPendingDeleteId();

    return `

        <div class="gym-bodycomp">

            ${EntryForm()}

            ${WeightChart(entries)}

            ${entries.length ? `

                <section class="gym-bodycomp-history">

                    <h3 class="gym-bodycomp-title">Historial</h3>

                    ${entries.map(entry => HistoryRow(entry, pendingDeleteId)).join("")}

                </section>

            ` : ""}

        </div>

    `;

}
