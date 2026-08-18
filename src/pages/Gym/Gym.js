import "./Gym.css";

import { BottomNavigation } from "../../components/Navigation/BottomNavigation.js";
import { getGymDays } from "../../data/gymRoutineStore.js";
import { getSessionById } from "../../data/gymSessionStore.js";
import { getStep, getActiveSessionId } from "./gymStore.js";
import { GymSessionView } from "./components/GymSessionView.js";
import { GymImportWizard } from "./components/GymImportWizard.js";
import { getImportStep } from "./gymImportStore.js";

function DayCard(day) {

    return `

        <div class="gym-day-card" data-action="select-day" data-day-id="${day.id}">

            <div class="gym-day-card-header">

                <h2>${day.title}</h2>

                <span class="gym-day-card-count">${day.exercises.length} ejercicios</span>

            </div>

            <ul class="gym-day-card-list">

                ${day.exercises.map(exercise => `<li>${exercise.name}</li>`).join("")}

            </ul>

        </div>

    `;

}

function GymDaySelect() {

    return `

        <div class="gym-content">

            <header class="gym-header">

                <h1>Gimnasio</h1>

                <button class="gym-import-button" data-action="open-gym-import">

                    <iconify-icon icon="solar:file-download-bold-duotone"></iconify-icon>

                    Importar rutina

                </button>

            </header>

            <div class="gym-day-list">

                ${getGymDays().map(DayCard).join("")}

            </div>

        </div>

    `;

}

export function Gym() {

    // El wizard de importación se superpone a la pantalla normal de Gym,
    // mismo patrón que Plan() con PlanImportWizard.
    if (getImportStep() !== "closed") {

        return `

            <div class="gym-page">

                ${GymImportWizard()}

            </div>

            ${BottomNavigation()}

        `;

    }

    const step = getStep();
    const session = step === "session" ? getSessionById(getActiveSessionId()) : null;

    return `

        <div class="gym-page">

            ${session ? GymSessionView(session) : GymDaySelect()}

            ${BottomNavigation()}

        </div>

    `;

}
