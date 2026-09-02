import "./ReferenceRouteWorkoutTable.css";

import { formatDayMonth } from "../../../utils/date.js";
import { formatSecondsAsClock } from "../../../utils/format.js";
import { buildCardiacDrift } from "../../../utils/cardiacDrift.js";

// Tabla ordenable de los entrenos de un recorrido de referencia -- mismo
// patrón que RunningHistoryTable/SortableHeaderCell (Running.js), pero
// con sus propias columnas (fecha/ritmo/FC/temperatura/deriva/cadencia,
// tal cual pide la especificación) y su propio estado de orden
// (routeSortColumn/routeSortDirection, ver runningStore.js) -- una tabla
// distinta a la general de Running, no debe compartir su orden.
function driftPercent(workout) {

    const drift = buildCardiacDrift(workout, workout.splits || []);
    return drift ? drift.percent : null;

}

const SORT_VALUE_GETTERS = {
    date: workout => workout.date,
    avgPaceSecPerKm: workout => workout.avgPaceSecPerKm,
    avgHr: workout => workout.avgHr,
    temperatureC: workout => workout.temperatureC,
    drift: driftPercent,
    avgCadence: workout => workout.avgCadence
};

// null siempre al final, sea cual sea la dirección -- mismo criterio que
// sortWorkoutsByColumn() en Running.js: un entreno sin ese dato no debe
// "ganar" ni "perder" solo por faltarle, solo queda fuera del orden real.
function sortWorkouts(workouts, column, direction) {

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

function SortableHeaderCell(label, column, activeColumn, direction) {

    const isActive = column === activeColumn;
    const icon = isActive ? (direction === "asc" ? "↑" : "↓") : "";

    return `

        <button class="route-table-cell route-table-cell--sortable ${isActive ? "is-active" : ""}" data-action="sort-route-table" data-column="${column}">

            ${label}

            ${icon ? `<span class="route-table-sort-icon">${icon}</span>` : ""}

        </button>

    `;

}

function TableRow(workout) {

    const pace = workout.avgPaceSecPerKm != null ? `${formatSecondsAsClock(workout.avgPaceSecPerKm)}/km` : "—";
    const hr = workout.avgHr != null ? `${Math.round(workout.avgHr)} ppm` : "—";
    const temp = workout.temperatureC != null ? `${workout.temperatureC}°C` : "—";
    const cadence = workout.avgCadence != null ? `${workout.avgCadence} spm` : "—";

    const drift = driftPercent(workout);
    const driftText = drift != null ? `${drift >= 0 ? "+" : ""}${drift.toFixed(1).replace(".", ",")}%` : "—";

    return `

        <div class="route-table-row" data-action="open-detail" data-workout-id="${workout.id}">

            <span class="route-table-cell">${formatDayMonth(workout.date)}</span>

            <span class="route-table-cell">${pace}</span>

            <span class="route-table-cell">${hr}</span>

            <span class="route-table-cell">${temp}</span>

            <span class="route-table-cell">${driftText}</span>

            <span class="route-table-cell">${cadence}</span>

            <button
                class="route-table-remove"
                data-action="unassign-workout-from-route"
                data-workout-id="${workout.id}"
                aria-label="Quitar del recorrido"
            >

                <iconify-icon icon="solar:close-circle-bold-duotone"></iconify-icon>

            </button>

        </div>

    `;

}

export function ReferenceRouteWorkoutTable(workouts, sortColumn, sortDirection) {

    if (!workouts.length) return "";

    const sorted = sortWorkouts(workouts, sortColumn, sortDirection);

    return `

        <div class="route-workout-table">

            <div class="route-table-row route-table-header">

                ${SortableHeaderCell("FECHA", "date", sortColumn, sortDirection)}

                ${SortableHeaderCell("RITMO", "avgPaceSecPerKm", sortColumn, sortDirection)}

                ${SortableHeaderCell("FC", "avgHr", sortColumn, sortDirection)}

                ${SortableHeaderCell("TEMP.", "temperatureC", sortColumn, sortDirection)}

                ${SortableHeaderCell("DERIVA", "drift", sortColumn, sortDirection)}

                ${SortableHeaderCell("CAD.", "avgCadence", sortColumn, sortDirection)}

                <span class="route-table-remove-spacer"></span>

            </div>

            ${sorted.map(TableRow).join("")}

        </div>

    `;

}
