import "./Running.css";

import { getWorkouts, getShoes, getPossibleDataLoss, getShoeTotalKm } from "../../data/workoutStore.js";
import { RUNNING_WORKOUT_TYPES } from "../../data/runningWorkoutTypes.js";
import { formatDayMonth } from "../../utils/date.js";
import { formatSecondsAsClock, formatShoeName } from "../../utils/format.js";
import { buildTypeProgressInsight, buildProgressMessage, buildPaceComparison, buildComparisonMessage } from "./runningProgress.js";
import { buildTypeSummary } from "./runningSummary.js";
import { buildListInsight } from "./runningListInsight.js";

import { BottomNavigation } from "../../components/Navigation/BottomNavigation.js";

import {
    getWizardStep,
    getProgress,
    getOcrError,
    getParseError,
    getWorkout,
    getSelectedShoeId,
    getAddingNewShoe,
    getSaveError,
    getDuplicateWarning,
    getTimingLog,
    getDetailWorkoutId,
    getTypeFilter,
    getEditingShoeId,
    getNewShoePhoto,
    getSortColumn,
    getSortDirection,
    getHistoryMenuOpenId
} from "./runningStore.js";

import { RunningUploadStep } from "./components/RunningUploadStep.js";
import { RunningReviewStep } from "./components/RunningReviewStep.js";
import { RunningShoeStep } from "./components/RunningShoeStep.js";
import { RunningDetailView } from "./components/RunningDetailView.js";
import { RunningShoesScreen, ShoePhoto, shoeBarPercent, formatKm } from "./components/RunningShoesScreen.js";
import { RunningHeader } from "./components/RunningHeader.js";

function shoeLabel(shoeId, shoes) {

    const shoe = shoes.find(s => s.id === shoeId);
    return shoe ? formatShoeName(shoe) : "Sin zapatilla";

}

function formatDistance(distanceKm) {

    return distanceKm != null ? `${distanceKm.toFixed(2).replace(".", ",")} km` : "—";

}

// A diferencia de typeLabel() (más abajo, usada para el filtro -- ahí un
// tipo vacío significa "Todos"), aquí un workout.type real sin resolver
// simplemente no pinta ninguna etiqueta -- nunca "Todos" en una tarjeta de
// un entreno concreto.
function workoutTypeBadge(type) {

    if (!type) return null;
    return RUNNING_WORKOUT_TYPES.find(t => t.id === type)?.label ?? null;

}

// Reorganizada (retoque de jerarquía): línea 1 fecha+tipo+menú, línea 2
// distancia grande+tiempo (antes ambas cosas compartían la línea 1,
// pequeñas), línea 3 ritmo·FC·temperatura (sin cambios), línea 4 zapatilla
// (sin cambios). La papelera ya no vive suelta -- menú "···" con Eliminar,
// mismo patrón que Plan/Gimnasio (data-session-id reutiliza el mismo
// nombre de atributo que esos menús, aunque aquí sea un workoutId, para
// que el mismo tipo de listener sirva sin inventar un atributo nuevo).
function RunningHistoryItem(workout, shoes) {

    const distance = formatDistance(workout.distanceKm);
    const duration = workout.durationSec != null ? formatSecondsAsClock(workout.durationSec) : "—";
    const pace = workout.avgPaceSecPerKm != null ? `${formatSecondsAsClock(workout.avgPaceSecPerKm)}/km` : "—";
    const hr = workout.avgHr != null ? `${workout.avgHr} ppm` : "—";
    const temperature = workout.temperatureC != null ? `${workout.temperatureC}°C` : "—";
    const typeBadge = workoutTypeBadge(workout.type);
    const isMenuOpen = getHistoryMenuOpenId() === workout.id;

    return `

        <article class="running-history-item" data-action="open-detail" data-workout-id="${workout.id}">

            <header class="history-header">

                <div class="history-header-main">

                    <span class="history-date">${formatDayMonth(workout.date)}</span>

                    ${typeBadge ? `<span class="history-type-badge">${typeBadge}</span>` : ""}

                </div>

                <div class="history-menu">

                    <button
                        class="history-menu-toggle"
                        data-action="toggle-history-menu"
                        data-workout-id="${workout.id}"
                        aria-label="Más opciones"
                    >

                        <iconify-icon icon="solar:menu-dots-bold-duotone"></iconify-icon>

                    </button>

                    ${isMenuOpen ? `

                        <div class="history-menu-popover">

                            <button class="history-menu-danger" data-action="delete-workout" data-workout-id="${workout.id}">
                                <iconify-icon icon="solar:trash-bin-trash-bold-duotone"></iconify-icon>
                                Eliminar
                            </button>

                        </div>

                    ` : ""}

                </div>

            </header>

            <div class="history-headline">

                <span class="history-distance">${distance}</span>

                <span class="history-duration">${duration}</span>

            </div>

            <div class="history-metrics">

                <div class="history-metric">

                    <iconify-icon icon="solar:speedometer-bold-duotone"></iconify-icon>

                    <span>${pace}</span>

                </div>

                <div class="history-metric">

                    <iconify-icon icon="solar:heart-pulse-bold-duotone"></iconify-icon>

                    <span>${hr}</span>

                </div>

                <div class="history-metric">

                    <iconify-icon icon="solar:temperature-bold-duotone"></iconify-icon>

                    <span>${temperature}</span>

                </div>

            </div>

            <div class="history-shoe">

                <iconify-icon icon="solar:running-round-bold-duotone"></iconify-icon>

                <span>${shoeLabel(workout.shoeId, shoes)}</span>

            </div>

        </article>

    `;

}

