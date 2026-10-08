import "./GymDiet.css";

import {
    getActiveDietPlan,
    resolveDietDay,
    getEatenForDate,
    getWeekendLongRunDay,
    computeDayCompliance,
    getWeekCompliance,
    getTrainingTimeForDate,
    getDietMenu,
    canChooseRestDay,
    REST_TRAINING_TIME
} from "../../../data/dietStore.js";
import { TRAINING_TIMES } from "../../../utils/dietCsv.js";
import { formatISODate, formatDayMonth, getWeekStartDate, addDays, parseISODate } from "../../../utils/date.js";
import { getMealImages, splitMealText } from "../dietDisplay.js";
import { getDietImport, isDietWeekendPickerOpen, isDietDeletePending, isDietSectionOpen } from "../gymStore.js";

// "Mi dieta" (Nutrición, Gimnasio) con la estructura del mockup de
// rediseño (2026-09-24): anillo de cumplimiento con la fila de la semana,
// cabecera del tipo de día con hidratación/ajuste aparte, y una tarjeta por
// comida con su casilla, sus opciones y una imagen. El texto de la dieta
// es el del CSV tal cual (ver utils/dietCsv.js); lo único añadido son
// etiquetas fijas de la interfaz.

// Texto del CSV -- siempre escapado.
function escapeHtml(text) {

    return String(text ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

}

const DAY_INFO = {
    LUNES: { title: "Lunes", subtitle: "Plan nutricional del lunes", icon: "solar:calendar-bold-duotone" },
    MARTES: { title: "Martes", subtitle: "Plan nutricional del martes", icon: "solar:calendar-bold-duotone" },
    MIERCOLES: { title: "Miércoles", subtitle: "Plan nutricional del miércoles", icon: "solar:calendar-bold-duotone" },
    JUEVES: { title: "Jueves", subtitle: "Plan nutricional del jueves", icon: "solar:calendar-bold-duotone" },
    VIERNES: { title: "Viernes", subtitle: "Plan nutricional del viernes", icon: "solar:calendar-bold-duotone" },
    TIRADA_LARGA: { title: "Tirada larga", subtitle: "Plan nutricional para tu tirada larga", icon: "solar:running-round-bold-duotone" },
    DESCANSO: { title: "Descanso", subtitle: "Plan nutricional para tu día de descanso", icon: "solar:sofa-2-bold-duotone" }
};

const WEEK_LETTERS = ["L", "M", "X", "J", "V", "S", "D"];

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

function FreeLogButton() {

    return `

        <button class="gym-bodycomp-cancel gym-diet-file" data-action="set-nutrition-view" data-view="registro">
            <iconify-icon icon="solar:magnifer-linear"></iconify-icon>
            <span>Registro libre de alimentos</span>
        </button>

    `;

}

// Hora del intento: dos intentos seguidos con el mismo archivo y los
// mismos errores se distinguen en pantalla.
function AttemptTime(state) {

    return state.attemptAt ? ` <span class="gym-diet-attempt">(${new Date(state.attemptAt).toLocaleTimeString("es-ES")})</span>` : "";

}

function ImportSuccess(state) {

    if (state.importedFileName == null) return "";

    return `

        <div class="gym-diet-success" role="status" data-diet-import-feedback>
            <iconify-icon icon="solar:check-circle-bold-duotone"></iconify-icon>
            <p><strong>Dieta importada</strong>${state.importedFileName ? `: «${escapeHtml(state.importedFileName)}»` : ""}${AttemptTime(state)}</p>
        </div>

    `;

}

// Todos los errores del CSV rechazado, con su línea: no se importa nada
// hasta que el archivo encaja entero.
function ImportErrors(state) {

    if (!state.errors.length) return "";

    return `

        <div class="gym-builder-error gym-diet-errors" role="alert" data-diet-import-feedback>
            <p><strong>No se ha importado ${state.fileName ? `«${escapeHtml(state.fileName)}»` : "el archivo"}</strong>${AttemptTime(state)}: no sigue la plantilla. Corrige esto y vuelve a elegirlo:</p>
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
                ${FreeLogButton()}
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

// ---- Cumplimiento: anillo + semana -----------------------------------------------

const RING = { size: 84, stroke: 8 };

function Ring(percent) {

    const r = (RING.size - RING.stroke) / 2;
    const circumference = 2 * Math.PI * r;
    const filled = circumference * (percent ?? 0) / 100;

    return `

        <div class="gym-diet-ring">
            <svg viewBox="0 0 ${RING.size} ${RING.size}" aria-hidden="true">
                <defs>
                    <linearGradient id="gym-diet-ring-gradient" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stop-color="var(--color-primary)"></stop>
                        <stop offset="100%" stop-color="var(--color-success)"></stop>
                    </linearGradient>
                </defs>
                <circle class="gym-diet-ring-track" cx="${RING.size / 2}" cy="${RING.size / 2}" r="${r}"></circle>
                <circle class="gym-diet-ring-value" cx="${RING.size / 2}" cy="${RING.size / 2}" r="${r}"
                    stroke-dasharray="${filled.toFixed(2)} ${circumference.toFixed(2)}"
                    transform="rotate(-90 ${RING.size / 2} ${RING.size / 2})"></circle>
            </svg>
            <strong>${percent == null ? "—" : `${percent}%`}</strong>
        </div>

    `;

}

// Estado de cada día de la semana: completo (todas las comidas), parcial
// (anillo proporcional), sin nada, futuro, y el día que se está viendo.
function WeekDay(day, index, viewedDate, today) {

    const complete = day.percent === 100;
    const partial = !complete && day.percent > 0;
    const classes = [
        "gym-diet-weekday",
        complete ? "is-complete" : "",
        partial ? "is-partial" : "",
        day.future ? "is-future" : "",
        day.date === viewedDate ? "is-selected" : "",
        day.date === today ? "is-today" : ""
    ].filter(Boolean).join(" ");

    return `

        <button class="${classes}" data-action="nutrition-day" data-date="${day.date}" aria-label="${day.date}${day.percent != null ? `: ${day.percent}%` : ""}" style="--day-percent:${day.percent ?? 0}">
            <small>${WEEK_LETTERS[index]}</small>
            <span class="gym-diet-weekday-number">${parseISODate(day.date).getDate()}</span>
            <span class="gym-diet-weekday-dot">${complete ? `<iconify-icon icon="mdi:check-bold"></iconify-icon>` : ""}</span>
        </button>

    `;

}

function ComplianceCard(date, compliance) {

    const today = formatISODate(new Date());
    const week = getWeekCompliance(date, today);

    return `

        <section class="gym-bodycomp-card gym-diet-compliance">

            <h3 class="gym-bc-title">${date === today ? "Cumplimiento de hoy" : "Cumplimiento del día"}</h3>

            <div class="gym-diet-compliance-body">

                <div class="gym-diet-ring-block">
                    ${Ring(compliance?.percent ?? null)}
                    <span>${compliance ? `${compliance.done} de ${compliance.total} comidas` : "Sin menú este día"}</span>
                </div>

                <div class="gym-diet-week" aria-label="Semana">
                    ${week.map((day, i) => WeekDay(day, i, date, today)).join("")}
                </div>

            </div>

        </section>

    `;

}

// ---- Día y comidas -----------------------------------------------------------------

// HIDRATACION y AJUSTE: información del día, no comida -- sin casillas y
// con su propio estilo.
// AJUSTE compacto: como resumen, lo que va antes de "SI ENTRENAS POR LA
// MAÑANA" (las indicaciones por franja vienen detrás); sin ese marcador,
// el texto entero recortado a 3 líneas. "Ver indicaciones" despliega el
// texto COMPLETO, tal cual viene del CSV -- nunca se reescribe ni se
// quita nada. Sin marcador, el botón solo aparece si el texto de verdad
// se corta (ver setupDietClamps en initGymDietEvents.js).
const ADJUSTMENT_SPLIT = /\s*SI ENTRENAS POR LA MA(Ñ|N)ANA/i;

function Adjustment(text) {

    const match = text.match(ADJUSTMENT_SPLIT);
    const summary = match && match.index > 0 ? text.slice(0, match.index).trim() : text;

    return `

        <div class="gym-diet-adjust" data-diet-adjust data-has-marker="${Boolean(match && match.index > 0)}">
            <p><iconify-icon icon="solar:info-circle-bold-duotone"></iconify-icon><b>Ajuste</b></p>
            <p class="gym-diet-adjust-summary">${escapeHtml(summary)}</p>
            <p class="gym-diet-adjust-full" hidden>${escapeHtml(text)}</p>
            <button class="gym-meal-more" data-action="diet-toggle-ajuste" hidden>Ver indicaciones ›</button>
        </div>

    `;

}

function DayInfo(day) {

    if (!day.hydration && !day.adjustment) return "";

    return `

        <div class="gym-diet-info">
            ${day.hydration ? `<p><iconify-icon icon="solar:waterdrop-bold-duotone"></iconify-icon><b>Hidratación</b><span>${escapeHtml(day.hydration)}</span></p>` : ""}
            ${day.adjustment ? Adjustment(day.adjustment) : ""}
        </div>

    `;

}

// `menuDay`: el día cuyo AJUSTE/HIDRATACION se enseña -- el propio, o el
// DESCANSO si ese día se ha elegido la pestaña Descanso.
function DayHeader(dayKey, menuDay, isRestMenu) {

    const info = DAY_INFO[dayKey];
    const weekend = dayKey === "TIRADA_LARGA" || dayKey === "DESCANSO";
    const subtitle = isRestMenu ? DAY_INFO.DESCANSO.subtitle : info.subtitle;

    return `

        <section class="gym-bodycomp-card gym-diet-day-card">

            <div class="gym-diet-day-head">
                <iconify-icon class="gym-diet-day-icon" icon="${info.icon}"></iconify-icon>
                <div>
                    <h3>${info.title}</h3>
                    <p>${subtitle}</p>
                </div>
                ${weekend ? `<button class="gym-diet-change" data-action="diet-weekend-change">Cambiar <iconify-icon icon="solar:alt-arrow-down-linear"></iconify-icon></button>` : ""}
            </div>

            ${DayInfo(menuDay)}

        </section>

    `;

}

function MealPhoto(text) {

    const images = getMealImages(text);

    return `

        <div class="gym-meal-photo ${images.length > 1 ? "is-pair" : ""}" aria-hidden="true">
            ${images.map(image => `<img src="${image.src}" alt="">`).join("")}
        </div>

    `;

}

// "momento" del CSV tal cual: si es una hora ("09:00") va como hora arriba
// a la izquierda; si es un nombre ("Post-gym", "Desayuno") como etiqueta
// pequeña en cian. Mismo texto en los dos casos -- solo cambia el estilo,
// nunca se renombra ni se inventa una etiqueta.
function MomentLabel(moment) {

    const isTime = /^\d{1,2}[:.]\d{2}$/.test(moment.trim());

    return `<span class="gym-meal-moment ${isTime ? "is-time" : "is-tag"}">${escapeHtml(moment)}</span>`;

}

// Hora entre corchetes al principio del texto ("[07:45] Café…", "[21:30-
// 22:00] …"): si TODAS las opciones de la comida empiezan por la misma, se
// muestra una vez en la cabecera y no se repite en cada opción. Solo es
// presentación: el texto guardado no cambia, y si las horas no coinciden
// cada opción la sigue llevando.
const LEADING_TIME = /^\[([^\]]+)\]\s*/;

function sharedTime(options) {

    const times = options.map(option => option.text.match(LEADING_TIME)?.[1] ?? null);
    return times[0] && times.every(time => time === times[0]) ? times[0] : null;

}

function optionText(text, time) {

    return time ? text.replace(LEADING_TIME, "") : text;

}

// Con 3 o más opciones se ven 2 y "Ver N opciones más" despliega el resto
// en la misma tarjeta. Si la opción marcada está entre las ocultas, la
// tarjeta sale ya desplegada.
const VISIBLE_OPTIONS = 2;

function OptionButton(meal, option, eatenKey, time) {

    return `

        <button class="gym-meal-option ${option.key === eatenKey ? "is-selected" : ""}" role="radio" aria-checked="${option.key === eatenKey}" data-action="diet-toggle-meal" data-meal-key="${escapeHtml(meal.key)}" data-option-key="${escapeHtml(option.key)}">
            <span class="gym-meal-radio" aria-hidden="true"></span>
            <span class="gym-meal-clamp"><b>${option.number}.</b> ${escapeHtml(optionText(option.text, time))}</span>
        </button>

    `;

}

// Una tarjeta por comida (pulido final de Nutrición): casilla pequeña,
// hora (si la hay) y nombre -- el momento del CSV sin el prefijo de franja,
// con salto de línea en vez de "…" --, 1-2 líneas de contenido con "Ver
// detalle" solo si de verdad se corta (ver initGymDietEvents.js) e
// ilustración pequeña. Una opción: la casilla la marca. Varias: se elige
// con los radios cuál se comió (y la casilla, ya marcada, la desmarca);
// con ninguna elegida, la casilla pide elegir antes.
function MealCard(meal, eatenKey) {

    const multiple = meal.options.length > 1;
    const eaten = meal.options.find(o => o.key === eatenKey) ?? null;
    const shown = eaten ?? meal.options[0];
    const time = sharedTime(meal.options);

    const visible = meal.options.slice(0, VISIBLE_OPTIONS);
    const hidden = meal.options.length > VISIBLE_OPTIONS ? meal.options.slice(VISIBLE_OPTIONS) : [];
    const shownAll = hidden.length ? visible : meal.options;
    const eatenHidden = hidden.some(option => option.key === eatenKey);

    const body = multiple ? `

        <p class="gym-meal-choose">Elige 1:</p>

        <div class="gym-meal-options" role="radiogroup" aria-label="${escapeHtml(meal.moment)}">
            ${shownAll.map(option => OptionButton(meal, option, eatenKey, time)).join("")}
            ${hidden.length ? `
                <div class="gym-meal-options-extra">
                    ${hidden.map(option => OptionButton(meal, option, eatenKey, time)).join("")}
                </div>
            ` : ""}
        </div>

        <p class="gym-meal-hint" data-meal-hint hidden>Toca la opción que has comido.</p>

    ` : (() => {

        const { main, detail } = splitMealText(optionText(meal.options[0].text, time));
        return `<p class="gym-meal-main gym-meal-clamp">${escapeHtml(main)}${detail ? ` <span class="gym-meal-detail">${escapeHtml(detail)}</span>` : ""}</p>`;

    })();

    return `

        <article class="gym-meal-card ${eaten ? "is-eaten" : ""} ${eatenHidden ? "is-options-open" : ""}" data-meal-card="${escapeHtml(meal.key)}">

            <div class="gym-meal-head">

                <button class="gym-meal-check" role="checkbox" aria-checked="${Boolean(eaten)}" aria-label="${escapeHtml(meal.moment)}: ${eaten ? "comido" : "sin marcar"}"
                    data-action="diet-meal-check" data-meal-key="${escapeHtml(meal.key)}" data-option-key="${escapeHtml((eaten ?? meal.options[0]).key)}" data-multiple="${multiple}" data-eaten="${Boolean(eaten)}">
                    ${eaten ? `<iconify-icon icon="mdi:check-bold"></iconify-icon>` : ""}
                </button>

                <span class="gym-meal-title">
                    ${time ? `<span class="gym-meal-time">${escapeHtml(time)}</span>` : ""}
                    ${MomentLabel(meal.moment)}
                </span>

            </div>

            <div class="gym-meal-body">
                ${body}
                <!-- Los dos enlaces en una sola fila (antes apilados). -->
                <div class="gym-meal-links">
                    ${hidden.length ? `<button class="gym-meal-more gym-meal-more-options" data-action="diet-more-options" data-count="${hidden.length}">${eatenHidden ? "Ver menos opciones" : `Ver ${hidden.length} ${hidden.length === 1 ? "opción" : "opciones"} más`}</button>` : ""}
                    <button class="gym-meal-more" data-action="diet-meal-expand" hidden>Ver detalle</button>
                </div>
            </div>

            ${MealPhoto(shown.text)}

        </article>

    `;

}

// ---- Secundario: notas generales y gestión --------------------------------------------

// REGLAS_GENERALES: aparte y plegables, fuera del checklist de cualquier día.
function GeneralRules(plan) {

    if (!plan.generalRules.length) return "";

    return `

        <details class="gym-bodycomp-card gym-diet-section" data-diet-section="rules" ${isDietSectionOpen("rules") ? "open" : ""}>
            <summary><h3 class="gym-bc-title">Notas generales</h3><iconify-icon icon="solar:alt-arrow-down-linear"></iconify-icon></summary>
            <ol class="gym-diet-rules">
                ${plan.generalRules.map(rule => `<li>${escapeHtml(rule.text)}</li>`).join("")}
            </ol>
        </details>

    `;

}

function Manage(plan, state) {

    const deletePending = isDietDeletePending();
    const open = isDietSectionOpen("manage") || state.errors.length > 0 || deletePending;

    return `

        <details class="gym-bodycomp-card gym-diet-section" data-diet-section="manage" ${open ? "open" : ""}>
            <summary><h3 class="gym-bc-title"><iconify-icon icon="solar:menu-dots-bold"></iconify-icon> Gestionar dieta</h3><iconify-icon icon="solar:alt-arrow-down-linear"></iconify-icon></summary>

            <p class="gym-diet-source">${plan.sourceFileName ? escapeHtml(plan.sourceFileName) : "Dieta"} · importada el ${new Date(plan.importedAt).toLocaleDateString("es-ES")}</p>

            ${ImportErrors(state)}

            <div class="gym-diet-actions">
                ${CsvPicker("Importar otra dieta")}
                ${TemplateButton()}
                ${FreeLogButton()}
                <button class="gym-bodycomp-cancel gym-diet-delete ${deletePending ? "is-confirming" : ""}" data-action="diet-delete">${deletePending ? "Pulsa otra vez para borrar la dieta" : "Borrar dieta"}</button>
            </div>
        </details>

    `;

}

// "¿Cuándo entrenas?" -- solo en días con comidas ligadas a una franja
// (momentos "Mañana - …" / "Mediodía - …" / "Tarde - …" en el CSV). Mismo
// selector .gym-detail-tabs que el resto de Gimnasio. La franja se guarda
// en el registro de ese día (ver setTrainingTime en dietStore.js).
// Descanso solo si ese día tiene menú de descanso (sus comidas "Descanso -
// " o el día DESCANSO del plan, ver canChooseRestDay).
function TrainingTimeTabs(date, active, withRest) {

    const tabs = TRAINING_TIMES.filter(time => withRest || time.id !== REST_TRAINING_TIME);

    return `

        <section class="gym-diet-training">

            <h3 class="gym-diet-training-title">¿Cuándo entrenas?</h3>

            <div class="gym-detail-tabs gym-diet-training-tabs" role="tablist" aria-label="Franja de entrenamiento">
                ${tabs.map(time => `
                    <button class="gym-detail-tab ${time.id === active ? "is-active" : ""}" role="tab" aria-selected="${time.id === active}" data-action="diet-training-time" data-date="${date}" data-time="${time.id}">${time.label.toUpperCase()}</button>
                `).join("")}
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

    const eaten = getEatenForDate(date);
    // Qué menú toca: planes sin prefijos, sin franja y todas las comidas
    // (igual que antes); con Descanso, el menú DESCANSO entero.
    const menu = getDietMenu(plan, dayKey, getTrainingTimeForDate(date));
    const hasTimes = menu.trainingTime != null;
    const isRestMenu = menu.trainingTime === REST_TRAINING_TIME;
    const compliance = menu.day ? computeDayCompliance(menu.day, eaten, menu.trainingTime) : null;

    return `

        ${ImportSuccess(state)}

        ${showPicker ? WeekendPicker(date, longRunDay) : ""}

        ${ComplianceCard(date, compliance)}

        ${needsWeekendChoice ? `
            <div class="gym-detail-empty">
                <iconify-icon icon="solar:calendar-bold-duotone"></iconify-icon>
                <p>Elige arriba qué día del fin de semana haces la tirada larga para ver el menú de hoy.</p>
            </div>
        ` : `
            ${DayHeader(dayKey, menu.day, isRestMenu)}
            ${hasTimes ? TrainingTimeTabs(date, menu.trainingTime, canChooseRestDay(plan, dayKey)) : ""}
            <div class="gym-meal-list">
                ${menu.meals.map(meal => MealCard(meal, eaten[meal.key])).join("")}
            </div>
        `}

        ${GeneralRules(plan)}

        ${Manage(plan, state)}

    `;

}
