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
    getSaveError
} from "./runningStore.js";

import { RunningUploadStep } from "./components/RunningUploadStep.js";
import { RunningReviewStep } from "./components/RunningReviewStep.js";
import { RunningShoeStep } from "./components/RunningShoeStep.js";

function shoeLabel(shoeId, shoes) {

    const shoe = shoes.find(s => s.id === shoeId);
    return shoe ? `${shoe.brand} ${shoe.model}` : "Sin zapatilla";

}

function RunningHistoryItem(workout, shoes) {

    return `

        <article class="running-history-item">

            <div class="history-date">

                ${formatDayMonth(workout.date)}

            </div>

            <div class="history-main">

                <strong>${workout.distanceKm != null ? `${workout.distanceKm} km` : "—"}</strong>

                <span>${workout.durationSec != null ? formatSecondsAsClock(workout.durationSec) : "—"}</span>

            </div>

            <div class="history-shoe">

                <iconify-icon icon="solar:running-round-bold-duotone"></iconify-icon>

                ${shoeLabel(workout.shoeId, shoes)}

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
            parseError: getParseError()
        });

    } else if (step === "review") {

        content = RunningReviewStep(getWorkout());

    } else if (step === "shoe") {

        content = RunningShoeStep({
            shoes: getShoes(),
            selectedShoeId: getSelectedShoeId(),
            addingNewShoe: getAddingNewShoe(),
            saveError: getSaveError()
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