// Vista de tabla para landscape (ver RunningHistoryTable) — misma fila,
// mismos datos y mismo criterio de "—"/"Sin zapatilla" que RunningHistoryItem,
// y sin botón de borrar (el mockup tampoco lo lleva ahí — borrar sigue
// disponible desde el detalle).
function RunningHistoryRow(workout, shoes) {

    const distance = formatDistance(workout.distanceKm);
    const duration = workout.durationSec != null ? formatSecondsAsClock(workout.durationSec) : "—";
    const pace = workout.avgPaceSecPerKm != null ? `${formatSecondsAsClock(workout.avgPaceSecPerKm)}/km` : "—";
    const hr = workout.avgHr != null ? `${workout.avgHr} ppm` : "—";
    const temperature = workout.temperatureC != null ? `${workout.temperatureC}°C` : "—";

    return `

        <div class="history-table-row" data-action="open-detail" data-workout-id="${workout.id}">

            <span class="history-table-cell">${formatDayMonth(workout.date)}</span>

            <span class="history-table-cell">${distance}</span>

            <span class="history-table-cell">${duration}</span>

            <span class="history-table-cell history-table-cell--pace">${pace}</span>

            <span class="history-table-cell">${hr}</span>

            <span class="history-table-cell">${temperature}</span>

            <span class="history-table-cell history-table-cell--shoe">${shoeLabel(workout.shoeId, shoes)}</span>

            <iconify-icon icon="solar:alt-arrow-right-bold-duotone" class="history-table-chevron"></iconify-icon>

        </div>

    `;

}

// Getter de valor por columna, para ordenar (ver sortWorkoutsByColumn) —
// "shoe" no es un campo directo del workout, así que necesita `shoes`
// para resolver la etiqueta igual que shoeLabel() en el resto de la vista.
const SORT_VALUE_GETTERS = {
    date: workout => workout.date,
    distanceKm: workout => workout.distanceKm,
    durationSec: workout => workout.durationSec,
    avgPaceSecPerKm: workout => workout.avgPaceSecPerKm,
    avgHr: workout => workout.avgHr,
    temperatureC: workout => workout.temperatureC,
    shoe: (workout, shoes) => shoeLabel(workout.shoeId, shoes)
};

// null siempre al final, sea cual sea la dirección — un entreno sin FC
// media no debe "ganar" a los demás solo por ordenar ascendente ni
// "perder" siempre por ordenar descendente. Por eso el signo de la
// dirección solo se aplica a la comparación entre dos valores reales.
function sortWorkoutsByColumn(workouts, shoes, column, direction) {

    const getValue = SORT_VALUE_GETTERS[column];
    if (!getValue) return workouts;

    const sign = direction === "asc" ? 1 : -1;

    return [...workouts].sort((a, b) => {

        const av = getValue(a, shoes);
        const bv = getValue(b, shoes);

        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;

        return typeof av === "string" ? sign * av.localeCompare(bv) : sign * (av - bv);

    });

}

