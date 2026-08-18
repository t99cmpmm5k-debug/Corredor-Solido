import "./GymHomeSummary.css";
import { formatDayNumber, getDayAbbreviation } from "../../../utils/date.js";

function todayCard(day) {

    if (!day) {

        return `

            <div class="gym-today-card is-rest">

                <span class="gym-today-label">HOY</span>

                <h2>Día de descanso</h2>

                <p>No tienes entrenamiento programado hoy.</p>

            </div>

        `;

    }

    return `

        <div class="gym-today-card">

            <span class="gym-today-label">ENTRENAMIENTO DE HOY</span>

            <h2>${day.title}</h2>

            <span class="gym-today-count">${day.exercises.length} ejercicios</span>

            <button class="gym-today-button" data-action="select-day" data-day-id="${day.id}">

                Comenzar entrenamiento

            </button>

        </div>

    `;

}

function upcomingItem({ day, date }) {

    return `

        <li class="gym-upcoming-item">

            <div class="gym-upcoming-date">

                <span class="gym-upcoming-weekday">${getDayAbbreviation(date)}</span>

                <span class="gym-upcoming-daynumber">${formatDayNumber(date)}</span>

            </div>

            <div class="gym-upcoming-info">

                <h3>${day.title}</h3>

                <span>${day.exercises.length} ejercicios</span>

            </div>

        </li>

    `;

}

function weekSummary({ completed, total }) {

    const percent = total ? Math.round((completed / total) * 100) : 0;

    return `

        <div class="gym-week-summary">

            <div class="gym-week-summary-header">

                <h2>Resumen semanal</h2>

                <span>${completed}/${total} sesiones completadas</span>

            </div>

            <div class="gym-week-progress-track">

                <div class="gym-week-progress-fill" style="width:${percent}%"></div>

            </div>

        </div>

    `;

}

// todayDay puede ser null (día de descanso real — hoy no coincide con
// ningún día de la rutina). upcoming/weekProgress vienen ya calculados por
// gymSchedule.js — este componente solo renderiza.
export function GymHomeSummary({ todayDay, upcoming, weekProgress }) {

    return `

        <div class="gym-home-summary">

            ${todayCard(todayDay)}

            ${upcoming.length ? `

                <section class="gym-upcoming">

                    <h2>Próximos entrenamientos</h2>

                    <ul class="gym-upcoming-list">

                        ${upcoming.map(upcomingItem).join("")}

                    </ul>

                </section>

            ` : ""}

            ${weekSummary(weekProgress)}

        </div>

    `;

}
