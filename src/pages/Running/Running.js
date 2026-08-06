import "./Running.css";

import { getWorkouts, getShoes } from "../../data/workoutStore.js";
import { formatDayMonth } from "../../utils/date.js";
import { formatSecondsAsClock } from "../../utils/format.js";

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
    getTimingLog
} from "./runningStore.js";

import { RunningUploadStep } from "./components/RunningUploadStep.js";
import { RunningReviewStep } from "./components/RunningReviewStep.js";
import { RunningShoeStep } from "./components/RunningShoeStep.js";

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

        <article class="running-history-item">

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

function RunningIdleView() {

    const workouts = getWorkouts();
    const shoes = getShoes();

    const sorted = [...workouts].sort((a, b) => b.date.localeCompare(a.date));

    return `

        <div class="running-content">

            <header class="running-header">

                <h1>Running</h1>

                <button class="running-import-button" data-action="open-wizard">

                    <iconify-icon icon="solar:add-circle-bold-duotone"></iconify-icon>

                    Importar

                </button>

            </header>

            ${workouts.length === 0 ? `

                <div class="running-empty">

                    <iconify-icon icon="solar:running-2-bold-duotone"></iconify-icon>

                    <p>Aún no has importado ninguna carrera.</p>

                    <button class="wizard-primary-button" data-action="open-wizard">

                        Importar la primera captura

                    </button>

                </div>

            ` : `

                <div class="running-history">

                    ${sorted.map(workout => RunningHistoryItem(workout, shoes)).join("")}

                </div>

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
            shoes: getShoes(),
            selectedShoeId: getSelectedShoeId(),
            addingNewShoe: getAddingNewShoe(),
            saveError: getSaveError(),
            duplicateWarning: getDuplicateWarning(),
            workout: getWorkout()
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