// Cabecera de columna tocable — mismo <button data-action> + indicador
// visible en las columnas inactivas (no solo en la activa) que en el
// nombre de ejercicio de Gym: una flechita solo en la columna activa era
// fácil de pasar por alto y parecía que la tabla no era ordenable.
function SortableHeaderCell(label, column, activeColumn, direction) {

    const isActive = column === activeColumn;
    const icon = isActive ? (direction === "asc" ? "↑" : "↓") : "↕";

    return `

        <button class="history-table-cell history-table-cell--sortable ${isActive ? "is-active" : ""}" data-action="sort-history-table" data-column="${column}">

            ${label}

            <span class="history-table-sort-icon">${icon}</span>

        </button>

    `;

}

// Mapa propio de Running, independiente de WorkoutIcon.js — no se
// reutiliza WorkoutIcon() en sí, está pensado para el badge circular
// grande del calendario de Plan, no para un icono pequeño dentro de un
// chip o de una columna del resumen. (Ojo: WorkoutIcon.js ya no usa estos
// mismos ids desde la migración a WORKOUT_TYPES — easy/series/long eran
// de Plan, aquí siguen siendo los propios de Running.)
const TYPE_ICON = {
    "": "solar:widget-5-bold-duotone",
    easy: "solar:running-bold-duotone",
    series: "solar:bolt-bold-duotone",
    tempo: "solar:clock-circle-bold-duotone",
    long: "solar:route-bold-duotone",
    race: "solar:flag-2-bold-duotone"
};

function typeLabel(type) {
    return type ? (RUNNING_WORKOUT_TYPES.find(t => t.id === type)?.label || type) : "Todos";
}

// "ENTRENOS RODAJE (Z2)" con la etiqueta ya establecida en
// RUNNING_WORKOUT_TYPES (no "ZONA 2" tal cual dice el mockup de ejemplo —
// ese vocabulario no es el nuestro, ya lo usan los chips y el resumen).
function tableTitle(typeFilter) {
    return typeFilter
        ? `ENTRENOS ${typeLabel(typeFilter).toUpperCase()}`
        : "TODOS LOS ENTRENOS";
}

// Vista por defecto de la lista (ver Running.css) — .running-history
// (tarjetas) solo se ve por debajo de los 340px de ancho, como red de
// seguridad para pantallas muy estrechas.
function RunningHistoryTable(filtered, shoes, typeFilter, sortColumn, sortDirection) {

    return `

        <div class="running-history-table">

            <h3 class="history-table-title">${tableTitle(typeFilter)}</h3>

            <div class="history-table">

                <div class="history-table-row history-table-header">

                    ${SortableHeaderCell("FECHA", "date", sortColumn, sortDirection)}

                    ${SortableHeaderCell("KM", "distanceKm", sortColumn, sortDirection)}

                    ${SortableHeaderCell("DURACIÓN", "durationSec", sortColumn, sortDirection)}

                    ${SortableHeaderCell("RITMO", "avgPaceSecPerKm", sortColumn, sortDirection)}

                    ${SortableHeaderCell("FC MEDIA", "avgHr", sortColumn, sortDirection)}

                    ${SortableHeaderCell("TEMP.", "temperatureC", sortColumn, sortDirection)}

                    ${SortableHeaderCell("ZAPATILLA", "shoe", sortColumn, sortDirection)}

                    <span class="history-table-chevron-spacer"></span>

                </div>

                ${filtered.map(workout => RunningHistoryRow(workout, shoes)).join("")}

            </div>

        </div>

    `;

}

// Fila compacta de solo lectura — reutiliza ShoePhoto/shoeBarPercent de
// RunningShoesScreen.js para no duplicar ni la foto ni el umbral de aviso
// de vida útil. Gestionar (añadir/retirar/foto) sigue siendo exclusivo de
// esa pantalla completa; aquí solo se enseña el kilometraje de un vistazo.
function ShoeMileageRow(shoe, km) {

    const bar = shoeBarPercent(shoe, km);

    return `

        <div class="shoe-mileage-row">

            ${ShoePhoto(shoe.photo)}

            <span class="shoe-mileage-name">${formatShoeName(shoe)}</span>

            <div class="shoe-mileage-bar-track">

                <div class="shoe-mileage-bar-fill ${bar ? `shoe-mileage-bar-fill--${bar.tier}` : ""}" style="--progress:${bar ? bar.fillPercent : 0}%"></div>

            </div>

            <span class="shoe-mileage-km">${formatKm(km)}</span>

            <iconify-icon icon="solar:alt-arrow-right-bold-duotone" class="history-table-chevron"></iconify-icon>

        </div>

    `;

}

