import "./Running.css";

import { getWorkouts, getShoes, getPossibleDataLoss } from "../../data/workoutStore.js";
import { RUNNING_WORKOUT_TYPES } from "../../data/runningWorkoutTypes.js";
import { formatDayMonth } from "../../utils/date.js";
import { formatSecondsAsClock } from "../../utils/format.js";
import { buildTypeProgressInsight } from "./runningProgress.js";
import { buildTypeSummary } from "./runningSummary.js";

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
    getNewShoePhoto
} from "./runningStore.js";

import { RunningUploadStep } from "./components/RunningUploadStep.js";
import { RunningReviewStep } from "./components/RunningReviewStep.js";
import { RunningShoeStep } from "./components/RunningShoeStep.js";
import { RunningDetailView } from "./components/RunningDetailView.js";
import { RunningProgressCard } from "./components/RunningProgressCard.js";
import { RunningShoesScreen } from "./components/RunningShoesScreen.js";

function shoeLabel(shoeId, shoes) {

    const shoe = shoes.find(s => s.id === shoeId);
    return shoe ? `${shoe.brand} ${shoe.model}` : "Sin zapatilla";

}

function formatDistance(distanceKm) {

    return distanceKm != null ? `${distanceKm.toFixed(2).replace(".", ",")} km` : "—";

}

function RunningHistoryItem(workout, shoes) {

    const distance = formatDistance(workout.distanceKm);
    const duration = workout.durationSec != null ? formatSecondsAsClock(workout.durationSec) : "—";
    const pace = workout.avgPaceSecPerKm != null ? `${formatSecondsAsClock(workout.avgPaceSecPerKm)}/km` : "—";
    const hr = workout.avgHr != null ? `${workout.avgHr} ppm` : "—";
    const temperature = workout.temperatureC != null ? `${workout.temperatureC}°C` : "—";

    return `

        <article class="running-history-item" data-action="open-detail" data-workout-id="${workout.id}">

            <header class="history-header">

                <div class="history-header-main">

                    <span class="history-date">${formatDayMonth(workout.date)}</span>

                    <span class="history-headline">${distance} · ${duration}</span>

                </div>

                <button class="history-delete" data-action="delete-workout" data-workout-id="${workout.id}">

                    <iconify-icon icon="solar:trash-bin-trash-bold-duotone"></iconify-icon>

                </button>

            </header>

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

// Mismos iconos que ya usa WorkoutIcon.js para easy/series/long (un rodaje
// se ve igual aquí que en el calendario de Plan); tempo/race son propios de
// Running y no tienen entrada ahí. No se reutiliza WorkoutIcon() en sí —
// está pensado para el badge circular grande del calendario, no para un
// icono pequeño dentro de un chip o de una columna del resumen.
const TYPE_ICON = {
    "": "solar:widget-5-bold-duotone",
    easy: "solar:running-bold-duotone",
    series: "solar:bolt-bold-duotone",
    tempo: "solar:clock-circle-bold-duotone",
    long: "solar:mountains-bold-duotone",
    race: "solar:flag-2-bold-duotone"
};

function typeLabel(type) {
    return type ? (RUNNING_WORKOUT_TYPES.find(t => t.id === type)?.label || type) : "Todos";
}

function RunningTypeFilters(activeType) {

    const chips = [{ id: "", label: "Todos" }, ...RUNNING_WORKOUT_TYPES];

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
// lado del estado vacío.
function RunningTypeSummary(typeFilter, summary) {

    if (!summary) return "";

    const pace = summary.avgPaceSecPerKm != null ? `${formatSecondsAsClock(summary.avgPaceSecPerKm)}/km` : "—";
    const hr = summary.avgHr != null ? `${summary.avgHr} ppm` : "—";
    const bestPace = summary.bestPaceSecPerKm != null ? `${formatSecondsAsClock(summary.bestPaceSecPerKm)}/km` : "—";

    return `

        <div class="running-summary">

            <div class="running-summary-header">

                <span class="running-summary-header-icon">

                    <iconify-icon icon="${TYPE_ICON[typeFilter || ""]}"></iconify-icon>

                </span>

                <div class="running-summary-header-text">

                    <span class="running-summary-header-label">Filtro activo</span>

                    <span class="running-summary-header-value">${typeLabel(typeFilter)}</span>

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

    return `

        <div class="running-content">

            <header class="running-header">

                <h1>Running</h1>

                <div class="running-header-actions">

                    <button class="running-shoes-button" data-action="open-shoes">

                        <iconify-icon icon="solar:running-round-bold-duotone"></iconify-icon>

                        Zapatillas

                    </button>

                    <button class="running-import-button" data-action="open-wizard">

                        <iconify-icon icon="solar:add-circle-bold-duotone"></iconify-icon>

                        Importar

                    </button>

                </div>

            </header>

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

                ${RunningTypeSummary(typeFilter, typeSummary)}

                ${RunningTypeFilters(typeFilter)}

                ${RunningProgressCard(progressInsight)}

                ${filtered.length === 0 ? `

                    <div class="running-empty-filtered">

                        <iconify-icon icon="solar:running-2-bold-duotone"></iconify-icon>

                        <p>No hay entrenamientos de este tipo.</p>

                    </div>

                ` : `

                    <div class="running-history">

                        ${filtered.map(workout => RunningHistoryItem(workout, shoes)).join("")}

                    </div>

                `}

            `}

        </div>

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
        content = RunningDetailView(workout);

    } else if (step === "shoes") {

        content = RunningShoesScreen({
            shoes: getShoes(),
            addingNewShoe: getAddingNewShoe(),
            editingShoeId: getEditingShoeId(),
            newShoePhoto: getNewShoePhoto()
        });

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
