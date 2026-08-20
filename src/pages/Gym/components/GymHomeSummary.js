import "./GymHomeSummary.css";
import { formatDayNumber, formatDayMonth, getDayAbbreviation } from "../../../utils/date.js";

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

function weekSessionRow(session) {

    return `

        <li class="gym-week-session-row">

            <div class="gym-week-session-info">

                <span class="gym-week-session-date">${formatDayMonth(session.date)}</span>

                <span class="gym-week-session-title">${session.dayTitle}</span>

            </div>

            <button class="gym-week-session-delete" data-action="delete-gym-session" data-session-id="${session.id}">

                <iconify-icon icon="solar:trash-bin-trash-bold-duotone"></iconify-icon>

            </button>

        </li>

    `;

}

// sessions llega ya formada por Gym.js (fecha + título del día), no una
// sesión cruda — este componente solo renderiza, mismo criterio que
// todayCard/upcomingItem más arriba.
function weekSessionsList(sessions) {

    if (!sessions.length) {

        return `<p class="gym-week-sessions-empty">Aún no hay sesiones completadas esta semana.</p>`;

    }

    return `<ul class="gym-week-sessions-list">${sessions.map(weekSessionRow).join("")}</ul>`;

}

function weekSummary({ completed, total, expanded, sessions }) {

    const percent = total ? Math.round((completed / total) * 100) : 0;

    return `

        <div class="gym-week-summary">

            <button class="gym-week-summary-header" data-action="toggle-week-summary">

                <h2>Resumen semanal</h2>

                <span>${completed}/${total} sesiones completadas</span>

            </button>

            <div class="gym-week-progress-track">

                <div class="gym-week-progress-fill" style="width:${percent}%"></div>

            </div>

            ${expanded ? weekSessionsList(sessions) : ""}

        </div>

    `;

}

// todayDay puede ser null (día de descanso real — hoy no coincide con
// ningún día de la rutina). upcoming/weekProgress vienen ya calculados por
// gymSchedule.js — este componente solo renderiza. weekProgress incluye
// además expanded/sessions (estado del desplegable y su listado, con
// dayTitle ya resuelto) para el borrado desde el resumen semanal.
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