// Resumen de kilometraje embebido en Running, debajo de la lista de
// carreras — versión compacta de RunningShoesScreen.js (que sigue siendo
// la única pantalla para añadir/retirar/subir foto). "" si no hay ninguna
// zapatilla, igual que RunningProgressCard: nada que mostrar, nada inventado.
function RunningShoeMileageSummary(shoes) {

    const active = shoes.filter(s => s.status !== "retired");
    if (!active.length) return "";

    // "Todas las zapatillas juntas" incluye las retiradas, igual que en
    // RunningShoesScreen — ese kilometraje se corrió igual.
    const totalKm = shoes.reduce((sum, s) => sum + getShoeTotalKm(s.id), 0);

    return `

        <div class="shoe-mileage-summary" data-action="open-shoes">

            <div class="shoe-mileage-header">

                <span class="shoe-mileage-title">

                    <iconify-icon icon="solar:running-round-bold-duotone"></iconify-icon>

                    KILOMETRAJE DE ZAPATILLAS

                </span>

                <span class="shoe-mileage-total">Total: ${formatKm(totalKm)}</span>

            </div>

            <span class="shoe-mileage-manage">

                Gestionar zapatillas

                <iconify-icon icon="solar:alt-arrow-right-bold-duotone"></iconify-icon>

            </span>

            ${active.map(shoe => ShoeMileageRow(shoe, getShoeTotalKm(shoe.id))).join("")}

        </div>

    `;

}

// Solo entran los tipos con al menos un entreno real -- antes se pintaban
// los 5 tipos del catálogo (RUNNING_WORKOUT_TYPES) sin condición, así que
// alguien que solo ha importado rodajes/series veía también "Tirada
// larga"/"Carrera" sin ningún entreno detrás. "Todos" no depende de esto,
// siempre está.
function usedTypes(workouts) {

    const present = new Set(workouts.map(w => w.type));
    return RUNNING_WORKOUT_TYPES.filter(t => present.has(t.id));

}

function RunningTypeFilters(activeType, workouts) {

    const chips = [{ id: "", label: "Todos" }, ...usedTypes(workouts)];

    return `

        <div class="type-filter-list">

            ${chips.map(chip => `

                <button
                    class="type-filter-chip ${activeType === (chip.id || null) ? "is-selected" : ""}"
                    data-action="filter-by-type"
                    data-type="${chip.id}"
                >

                    <iconify-icon icon="${TYPE_ICON[chip.id]}"></iconify-icon>

                    ${chip.label}

                </button>

            `).join("")}

        </div>

    `;

}

// "Resumen · Todos" / "Tu resumen · Rodaje (Z2)" -- más natural que la
// vieja etiqueta fija "FILTRO ACTIVO" + valor aparte (esa mecánica de
// filtro no es el vocabulario que le importa a quien corre).
function summaryTitle(typeFilter) {

    return typeFilter ? `Tu resumen · ${typeLabel(typeFilter)}` : "Resumen · Todos";

}

