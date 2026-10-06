import "./GymBodyComposition.css";

import {
    getBodyCompositionEntries,
    getBodyCompositionEntryById,
    getLatestBodyComposition,
    getBodyCompositionSeries,
    getLatestWaist,
    BODY_METRICS
} from "../../../data/bodyCompositionStore.js";
import { getWeeklyBodySummary } from "../../../data/weeklyBodySummary.js";
import { formatISODate, parseISODate, addDays } from "../../../utils/date.js";
import { formatKm } from "../../../utils/format.js";
import { getBodyCompEditingId, getBodyCompPendingDeleteId, getBodyCompChartMetric, isBodyCompHistoryExpanded } from "../gymStore.js";

// Pestaña "Composición corporal" de Gimnasio, con la estructura del mockup
// de rediseño (2026-09-24): Último registro (4 tarjetas con comparación),
// Evolución de los últimos 30 días, Nuevo registro e Historial. Los datos
// son exactamente los registrados -- un campo vacío es "—", una
// comparación solo existe si hay un valor anterior real, y el gráfico
// solo tiene punto donde hay registro.

// better: la única dirección que es una mejora SIN conocer el objetivo de
// la persona (menos grasa, más músculo). Peso y agua no la tienen: bajar
// de peso no es bueno o malo per se, así que su cambio va siempre en
// neutro (pulido final 2026-10-06 -- antes "↓ peso" salía en verde).
const METRICS = {
    weightKg: { label: "Peso", unit: "kg", icon: "mdi:weight-kilogram", field: "Peso (kg)", better: null },
    bodyFatPercent: { label: "Grasa", unit: "%", icon: "mdi:percent", field: "Grasa (%)", better: "down" },
    waterPercent: { label: "Agua", unit: "%", icon: "solar:waterdrop-bold", field: "Agua (%)", better: null },
    musclePercent: { label: "Músculo", unit: "%", icon: "mdi:arm-flex", field: "Músculo (%)", better: "up" },
    // Opcional desde 2026-10-07. Sin mini tarjeta propia (ver WaistLine()).
    waistCm: { label: "Cintura", unit: "cm", icon: "mdi:tape-measure", field: "Cintura (cm)", better: null }
};

// Medidas del gráfico: la cintura solo cuando ya hay 2 registros con ella
// (con menos no hay línea que dibujar, y un chip que siempre lleva a
// "Necesitas al menos 2 registros" no aporta).
function chartMetrics(entries) {

    const waistCount = entries.filter(entry => entry.waistCm != null).length;
    return Object.keys(METRICS).filter(metric => metric !== "waistCm" || waistCount >= 2);

}

// "−0,4" / "+1" / "=": el signo menos tipográfico, sin color (neutro).
function formatChange(value) {

    if (value === 0) return "=";
    return `${value > 0 ? "+" : "−"}${formatKm(Math.abs(value))}`;

}

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

// Solo el cambio ("−0,4 kg"), en verde únicamente si es una mejora real
// (ver METRICS.better) y si no en neutro -- sin rojo, que sería un juicio
// que el registro no dice. La fecha con la que se compara va una sola vez
// en la cabecera (commonPreviousDate); solo se repite en la tarjeta si
// ESA medida se compara con otro registro (p. ej. grasa sin dato el
// último día).
function Delta(metric, info, commonPreviousDate) {

    if (info.delta == null) return "";

    const otherDate = info.previousDate !== commonPreviousDate ? `<span>vs. ${formatDate(info.previousDate)}</span>` : "";

    if (info.delta === 0) return `<small class="gym-bc-delta">=${otherDate}</small>`;

    const up = info.delta > 0;
    const better = METRICS[metric].better;
    const good = better != null && (better === "up") === up;

    return `<small class="gym-bc-delta ${good ? "is-good" : ""}">${up ? "+" : "−"}${formatNumber(Math.abs(info.delta))} ${METRICS[metric].unit}${otherDate}</small>`;

}

