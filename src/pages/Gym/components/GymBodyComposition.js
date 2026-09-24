import "./GymBodyComposition.css";

import {
    getBodyCompositionEntries,
    getBodyCompositionEntryById,
    getLatestBodyComposition,
    getBodyCompositionSeries
} from "../../../data/bodyCompositionStore.js";
import { formatISODate, parseISODate, addDays } from "../../../utils/date.js";
import { formatKm } from "../../../utils/format.js";
import { getBodyCompEditingId, getBodyCompPendingDeleteId, getBodyCompChartMetric, isBodyCompHistoryExpanded } from "../gymStore.js";

// Pestaña "Composición corporal" de Gimnasio, con la estructura del mockup
// de rediseño (2026-09-24): Último registro (4 tarjetas con comparación),
// Evolución de los últimos 30 días, Nuevo registro e Historial. Los datos
// son exactamente los registrados -- un campo vacío es "—", una
// comparación solo existe si hay un valor anterior real, y el gráfico
// solo tiene punto donde hay registro.

const METRICS = {
    weightKg: { label: "Peso", unit: "kg", icon: "mdi:weight-kilogram", field: "Peso (kg)", better: "down" },
    bodyFatPercent: { label: "Grasa", unit: "%", icon: "mdi:percent", field: "Grasa (%)", better: "down" },
    waterPercent: { label: "Agua", unit: "%", icon: "solar:waterdrop-bold", field: "Agua (%)", better: "up" },
    musclePercent: { label: "Músculo", unit: "%", icon: "mdi:arm-flex", field: "Músculo (%)", better: "up" }
};

const HISTORY_PREVIEW = 3;
const CHART_DAYS = 30;

// Un decimal como mucho, coma decimal (mismo criterio que formatKm()).
function formatNumber(value) {

    return formatKm(value);

}

const shortDate = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" });

// "24 sept" / "24 sept 2026".
function formatDate(iso, { withYear = false } = {}) {

    const text = shortDate.format(parseISODate(iso)).replace(".", "");
    return withYear ? `${text} ${iso.slice(0, 4)}` : text;

}

// ---- Último registro --------------------------------------------------------

// Verde si el cambio va en la dirección buena para esa métrica (menos peso
// y grasa, más agua y músculo); si no, en gris -- sin rojo, que sería un
// juicio que el registro no dice.
function Delta(metric, info) {

    if (info.delta == null) return `<small class="gym-bc-delta is-empty">sin registro anterior</small>`;

    if (info.delta === 0) return `<small class="gym-bc-delta">= igual<br><span>vs. ${formatDate(info.previousDate)}</span></small>`;

    const up = info.delta > 0;
    const good = (METRICS[metric].better === "up") === up;

    return `

        <small class="gym-bc-delta ${good ? "is-good" : ""}">
            ${up ? "↑" : "↓"} ${formatNumber(Math.abs(info.delta))} ${METRICS[metric].unit}
            <span>vs. ${formatDate(info.previousDate)}</span>
        </small>

    `;

}

function MetricTile(metric, info) {

    const { label, unit, icon } = METRICS[metric];

    return `

        <div class="gym-bc-tile ${info.value == null ? "is-empty" : ""}">
            <iconify-icon icon="${icon}"></iconify-icon>
            <span class="gym-bc-tile-label">${label}</span>
            <strong>${info.value == null ? "—" : formatNumber(info.value)}</strong>
            <span class="gym-bc-tile-unit">${unit}</span>
            ${info.value == null ? `<small class="gym-bc-delta is-empty">sin dato</small>` : Delta(metric, info)}
        </div>

    `;

}

function LatestCard() {

    const latest = getLatestBodyComposition();

    return `

        <section class="gym-bodycomp-card">

            <header class="gym-bc-head">
                <h3>Último registro</h3>
                ${latest ? `<span>${formatDate(latest.date, { withYear: true })}</span>` : ""}
            </header>

            ${latest ? `
                <div class="gym-bc-tiles">
                    ${Object.keys(METRICS).map(metric => MetricTile(metric, latest.metrics[metric])).join("")}
                </div>
            ` : `<p class="gym-bc-empty">Todavía no hay ningún registro. Añade el primero abajo.</p>`}

        </section>

    `;

}

// ---- Evolución ----------------------------------------------------------------

const CHART = { width: 320, height: 150, left: 28, right: 8, top: 10, bottom: 24 };