// Resumen del filtro activo (o de todo, con "Todos") — "" si no hay ni un
// entreno en el conjunto filtrado, para no mostrar un resumen a guiones al
// lado del estado vacío. `insight` (buildTypeProgressInsight(), null con
// "Todos" o sin histórico suficiente) aporta la segunda línea de contexto
// real -- antes era una tarjeta separada debajo de los chips
// (RunningProgressCard.js, retirada), ahora vive aquí mismo, dentro de la
// propia tarjeta de resumen. `comparison` (buildPaceComparison(),
// runningProgress.js) es la comparación por CALENDARIO -- distinta del
// insight de arriba (que compara por nº de entrenos) -- null con "Todos"
// o sin suficiente histórico real de hace ~30 días.
function RunningTypeSummary(typeFilter, summary, insight, comparison) {

    if (!summary) return "";

    const pace = summary.avgPaceSecPerKm != null ? `${formatSecondsAsClock(summary.avgPaceSecPerKm)}/km` : "—";
    const hr = summary.avgHr != null ? `${summary.avgHr} ppm` : "—";
    const bestPace = summary.bestPaceSecPerKm != null ? `${formatSecondsAsClock(summary.bestPaceSecPerKm)}/km` : "—";

    const message = insight ? buildProgressMessage(insight) : null;

    return `

        <div class="running-summary">

            <div class="running-summary-header">

                <span class="running-summary-header-icon">

                    <iconify-icon icon="${TYPE_ICON[typeFilter || ""]}"></iconify-icon>

                </span>

                <div class="running-summary-header-text">

                    <span class="running-summary-header-title">${summaryTitle(typeFilter)}</span>

                    ${message ? `

                        <p class="running-summary-insight running-summary-insight--${message.trend}">

                            <iconify-icon icon="${message.icon}"></iconify-icon>

                            <span>${message.html}</span>

                        </p>

                    ` : ""}

                </div>

            </div>

            <div class="running-summary-stats">

                <div class="running-summary-item">
                    <iconify-icon icon="solar:running-round-bold-duotone"></iconify-icon>
                    <span class="running-summary-value">${summary.count}</span>
                    <span class="running-summary-label">${summary.count === 1 ? "entrenamiento" : "entrenos"}</span>
                </div>

                <div class="running-summary-item">
                    <iconify-icon icon="solar:clock-circle-bold-duotone"></iconify-icon>
                    <span class="running-summary-value">${pace}</span>
                    <span class="running-summary-label">ritmo medio</span>
                </div>

                <div class="running-summary-item">
                    <iconify-icon icon="solar:heart-bold-duotone"></iconify-icon>
                    <span class="running-summary-value">${hr}</span>
                    <span class="running-summary-label">FC media</span>
                </div>

                <div class="running-summary-item">
                    <iconify-icon icon="solar:cup-star-bold-duotone"></iconify-icon>
                    <span class="running-summary-value">${bestPace}</span>
                    <span class="running-summary-label">mejor ritmo</span>
                </div>

            </div>

            ${comparison ? `

                <p class="running-summary-comparison">

                    <iconify-icon icon="solar:calendar-search-bold-duotone"></iconify-icon>

                    <span>${buildComparisonMessage(comparison)}</span>

                </p>

            ` : ""}

        </div>

    `;

}

// Tarjeta de insight rotatorio sobre la lista (ver runningListInsight.js)
// -- "" si ninguna variante tiene datos reales, nunca un texto de relleno.
function RunningListInsightCard(insight) {

    if (!insight) return "";

    return `

        <div class="running-list-insight">

            <iconify-icon icon="${insight.icon}"></iconify-icon>

            <p>${insight.text}</p>

        </div>

    `;

}

function RunningIdleView() {

    const workouts = getWorkouts();
    const shoes = getShoes();
    const typeFilter = getTypeFilter();

    const sorted = [...workouts].sort((a, b) => b.date.localeCompare(a.date));
    const filtered = typeFilter ? sorted.filter(w => w.type === typeFilter) : sorted;

    // Solo tiene sentido comparar ritmo dentro de un mismo tipo — con
    // "Todos" seleccionado no hay una forma no arbitraria de elegir de
    // cuál hablar, así que la tarjeta no se muestra.
    const progressInsight = typeFilter ? buildTypeProgressInsight(workouts, { type: typeFilter }) : null;
    const typeSummary = buildTypeSummary(filtered);

    // Comparación por calendario (distinta de progressInsight, ver
    // runningProgress.js) -- mismo motivo que progressInsight para no
    // mostrarla con "Todos": comparar ritmo entre tipos distintos no dice
    // nada.
    const paceComparison = typeFilter && typeSummary ? buildPaceComparison(filtered, typeSummary.avgPaceSecPerKm) : null;

    // Insight rotatorio sobre la lista (ver runningListInsight.js) --
    // sobre el conjunto YA filtrado (mismo que se ve debajo), salvo el %
    // de zapatilla, que siempre mira el total real de todos los entrenos.
    const listInsight = filtered.length ? buildListInsight({ filteredWorkouts: filtered, allWorkouts: workouts, shoes }) : null;

    return `

        <div class="running-content">

            ${RunningHeader()}

            ${workouts.length === 0 ? (getPossibleDataLoss() ? `

                <div class="running-empty running-empty--warning">

                    <iconify-icon icon="solar:danger-triangle-bold-duotone"></iconify-icon>

                    <p>No se pudo acceder a tus entrenos guardados — puede que el navegador haya eliminado los datos de la app.</p>

                    <p class="running-empty-hint">Si exportaste una copia de seguridad, puedes recuperarla desde Perfil → Importar copia.</p>

                    <button class="wizard-primary-button" data-action="open-wizard">

                        Importar de nuevo

                    </button>

                </div>

            ` : `

                <div class="running-empty">

                    <iconify-icon icon="solar:running-2-bold-duotone"></iconify-icon>

                    <p>Aún no has importado ninguna carrera.</p>

                    <button class="wizard-primary-button" data-action="open-wizard">

                        Importar la primera captura

                    </button>

                </div>

            `) : `

                ${RunningTypeSummary(typeFilter, typeSummary, progressInsight, paceComparison)}

                ${RunningTypeFilters(typeFilter, workouts)}

                ${filtered.length === 0 ? `

                    <div class="running-empty-filtered">

                        <iconify-icon icon="solar:running-2-bold-duotone"></iconify-icon>

                        <p>No hay entrenamientos de este tipo.</p>

                    </div>

                ` : `

                    ${RunningListInsightCard(listInsight)}

                    <div class="running-history-header">

                        <button class="running-history-expand" data-action="open-history-table">

                            <iconify-icon icon="solar:full-screen-bold-duotone"></iconify-icon>

                            Ver tabla completa

                        </button>

                    </div>

                    <div class="running-history">

                        ${filtered.map(workout => RunningHistoryItem(workout, shoes)).join("")}

                    </div>

                `}

                ${RunningShoeMileageSummary(shoes)}

            `}

        </div>

    `;

}