function MetricTile(metric, info, commonPreviousDate) {

    const { label, unit, icon } = METRICS[metric];
    const empty = info.value == null;

    return `

        <div class="gym-bc-tile ${empty ? "is-empty" : ""} ${metric === "weightKg" ? "is-main" : ""}">
            <span class="gym-bc-tile-label"><iconify-icon icon="${icon}"></iconify-icon>${label}</span>
            <strong>${empty ? "—" : formatNumber(info.value)}${empty ? "" : `<small> ${unit}</small>`}</strong>
            ${empty ? "" : Delta(metric, info, commonPreviousDate)}
        </div>

    `;

}

// La fecha de comparación más repetida entre las medidas que sí tienen un
// registro anterior -- null si ninguna lo tiene (primer registro).
function mostCommonPreviousDate(metrics) {

    const counts = new Map();

    Object.values(metrics).forEach(info => {
        if (info.delta != null) counts.set(info.previousDate, (counts.get(info.previousDate) ?? 0) + 1);
    });

    let best = null;
    counts.forEach((count, date) => { if (best == null || count > counts.get(best)) best = date; });

    return best;

}

// Cintura bajo las 4 mini tarjetas, en una línea, en vez de una 5.ª
// tarjeta (en 393px no caben 5 sin encoger las otras 4): la última medida
// aunque sea de otro día que el pesaje -- entonces lleva su fecha -- y su
// cambio respecto a la anterior, en neutro. Sin ninguna medida, nada.
function WaistLine(latestDate) {

    const waist = getLatestWaist();
    if (!waist) return "";

    const change = waist.delta != null ? ` (${formatChange(waist.delta)})` : "";
    const date = waist.date !== latestDate ? ` · ${formatDate(waist.date)}` : "";

    return `<p class="gym-bc-waist"><iconify-icon icon="${METRICS.waistCm.icon}"></iconify-icon>Cintura <b>${formatNumber(waist.value)} cm</b>${change}${date}</p>`;

}

function LatestCard() {

    const latest = getLatestBodyComposition();

    if (!latest) {

        return `

            <section class="gym-bodycomp-card">
                <header class="gym-bc-head"><h3>Último registro</h3></header>
                <p class="gym-bc-empty">Aún no hay ningún registro. Añade el primero abajo.</p>
            </section>

        `;

    }

    const previousDate = mostCommonPreviousDate(latest.metrics);

    return `

        <section class="gym-bodycomp-card">

            <header class="gym-bc-head">
                <h3>Último registro</h3>
                <span>${formatDate(latest.date, { withYear: true })}${previousDate ? ` · vs. ${formatDate(previousDate)}` : ""}</span>
            </header>

            <div class="gym-bc-tiles">
                ${BODY_METRICS.map(metric => MetricTile(metric, latest.metrics[metric], previousDate)).join("")}
            </div>

            ${WaistLine(latest.date)}

            ${previousDate ? "" : `<p class="gym-bc-note">Primer registro · añade otro para empezar a ver tu evolución.</p>`}

        </section>

    `;

}

// ---- Evolución ----------------------------------------------------------------