// Marcas del eje Y: 4 valores redondos que cubren el rango con margen.
function yTicks(values) {

    let lo = Math.floor(Math.min(...values) - 0.5);
    let hi = Math.ceil(Math.max(...values) + 0.5);
    while (hi - lo < 3) { lo -= 1; hi += 1; }

    const step = Math.ceil((hi - lo) / 3);
    return [lo, lo + step, lo + 2 * step, lo + 3 * step];

}

// Mismo criterio que el gráfico de antes: eje X por FECHA real (un hueco
// sin registros se ve como hueco) y tramos rectos entre registros -- una
// curva suavizada inventaría valores entre dos pesajes.
function EvolutionChart(metric) {

    const today = formatISODate(new Date());
    const points = getBodyCompositionSeries(metric, today, CHART_DAYS);

    if (points.length < 2) {

        return `<p class="gym-bc-empty">${points.length ? "Con un segundo registro en estos 30 días verás aquí la evolución." : "Sin registros de esta medida en los últimos 30 días."}</p>`;

    }

    const { width, height, left, right, top, bottom } = CHART;
    const start = parseISODate(addDays(today, -(CHART_DAYS - 1))).getTime();
    const span = parseISODate(today).getTime() - start;

    const ticks = yTicks(points.map(p => p.value));
    const [lo, hi] = [ticks[0], ticks[3]];

    const x = iso => left + ((parseISODate(iso).getTime() - start) / span) * (width - left - right);
    const y = value => top + (1 - (value - lo) / (hi - lo)) * (height - top - bottom);

    const coords = points.map(p => [x(p.date), y(p.value)]);
    const line = coords.map(([cx, cy]) => `${cx.toFixed(1)},${cy.toFixed(1)}`).join(" ");
    const baseY = height - bottom;
    const area = `${coords[0][0].toFixed(1)},${baseY} ${line} ${coords.at(-1)[0].toFixed(1)},${baseY}`;

    const xLabels = [0, 7, 14, 21, 28].map(offset => addDays(today, -(CHART_DAYS - 1) + offset));

    return `

        <svg class="gym-bc-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Evolución de ${METRICS[metric].label.toLowerCase()}">

            <defs>
                <linearGradient id="gym-bc-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--color-primary)" stop-opacity=".35"></stop>
                    <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0"></stop>
                </linearGradient>
            </defs>

            ${ticks.map(t => `
                <line class="gym-bc-grid" x1="${left}" x2="${width - right}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"></line>
                <text class="gym-bc-axis" x="${left - 6}" y="${(y(t) + 3).toFixed(1)}" text-anchor="end">${formatNumber(t)}</text>
            `).join("")}

            ${xLabels.map(iso => `<text class="gym-bc-axis" x="${x(iso).toFixed(1)}" y="${height - 6}" text-anchor="middle">${formatDate(iso)}</text>`).join("")}

            <polygon class="gym-bc-area" points="${area}" fill="url(#gym-bc-area)"></polygon>
            <polyline class="gym-bc-line" points="${line}"></polyline>

            ${coords.map(([cx, cy], i) => `<circle class="gym-bc-dot" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3.5"><title>${formatDate(points[i].date)}: ${formatNumber(points[i].value)} ${METRICS[metric].unit}</title></circle>`).join("")}

        </svg>

    `;

}

function EvolutionCard() {

    const metric = getBodyCompChartMetric();

    return `

        <section class="gym-bodycomp-card">

            <header class="gym-bc-head">
                <h3>Evolución <small>(últimos 30 días)</small></h3>
                <label class="gym-bc-select">
                    <select data-action="bodycomp-chart-metric" aria-label="Medida del gráfico">
                        ${Object.entries(METRICS).map(([key, m]) => `<option value="${key}" ${key === metric ? "selected" : ""}>${m.label} (${m.unit})</option>`).join("")}
                    </select>
                    <iconify-icon icon="solar:alt-arrow-down-linear"></iconify-icon>
                </label>
            </header>

            ${EvolutionChart(metric)}

        </section>

    `;

}

// ---- Nuevo registro --------------------------------------------------------------

// Inputs sin controlar: se leen del DOM al pulsar Guardar (ver
// saveBodyCompositionEntry en initGymEvents.js) -- nunca un rerender() por
// tecla, que cerraría el teclado del móvil. El último valor de cada medida
// va como placeholder (gris), no como valor: no se guarda si no se teclea.
function EntryForm() {

    const editingId = getBodyCompEditingId();
    const editing = editingId ? getBodyCompositionEntryById(editingId) : null;
    const latest = getLatestBodyComposition();
    const today = formatISODate(new Date());
    const confirmingDelete = editing && getBodyCompPendingDeleteId() === editing.id;

    return `

        <section class="gym-bodycomp-card gym-bodycomp-form">

            <header class="gym-bc-head">
                <h3>${editing ? "Editar registro" : "Nuevo registro"}</h3>
                <label class="gym-bc-date">
                    <input type="date" data-field="date" value="${editing?.date ?? today}" max="${today}" aria-label="Fecha del registro">
                    <iconify-icon icon="solar:calendar-linear"></iconify-icon>
                </label>
            </header>

            <!-- Lo rellena saveBodyCompositionEntry() (initGymEvents.js) en
                 sitio, sin rerender(): repintar vaciaría lo ya tecleado. -->
            <div class="gym-builder-error" data-bodycomp-error hidden></div>

            <div class="gym-bc-fields">
                ${Object.entries(METRICS).map(([key, m]) => `
                    <label>
                        <span>${m.field}</span>
                        <input type="text" inputmode="decimal" data-field="${key}" value="${editing?.[key] != null ? formatNumber(editing[key]) : ""}" placeholder="${latest?.metrics[key].value != null ? formatNumber(latest.metrics[key].value) : "—"}">
                    </label>
                `).join("")}
            </div>

            <div class="gym-bodycomp-form-actions">
                ${editing ? `<button class="gym-bodycomp-cancel" data-action="cancel-bodycomp-edit">Cancelar</button>` : ""}
                <button class="gym-bc-save" data-action="save-bodycomp-entry">${editing ? "Guardar cambios" : "Guardar registro"}</button>
            </div>

            ${editing ? `
                <button class="gym-bc-delete ${confirmingDelete ? "is-confirming" : ""}" data-action="delete-bodycomp-entry" data-entry-id="${editing.id}">
                    ${confirmingDelete ? "Pulsa otra vez para borrar este registro" : "Borrar registro"}
                </button>
            ` : ""}

        </section>

    `;

}

// ---- Historial ----------------------------------------------------------------------

function percent(value) {

    return value == null ? "—" : `${formatNumber(value)}%`;

}

function HistoryRow(entry, editingId) {

    return `

        <button class="gym-bc-row ${editingId === entry.id ? "is-editing" : ""}" data-action="edit-bodycomp-entry" data-entry-id="${entry.id}" aria-label="Editar el registro del ${formatDate(entry.date, { withYear: true })}">
            <iconify-icon icon="mdi:weight-kilogram"></iconify-icon>
            <span class="gym-bc-row-date">${formatDate(entry.date, { withYear: true })}</span>
            <span>${formatNumber(entry.weightKg)} kg</span>
            <span>${percent(entry.bodyFatPercent)}</span>
            <span>${percent(entry.waterPercent)}</span>
            <span>${percent(entry.musclePercent)}</span>
            <iconify-icon icon="solar:alt-arrow-right-linear"></iconify-icon>
        </button>

    `;

}

function HistoryCard(entries) {

    if (!entries.length) return "";

    const expanded = isBodyCompHistoryExpanded();
    const shown = expanded ? entries : entries.slice(0, HISTORY_PREVIEW);
    const editingId = getBodyCompEditingId();

    return `

        <section class="gym-bodycomp-card">

            <header class="gym-bc-head">
                <h3>Historial de registros</h3>
                ${entries.length > HISTORY_PREVIEW ? `
                    <button class="gym-bc-link" data-action="bodycomp-history-toggle">${expanded ? "Ver menos" : "Ver todo"} <iconify-icon icon="solar:alt-arrow-right-linear"></iconify-icon></button>
                ` : ""}
            </header>

            <div class="gym-bc-rows">
                ${shown.map(entry => HistoryRow(entry, editingId)).join("")}
            </div>

        </section>

    `;

}

export function GymBodyComposition() {

    const entries = getBodyCompositionEntries();

    return `

        <div class="gym-bodycomp">

            ${LatestCard()}

            ${EvolutionCard()}

            ${EntryForm()}

            ${HistoryCard(entries)}

        </div>

    `;

}