// Pantalla propia y aislada para la tabla — al girar el móvil aquí dentro
// no afecta a ninguna otra pantalla de la app, porque no comparten
// ninguna regla de CSS ligada al ancho/orientación (esa es la razón de
// que exista esta vista aparte, en vez de alternar tabla/tarjetas dentro
// de la propia RunningIdleView según el giro). Reutiliza tal cual
// RunningTypeFilters()/RunningHistoryTable() — mismo marcado, no se
// duplica nada.
function RunningFullTableView() {

    const workouts = getWorkouts();
    const shoes = getShoes();
    const typeFilter = getTypeFilter();
    const sortColumn = getSortColumn();
    const sortDirection = getSortDirection();

    const sorted = sortWorkoutsByColumn(workouts, shoes, sortColumn, sortDirection);
    const filtered = typeFilter ? sorted.filter(w => w.type === typeFilter) : sorted;

    return `

        <section class="running-wizard running-step-history-table">

            <header class="wizard-header">

                <button class="wizard-close" data-action="close-history-table">

                    <iconify-icon icon="solar:close-circle-bold-duotone"></iconify-icon>

                </button>

                <h2>Tabla de entrenos</h2>

            </header>

            ${RunningTypeFilters(typeFilter, workouts)}

            ${filtered.length === 0 ? `

                <div class="running-empty-filtered">

                    <iconify-icon icon="solar:running-2-bold-duotone"></iconify-icon>

                    <p>No hay entrenamientos de este tipo.</p>

                </div>

            ` : RunningHistoryTable(filtered, shoes, typeFilter, sortColumn, sortDirection)}

        </section>

    `;

}

export function Running() {

    const step = getWizardStep();

    let content;

    if (step === "upload" || step === "processing") {

        content = RunningUploadStep({
            progress: getProgress(),
            ocrError: getOcrError(),
            parseError: getParseError(),
            timingLog: getTimingLog()
        });

    } else if (step === "review") {

        content = RunningReviewStep(getWorkout());

    } else if (step === "shoe") {

        content = RunningShoeStep({
            // Una zapatilla retirada no debe poder elegirse para una carrera
            // nueva — su histórico ya guardado no se toca, solo deja de
            // salir aquí.
            shoes: getShoes().filter(s => s.status !== "retired"),
            selectedShoeId: getSelectedShoeId(),
            addingNewShoe: getAddingNewShoe(),
            saveError: getSaveError(),
            duplicateWarning: getDuplicateWarning(),
            workout: getWorkout()
        });

    } else if (step === "detail") {

        const workout = getWorkouts().find(w => w.id === getDetailWorkoutId());
        content = RunningDetailView(workout, getShoes());

    } else if (step === "shoes") {

        content = RunningShoesScreen({
            shoes: getShoes(),
            addingNewShoe: getAddingNewShoe(),
            editingShoeId: getEditingShoeId(),
            newShoePhoto: getNewShoePhoto()
        });

    } else if (step === "historyTable") {

        content = RunningFullTableView();

    } else {

        content = RunningIdleView();

    }

    return `

        <div class="running">

            ${content}

            ${BottomNavigation()}

        </div>

    `;

}