const CHART = { width: 320, height: 120, left: 28, right: 8, top: 8, bottom: 22 };

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

        // Sin hueco de gráfico: solo la frase. Si en total sí hay 2 o más
        // registros de esta medida pero no dentro de la ventana, se dice.
        const total = getBodyCompositionEntries().filter(entry => entry[metric] != null).length;

        return `<p class="gym-bc-empty">${total >= 2 ? "Necesitas al menos 2 registros en los últimos 30 días para mostrar evolución." : "Necesitas al menos 2 registros para mostrar evolución."}</p>`;

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

    const xLabels = [0, 7, 14, 21, 28].map(offset => addDays(today, -(CHART_DAYS - 1) + offset));

    return `

        <svg class="gym-bc-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Evolución de ${METRICS[metric].label.toLowerCase()}">

            ${ticks.map(t => `
                <line class="gym-bc-grid" x1="${left}" x2="${width - right}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"></line>
                <text class="gym-bc-axis" x="${left - 6}" y="${(y(t) + 3).toFixed(1)}" text-anchor="end">${formatNumber(t)}</text>
            `).join("")}

            ${xLabels.map(iso => `<text class="gym-bc-axis" x="${x(iso).toFixed(1)}" y="${height - 6}" text-anchor="middle">${formatDate(iso)}</text>`).join("")}

            <polyline class="gym-bc-line" points="${line}"></polyline>

            ${coords.map(([cx, cy], i) => `<circle class="gym-bc-dot" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3.5"><title>${formatDate(points[i].date)}: ${formatNumber(points[i].value)} ${METRICS[metric].unit}</title></circle>`).join("")}

        </svg>

    `;

}

function signedPart(value, unit, change) {

    if (value == null) return "—";
    return `${formatNumber(value)}${unit}${change != null ? ` (${formatChange(change)})` : ""}`;

}

// Una línea por semana (las últimas 4 con algún dato), solo datos y en
// neutro: "Semana 41 · peso 80,9 kg (−0,4) · cintura 84 cm (−1) · dieta
// 71%". Sin ninguna semana con datos, el bloque no se pinta.
function WeeklyLines() {

    const weeks = getWeeklyBodySummary(formatISODate(new Date()));
    if (!weeks.length) return "";

    return `

        <ul class="gym-bc-weeks" aria-label="Resumen por semana">
            ${weeks.map(week => `
                <li>
                    <b>Semana ${week.weekNumber}</b>
                    <span>peso ${signedPart(week.weightKg, " kg", week.weightDelta)} · cintura ${signedPart(week.waistCm, " cm", week.waistDelta)} · dieta ${week.dietPercent == null ? "—" : `${week.dietPercent}%`}</span>
                </li>
            `).join("")}
        </ul>

    `;

}

function EvolutionCard() {

    const available = chartMetrics(getBodyCompositionEntries());
    const selected = getBodyCompChartMetric();
    // Cintura elegida y luego borrados sus registros: vuelve a Peso.
    const metric = available.includes(selected) ? selected : "weightKg";

    return `

        <section class="gym-bodycomp-card">

            <header class="gym-bc-head">
                <h3>Evolución <small>· últimos 30 días</small></h3>
            </header>

            <div class="gym-bc-chips" role="group" aria-label="Medida del gráfico">
                ${available.map(key => `<button class="gym-bc-chip ${key === metric ? "is-active" : ""}" data-action="bodycomp-chart-metric" data-metric="${key}" aria-pressed="${key === metric}">${METRICS[key].label}</button>`).join("")}
            </div>

            ${EvolutionChart(metric)}

            ${WeeklyLines()}

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
    const latestWaist = getLatestWaist();
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
                ${Object.entries(METRICS).map(([key, m]) => {

                    // Placeholder (gris, no se guarda): el último valor
                    // conocido -- para la cintura, la última medida aunque
                    // no sea del último registro.
                    const last = key === "waistCm" ? latestWaist?.value : latest?.metrics[key].value;

                    return `
                        <label>
                            <span>${m.field}</span>
                            <input type="text" inputmode="decimal" data-field="${key}" value="${editing?.[key] != null ? formatNumber(editing[key]) : ""}" placeholder="${last != null ? formatNumber(last) : "—"}">
                        </label>
                    `;

                }).join("")}
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
            <span class="gym-bc-row-date">${formatDate(entry.date, { withYear: true })}${entry.waistCm != null ? `<small>cintura ${formatNumber(entry.waistCm)} cm</small>` : ""}</span>
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
                <h3>Historial</h3>
            </header>

            <div class="gym-bc-rows">
                ${shown.map(entry => HistoryRow(entry, editingId)).join("")}
            </div>

            ${entries.length > HISTORY_PREVIEW ? `
                <button class="gym-bc-link gym-bc-history-toggle" data-action="bodycomp-history-toggle" aria-expanded="${expanded}">${expanded ? "Ver menos" : "Ver historial completo"} <iconify-icon icon="solar:alt-arrow-${expanded ? "up" : "right"}-linear"></iconify-icon></button>
            ` : ""}

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
