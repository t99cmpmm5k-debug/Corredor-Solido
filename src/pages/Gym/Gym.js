import "./Gym.css";

import { BottomNavigation } from "../../components/Navigation/BottomNavigation.js";
import { gymDays } from "../../data/gymData.js";
import { getSessionById } from "../../data/gymSessionStore.js";
import { getStep, getActiveSessionId } from "./gymStore.js";
import { GymSessionView } from "./components/GymSessionView.js";

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

            </header>

            <div class="gym-day-list">

                ${gymDays.map(DayCard).join("")}

            </div>

        </div>

    `;

}

export function Gym() {

    const step = getStep();
    const session = step === "session" ? getSessionById(getActiveSessionId()) : null;

    return `

        <div class="gym-page">

            ${session ? GymSessionView(session) : GymDaySelect()}

            ${BottomNavigation()}

        </div>

    `;

}
