import "./Running.css";

import { getWorkouts, getShoes, getPossibleDataLoss, getShoeTotalKm } from "../../data/workoutStore.js";
import { getReferenceRoutes, getReferenceRouteById } from "../../data/referenceRouteStore.js";
import { resolveRouteWorkouts } from "./referenceRouteEfficiency.js";
import { RUNNING_WORKOUT_TYPES } from "../../data/runningWorkoutTypes.js";
import { formatDayMonth } from "../../utils/date.js";
import { formatSecondsAsClock, formatShoeName, formatKm as formatGroupKm } from "../../utils/format.js";
import { buildTypeProgressInsight, buildProgressMessage, buildPaceComparison, buildComparisonMessage } from "./runningProgress.js";
import { buildTypeSummary } from "./runningSummary.js";
import { buildListInsight } from "./runningListInsight.js";
import { buildZ2Evolution } from "./runningEvolution.js";
import { buildWorkoutTypeContext } from "./runningTypeContext.js";
import { buildHistoryGroups } from "./runningHistoryGrouping.js";
import {
    ACWR_CHRONIC_DAYS,
    ACWR_ZONE_THRESHOLDS,
    buildRunningLoadEntries,
    buildAcwrInsight,
    ratioToBarPercent,
    buildAcwrRecommendation
} from "../../utils/acwr.js";

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
    getHistoryMenuOpenId,
    getHistoryGroupOverrides,
    getWarningsExpanded,
    getChartMetricMode,
    getDetailRouteId,
    isCreatingRoute,
    getRouteMenuOpenId,
    getConfirmingSuggestion,
    getRouteSortColumn,
    getRouteSortDirection
} from "./runningStore.js";

import { RunningUploadStep } from "./components/RunningUploadStep.js";
import { RunningReviewStep } from "./components/RunningReviewStep.js";
import { RunningShoeStep } from "./components/RunningShoeStep.js";
import { RunningDetailView, typeSelector, shoeSelector } from "./components/RunningDetailView.js";
import { RunningShoesScreen, ShoePhoto, shoeBarPercent, formatKm } from "./components/RunningShoesScreen.js";
import { RunningHeader } from "./components/RunningHeader.js";
import { routeSelector } from "./components/ReferenceRouteSelector.js";
import { ReferenceRoutesListView } from "./components/ReferenceRoutesListView.js";
import { ReferenceRouteDetailView } from "./components/ReferenceRouteDetailView.js";

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
function RunningHistoryItem(workout, shoes, routes, allWorkouts) {

    const distance = formatDistance(workout.distanceKm);
    const duration = workout.durationSec != null ? formatSecondsAsClock(workout.durationSec) : "—";
    const pace = workout.avgPaceSecPerKm != null ? `${formatSecondsAsClock(workout.avgPaceSecPerKm)}/km` : "—";
    const hr = workout.avgHr != null ? `${workout.avgHr} ppm` : "—";
    const temperature = workout.temperatureC != null ? `${workout.temperatureC}°C` : "—";
    const typeBadge = workoutTypeBadge(workout.type);
    const isMenuOpen = getHistoryMenuOpenId() === workout.id;
    // Contexto vs. la media histórica COMPLETA del mismo tipo (nunca
    // contra otros tipos) -- ver runningTypeContext.js. Se calcula contra
    // allWorkouts (el conjunto real completo), no contra `filtered`: el
    // promedio no debe encogerse solo porque el chip "Rodaje (Z2)" esté
    // activo en vez de "Todos".
    const typeContext = buildWorkoutTypeContext(workout, allWorkouts);

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

                            <label class="history-menu-select-row">
                                <iconify-icon icon="solar:widget-5-bold-duotone"></iconify-icon>
                                ${typeSelector(workout)}
                            </label>

                            <label class="history-menu-select-row">
                                <iconify-icon icon="solar:running-round-bold-duotone"></iconify-icon>
                                ${shoeSelector(workout, shoes)}
                            </label>

                            ${routes.length ? `

                                <label class="history-menu-select-row">
                                    <iconify-icon icon="solar:map-point-bold-duotone"></iconify-icon>
                                    ${routeSelector(workout, routes)}
                                </label>

                            ` : ""}

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

            ${typeContext ? `

                <div class="history-context">

                    <iconify-icon icon="${typeContext.kind === "pace" ? "solar:speedometer-bold-duotone" : "solar:heart-pulse-bold-duotone"}"></iconify-icon>

                    <span>${typeContext.text}</span>

                </div>

            ` : ""}

            <div class="history-shoe">

                <iconify-icon icon="solar:running-round-bold-duotone"></iconify-icon>

                <span>${shoeLabel(workout.shoeId, shoes)}</span>

            </div>

        </article>

    `;

}

// "3 entrenos · 24,4 km · 5:48/km" -- km y ritmo solo si hay algo real que
// mostrar (un grupo puede tener entrenos sin distancia/duración todavía,
// ver buildHistoryGroups()), nunca un "0,0 km" o un ritmo inventado.
function groupSummaryText(summary) {

    const parts = [`${summary.count} entreno${summary.count === 1 ? "" : "s"}`];

    if (summary.totalKm > 0) parts.push(`${formatGroupKm(summary.totalKm)} km`);
    if (summary.avgPaceSecPerKm != null) parts.push(`${formatSecondsAsClock(summary.avgPaceSecPerKm)}/km`);

    return parts.join(" · ");

}

// Cabecera plegable de un grupo (semana/mes) del historial -- plegar/
// desplegar es puramente visual (isOpen decide si se pintan las tarjetas
// de dentro), el estado en sí vive en runningStore.js (getHistoryGroupOverrides)
// para sobrevivir a un rerender. El resumen numérico ya viene calculado
// sobre el conjunto YA filtrado por tipo (ver RunningIdleView) -- cambiar
// de chip recalcula los grupos enteros, incluido este resumen.
function RunningHistoryGroup(group, isOpen, shoes, routes, allWorkouts) {

    return `

        <div class="history-group">

            <button
                class="history-group-header"
                data-action="toggle-history-group"
                data-group-key="${group.key}"
                aria-expanded="${isOpen}"
            >

                <span class="history-group-title">

                    <iconify-icon icon="solar:alt-arrow-down-bold-duotone" class="history-group-chevron ${isOpen ? "" : "is-collapsed"}"></iconify-icon>

                    ${group.label}

                </span>

                <span class="history-group-summary">${groupSummaryText(group.summary)}</span>

            </button>

            ${isOpen ? `

                <div class="history-group-body">

                    ${group.workouts.map(workout => RunningHistoryItem(workout, shoes, routes, allWorkouts)).join("")}

                </div>

            ` : ""}

        </div>

    `;

}

// Vista de tabla simplificada (especificación de cierre: la de antes
// tenía demasiadas columnas para móvil) -- solo los 4 datos que responden
// a "¿cómo fue este entreno de un vistazo?" (Fecha/Km/Ritmo/FC). Duración,
// temperatura y zapatilla siguen existiendo, pero solo en la ficha
// individual (RunningDetailView.js) -- no se pierden, se reubican. Sin
// botón de borrar (el mockup tampoco lo lleva ahí — borrar sigue
// disponible desde el detalle). También lleva su propia versión compacta
// de una fila (ver .history-table-row-compact-text en Running.css) para
// cuando 4 columnas + chevron siguen sin caber bien en un móvil estrecho
// -- mismo dato, mismo dato real, solo cambia el layout vía CSS, nunca
// duplicando el marcado en el DOM.
function RunningHistoryRow(workout) {

    const distance = formatDistance(workout.distanceKm);
    const pace = workout.avgPaceSecPerKm != null ? `${formatSecondsAsClock(workout.avgPaceSecPerKm)}/km` : "—";
    const hr = workout.avgHr != null ? `${workout.avgHr} ppm` : "—";

    return `

        <div class="history-table-row" data-action="open-detail" data-workout-id="${workout.id}">

            <span class="history-table-cell history-table-cell--date">${formatDayMonth(workout.date)}</span>

            <span class="history-table-cell history-table-cell--km">${distance}</span>

            <span class="history-table-cell history-table-cell--pace">${pace}</span>

            <span class="history-table-cell history-table-cell--hr">${hr}</span>

            <iconify-icon icon="solar:alt-arrow-right-bold-duotone" class="history-table-chevron"></iconify-icon>

        </div>

    `;

}

// Getter de valor por columna, para ordenar (ver sortWorkoutsByColumn) --
// solo las 4 columnas reales de la tabla simplificada (duración/
// temperatura/zapatilla ya no son columnas de esta tabla, ver
// RunningHistoryRow()).
const SORT_VALUE_GETTERS = {
    date: workout => workout.date,
    distanceKm: workout => workout.distanceKm,
    avgPaceSecPerKm: workout => workout.avgPaceSecPerKm,
    avgHr: workout => workout.avgHr
};

// null siempre al final, sea cual sea la dirección — un entreno sin FC
// media no debe "ganar" a los demás solo por ordenar ascendente ni
// "perder" siempre por ordenar descendente. Por eso el signo de la
// dirección solo se aplica a la comparación entre dos valores reales.
function sortWorkoutsByColumn(workouts, column, direction) {

    const getValue = SORT_VALUE_GETTERS[column];
    if (!getValue) return workouts;

    const sign = direction === "asc" ? 1 : -1;

    return [...workouts].sort((a, b) => {

        const av = getValue(a);
        const bv = getValue(b);

        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;

        return typeof av === "string" ? sign * av.localeCompare(bv) : sign * (av - bv);

    });

}

// Cabecera de columna tocable (especificación de cierre: antes TODAS las
// columnas mostraban un indicador "↕" a la vez, aunque tenue -- ahora solo
// la columna activa lleva flecha; el resto queda neutro, sin ningún icono,
// para no competir visualmente con la que de verdad importa).
function SortableHeaderCell(label, column, activeColumn, direction) {

    const isActive = column === activeColumn;
    const icon = isActive ? (direction === "asc" ? "↑" : "↓") : "";

    return `

        <button class="history-table-cell history-table-cell--sortable ${isActive ? "is-active" : ""}" data-action="sort-history-table" data-column="${column}">

            ${label}

            ${icon ? `<span class="history-table-sort-icon">${icon}</span>` : ""}

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
function RunningHistoryTable(filtered, typeFilter, sortColumn, sortDirection) {

    return `

        <div class="running-history-table">

            <h3 class="history-table-title">${tableTitle(typeFilter)}</h3>

            <div class="history-table">

                <div class="history-table-row history-table-header">

                    ${SortableHeaderCell("FECHA", "date", sortColumn, sortDirection)}

                    ${SortableHeaderCell("KM", "distanceKm", sortColumn, sortDirection)}

                    ${SortableHeaderCell("RITMO", "avgPaceSecPerKm", sortColumn, sortDirection)}

                    ${SortableHeaderCell("FC", "avgHr", sortColumn, sortDirection)}

                    <span class="history-table-chevron-spacer"></span>

                </div>

                ${filtered.map(workout => RunningHistoryRow(workout)).join("")}

            </div>

        </div>

    `;

}

// Fila compacta de solo lectura — reutiliza ShoePhoto/shoeBarPercent de
// RunningShoesScreen.js para no duplicar ni la foto ni el umbral de aviso
// de vida útil. Gestionar (añadir/retirar/foto/vida útil) sigue siendo
// exclusivo de esa pantalla completa; aquí solo se enseña el kilometraje
// de un vistazo -- el % solo se añade si de verdad hay vida útil
// configurada (bar != null), nunca inventado, mismo criterio que el resto
// de la app.
function ShoeMileageRow(shoe, km) {

    const bar = shoeBarPercent(shoe, km);
    const kmText = bar ? `${formatKm(km)} · ${Math.round(bar.percent)}%` : formatKm(km);

    return `

        <div class="shoe-mileage-row">

            ${ShoePhoto(shoe.photo)}

            <span class="shoe-mileage-name">${formatShoeName(shoe)}</span>

            <div class="shoe-mileage-bar-track">

                <div class="shoe-mileage-bar-fill ${bar ? `shoe-mileage-bar-fill--${bar.tier}` : ""}" style="--progress:${bar ? bar.fillPercent : 0}%"></div>

            </div>

            <span class="shoe-mileage-km">${kmText}</span>

            <iconify-icon icon="solar:alt-arrow-right-bold-duotone" class="history-table-chevron"></iconify-icon>

        </div>

    `;

}

// Entrada a "Recorridos de referencia" (V1) -- siempre visible (incluso
// con 0 recorridos creados todavía, para poder descubrir/crear el
// primero) mientras haya al menos un entreno importado del que tirar.
// Mismo patrón visual compacto que RunningShoeMileageSummary (tarjeta
// tocable, tap abre la pantalla completa) en vez de mostrar aquí el
// listado entero -- eso vive en ReferenceRoutesListView.js.
function ReferenceRoutesEntryCard(routes) {

    return `

        <div class="reference-routes-entry" data-action="open-reference-routes">

            <span class="reference-routes-entry-text">

                <iconify-icon icon="solar:map-point-bold-duotone"></iconify-icon>

                RECORRIDOS DE REFERENCIA

                ${routes.length ? `<span class="reference-routes-entry-count">${routes.length}</span>` : ""}

            </span>

            <iconify-icon icon="solar:alt-arrow-right-bold-duotone"></iconify-icon>

        </div>

    `;

}

// "5:53/km" a partir de segundos/km -- mismo formato que el resto de
// Running (RunningHistoryItem, RunningTypeSummary...), solo que aquí se
// usa dos veces por línea (antes → después).
function formatEvolutionPace(avgPaceSecPerKm) {
    return `${formatSecondsAsClock(avgPaceSecPerKm)}/km`;
}

// Evolución Z2 (prioridad 1 de la lista de mejoras de Running, ronda
// 2026-09-03): compara el primero y el último de los últimos entrenos
// reales de Rodaje (Z2) -- ver runningEvolution.js para el porqué de
// "primero vs último" en vez de "media de grupo" (ya existe esa otra
// comparación, distinta, en TU RESUMEN). Con menos de 2 rodajes reales no
// hay nada que comparar -- se dice así en vez de ocultar el bloque entero
// (mismo criterio que el resto de tarjetas "no disponible" de esta
// pantalla, ver AcwrCard).
function Z2EvolutionCard(evolution) {

    if (!evolution.available) {

        return `

            <div class="z2-evolution-card">

                <div class="z2-evolution-header">

                    <span class="z2-evolution-icon">
                        <iconify-icon icon="solar:graph-new-up-bold-duotone"></iconify-icon>
                    </span>

                    <span class="z2-evolution-label">EVOLUCIÓN Z2</span>

                </div>

                <p class="z2-evolution-message">Necesitas más Rodajes (Z2) con ritmo real para ver tu evolución.</p>

            </div>

        `;

    }

    const { count, first, last, paceDeltaSecPerKm, hrDeltaBpm } = evolution;

    return `

        <div class="z2-evolution-card">

            <div class="z2-evolution-header">

                <span class="z2-evolution-icon">
                    <iconify-icon icon="solar:graph-new-up-bold-duotone"></iconify-icon>
                </span>

                <div class="z2-evolution-header-text">
                    <span class="z2-evolution-label">EVOLUCIÓN Z2</span>
                    <span class="z2-evolution-sublabel">Últimos ${count} rodaje${count === 1 ? "" : "s"} · ${formatDayMonth(first.date)} → ${formatDayMonth(last.date)}</span>
                </div>

            </div>

            <div class="z2-evolution-rows">

                <div class="z2-evolution-row">

                    <span class="z2-evolution-row-label">
                        <iconify-icon icon="solar:speedometer-bold-duotone"></iconify-icon>
                        Ritmo medio
                    </span>

                    <span class="z2-evolution-row-value">
                        ${formatEvolutionPace(first.avgPaceSecPerKm)}
                        <iconify-icon icon="solar:round-arrow-right-bold-duotone"></iconify-icon>
                        ${formatEvolutionPace(last.avgPaceSecPerKm)}
                    </span>

                </div>

                ${first.avgHr != null && last.avgHr != null ? `

                    <div class="z2-evolution-row">

                        <span class="z2-evolution-row-label">
                            <iconify-icon icon="solar:heart-bold-duotone"></iconify-icon>
                            FC media
                        </span>

                        <span class="z2-evolution-row-value">
                            ${first.avgHr}
                            <iconify-icon icon="solar:round-arrow-right-bold-duotone"></iconify-icon>
                            ${last.avgHr} ppm
                        </span>

                    </div>

                ` : ""}

            </div>

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

                    <span class="running-summary-header-label">TU RESUMEN</span>

                    <span class="running-summary-header-title">${typeLabel(typeFilter)}</span>

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

// Mensaje real por motivo de "no disponible" (ver buildAcwrInsight() en
// utils/acwr.js) -- nunca un ratio a medias ni un "—" sin explicar por
// qué. "no-recent-load" no debería darse con historial ya suficiente
// salvo una racha larga sin correr, pero se cubre igual por completitud.
function acwrUnavailableMessage(insight) {

    if (insight.reason === "no-data") {
        return "Todavía no hay entrenos de running con FC media registrada para calcular tu carga de entrenamiento.";
    }

    if (insight.reason === "insufficient-history") {
        const days = insight.missingDays;
        return `Necesitas ${days} día${days === 1 ? "" : "s"} más de historial para calcular tu carga de entrenamiento (hacen falta ${ACWR_CHRONIC_DAYS} días seguidos).`;
    }

    return "No hay carga de running en las últimas semanas -- vuelve a correr para que el cálculo tenga sentido.";

}

function formatAcwrRatio(value) {
    return value.toFixed(2);
}

// Posiciones fijas de la barra de zonas -- dependen solo de los cortes
// reales (ACWR_ZONE_THRESHOLDS), nunca del ratio de un usuario concreto,
// así que se calculan una vez.
const ACWR_BAR_STOP_LOW = ratioToBarPercent(ACWR_ZONE_THRESHOLDS.low);
const ACWR_BAR_STOP_OPTIMAL = ratioToBarPercent(ACWR_ZONE_THRESHOLDS.optimal);
const ACWR_BAR_STOP_HIGH = ratioToBarPercent(ACWR_ZONE_THRESHOLDS.high);

// Barra de zonas con los 3 cortes reales marcados y el ratio del usuario
// como marcador móvil -- el marcador se recorta al dominio visual
// (ratioToBarPercent) pero sigue mostrando el valor real en su etiqueta,
// nunca un valor recortado como si fuera el real.
function AcwrZoneBar(ratio) {

    const markerPercent = ratioToBarPercent(ratio);

    return `

        <div class="acwr-zone-bar-wrap">

            <div class="acwr-zone-bar-thresholds">
                <span style="left:${ACWR_BAR_STOP_LOW}%">${formatAcwrRatio(ACWR_ZONE_THRESHOLDS.low)}</span>
                <span style="left:${ACWR_BAR_STOP_OPTIMAL}%">${formatAcwrRatio(ACWR_ZONE_THRESHOLDS.optimal)}</span>
                <span style="left:${ACWR_BAR_STOP_HIGH}%">${formatAcwrRatio(ACWR_ZONE_THRESHOLDS.high)}</span>
            </div>

            <div class="acwr-zone-bar">

                <span class="acwr-zone-segment acwr-zone-segment--detrained" style="width:${ACWR_BAR_STOP_LOW}%"></span>
                <span class="acwr-zone-segment acwr-zone-segment--optimal" style="width:${ACWR_BAR_STOP_OPTIMAL - ACWR_BAR_STOP_LOW}%"></span>
                <span class="acwr-zone-segment acwr-zone-segment--moderateRisk" style="width:${ACWR_BAR_STOP_HIGH - ACWR_BAR_STOP_OPTIMAL}%"></span>
                <span class="acwr-zone-segment acwr-zone-segment--highRisk" style="width:${100 - ACWR_BAR_STOP_HIGH}%"></span>

                <span class="acwr-zone-marker-value" style="left:${markerPercent}%">${formatAcwrRatio(ratio)}</span>
                <span class="acwr-zone-marker-dot" style="left:${markerPercent}%"></span>

            </div>

            <div class="acwr-zone-bar-labels">
                <span>Baja</span>
                <span>Óptima</span>
                <span>Alta</span>
                <span>Muy alta</span>
            </div>

        </div>

    `;

}

// Carga crónica normalizada a 1.00 (es la base con la que se compara) --
// la barra "Últimos 7 días" muestra el ratio real, "Base 28 días" siempre
// 1.00. El signo del % lo pone insight.percentVsBase (buildAcwrInsight),
// ya calculado a partir del mismo ratio, sin recalcular nada aquí.
function AcwrCompareSection(insight) {

    const acutePercent = ratioToBarPercent(insight.ratio);
    const chronicPercent = ratioToBarPercent(1);

    const percent = insight.percentVsBase;
    const trendIcon = percent > 0
        ? "solar:graph-up-bold-duotone"
        : percent < 0
            ? "solar:graph-down-bold-duotone"
            : "solar:chart-2-bold-duotone";
    const sign = percent > 0 ? "+" : "";

    return `

        <div class="acwr-compare">

            <div class="acwr-compare-bars">

                <div class="acwr-compare-row">
                    <span class="acwr-compare-label">Últimos 7 días</span>
                    <div class="acwr-compare-track">
                        <span class="acwr-compare-fill acwr-compare-fill--${insight.zone.id}" style="width:${acutePercent}%"></span>
                    </div>
                    <span class="acwr-compare-value">${formatAcwrRatio(insight.ratio)}</span>
                </div>

                <div class="acwr-compare-row">
                    <span class="acwr-compare-label">Base 28 días</span>
                    <div class="acwr-compare-track">
                        <span class="acwr-compare-fill acwr-compare-fill--chronic" style="width:${chronicPercent}%"></span>
                    </div>
                    <span class="acwr-compare-value">1.00</span>
                </div>

            </div>

            <div class="acwr-percent-box">
                <iconify-icon icon="${trendIcon}"></iconify-icon>
                <span class="acwr-percent-value">${sign}${percent}%</span>
                <span class="acwr-percent-label">vs. base 28 días</span>
            </div>

        </div>

    `;

}

function AcwrRecommendationCard(zone) {

    return `

        <div class="acwr-recommendation">

            <span class="acwr-recommendation-icon">
                <iconify-icon icon="solar:lightbulb-bold-duotone"></iconify-icon>
            </span>

            <div class="acwr-recommendation-body">
                <span class="acwr-recommendation-title">Recomendación</span>
                <p>${buildAcwrRecommendation(zone)}</p>
            </div>

        </div>

    `;

}

// Carga aguda (7 días) frente a carga crónica (28 días) -- solo running
// por ahora (ver cabecera de utils/acwr.js). Siempre visible en Inicio de
// Running, fuera del filtro por tipo -- es un dato sobre el conjunto real
// de entrenos, no sobre "rodajes" o "series" por separado.
function AcwrCard(insight) {

    if (!insight.available) {

        return `

            <div class="acwr-card">

                <div class="acwr-card-header">

                    <span class="acwr-card-header-icon">
                        <iconify-icon icon="solar:chart-2-bold-duotone"></iconify-icon>
                    </span>

                    <div class="acwr-card-header-text">
                        <span class="acwr-card-label">CARGA DE ENTRENAMIENTO (ACWR)</span>
                    </div>

                </div>

                <p class="acwr-card-message">${acwrUnavailableMessage(insight)}</p>

            </div>

        `;

    }

    const { ratio, zone } = insight;

    return `

        <div class="acwr-card acwr-card--${zone.id}">

            <div class="acwr-card-header">

                <span class="acwr-card-header-icon">
                    <iconify-icon icon="solar:chart-2-bold-duotone"></iconify-icon>
                </span>

                <div class="acwr-card-header-text">

                    <span class="acwr-card-title-row">
                        <span class="acwr-card-label">CARGA DE ENTRENAMIENTO</span>
                        <span class="acwr-card-chip">ACWR</span>
                    </span>

                    <span class="acwr-card-sublabel">Calculado solo con running</span>
                    <span class="acwr-card-sublabel acwr-card-sublabel--muted">La carga de gimnasio se añadirá cuando haya suficientes datos registrados.</span>

                </div>

                <span class="acwr-card-info-icon" title="Compara tu carga de los últimos 7 días con tu media de las últimas 4 semanas.">
                    <iconify-icon icon="solar:info-circle-bold-duotone"></iconify-icon>
                </span>

            </div>

            <div class="acwr-card-body">

                <span class="acwr-card-ratio">${formatAcwrRatio(ratio)}</span>

                <span class="acwr-card-zone-badge acwr-card-zone-badge--${zone.id}">${zone.badgeLabel}</span>

            </div>

            ${AcwrZoneBar(ratio)}

            ${AcwrCompareSection(insight)}

            ${AcwrRecommendationCard(zone)}

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

    // Grupos semana/mes del historial (prioridad 3 de la lista de mejoras)
    // -- sobre `filtered`, no sobre `workouts`: al cambiar de chip los
    // grupos (y sus resúmenes de km/ritmo) deben reflejar solo lo
    // filtrado, no el total real de esa semana/mes. `filtered` ya viene
    // ordenado de más reciente a más antiguo (ver `sorted` arriba), orden
    // del que depende buildHistoryGroups() para ordenar los grupos entre sí.
    const historyGroups = buildHistoryGroups(filtered);

    // Insight rotatorio sobre la lista (ver runningListInsight.js) --
    // sobre el conjunto YA filtrado (mismo que se ve debajo), salvo el %
    // de zapatilla, que siempre mira el total real de todos los entrenos.
    const listInsight = filtered.length ? buildListInsight({ filteredWorkouts: filtered, allWorkouts: workouts, shoes }) : null;

    // ACWR mira SIEMPRE el conjunto real de entrenos (workouts), nunca el
    // filtrado por tipo -- es carga de entrenamiento total, no de "solo
    // rodajes" o "solo series".
    const acwrInsight = buildAcwrInsight(buildRunningLoadEntries(workouts));

    // Evolución Z2 mira SIEMPRE el conjunto real de entrenos, nunca el
    // filtrado por tipo -- si no, cambiar a "Series" en los chips la
    // haría desaparecer aunque siga siendo información sobre Rodaje (Z2).
    const z2Evolution = buildZ2Evolution(workouts);

    const routes = getReferenceRoutes();

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

                ${AcwrCard(acwrInsight)}

                ${ReferenceRoutesEntryCard(routes)}

                ${Z2EvolutionCard(z2Evolution)}

                ${RunningTypeFilters(typeFilter, workouts)}

                ${filtered.length === 0 ? `

                    <div class="running-empty-filtered">

                        <iconify-icon icon="solar:running-2-bold-duotone"></iconify-icon>

                        <p>No hay entrenamientos de este tipo.</p>

                    </div>

                ` : `

                    ${RunningListInsightCard(listInsight)}

                    <div class="running-history-header">

                        <!-- Renombrado (retoque de cierre): "Ver tabla completa" no
                             decía qué la hacía distinta de la lista de tarjetas de
                             abajo. RunningFullTableView() SÍ aporta algo real y
                             propio -- columnas ordenables (sort-history-table) y
                             un layout más cómodo en horizontal -- así que se
                             mantiene, solo con un nombre que refleje eso. -->
                        <button class="running-history-expand" data-action="open-history-table">

                            <iconify-icon icon="solar:full-screen-bold-duotone"></iconify-icon>

                            Ver tabla ordenable

                        </button>

                    </div>

                    <div class="history-groups">

                        ${historyGroups.map(group => {

                            const overrides = getHistoryGroupOverrides();
                            const isOpen = overrides[group.key] ?? group.defaultOpen;

                            return RunningHistoryGroup(group, isOpen, shoes, routes, workouts);

                        }).join("")}

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
    const typeFilter = getTypeFilter();
    const sortColumn = getSortColumn();
    const sortDirection = getSortDirection();

    const sorted = sortWorkoutsByColumn(workouts, sortColumn, sortDirection);
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

            ` : RunningHistoryTable(filtered, typeFilter, sortColumn, sortDirection)}

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

        const workouts = getWorkouts();
        const workout = workouts.find(w => w.id === getDetailWorkoutId());
        content = RunningDetailView(workout, getShoes(), getWarningsExpanded(), getChartMetricMode(), workouts);

    } else if (step === "shoes") {

        content = RunningShoesScreen({
            shoes: getShoes(),
            addingNewShoe: getAddingNewShoe(),
            editingShoeId: getEditingShoeId(),
            newShoePhoto: getNewShoePhoto()
        });

    } else if (step === "historyTable") {

        content = RunningFullTableView();

    } else if (step === "referenceRoutes") {

        content = ReferenceRoutesListView(isCreatingRoute(), getRouteMenuOpenId(), getConfirmingSuggestion());

    } else if (step === "referenceRouteDetail") {

        const route = getReferenceRouteById(getDetailRouteId());
        content = ReferenceRouteDetailView(
            route,
            route ? resolveRouteWorkouts(route, getWorkouts()) : [],
            getRouteSortColumn(),
            getRouteSortDirection()
        );

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
