import "./GymHomeSummary.css";
import { addDays, formatDayNumber, formatDayMonth, formatWeekday, getDayAbbreviation } from "../../../utils/date.js";
import { getAverageDurationForDay } from "../../../data/gymSessionStore.js";

// Nº de ejercicios real + duración media real de sesiones YA terminadas de
// este día concreto (getAverageDurationForDay(), nunca inventada) -- mismo
// criterio que compactSummary() en GymTodayCard.js (Inicio) y
// buildSummaryLine() en PlanGymDayCard.js (Plan): un día que nunca se ha
// hecho todavía no tiene duración que mostrar, y no se inventa una.
function todaySummaryLine(day) {

    const count = day.exercises.length;
    const parts = [`${count} ejercicio${count === 1 ? "" : "s"}`];

    const avgDurationSec = getAverageDurationForDay(day.id);
    if (avgDurationSec != null) parts.push(`~${Math.round(avgDurationSec / 60)} min`);

    return parts.join(" · ");

}

// "Descansa hoy. Mañana toca X · N ejercicios." si el próximo entrenamiento
// real es mañana, "Recupera hoy. Tu próximo entrenamiento es X · lunes 31."
// si cae más adelante -- siempre con el primer elemento real de
// getUpcomingGymDays() (gymSchedule.js), nunca un día inventado. upcoming
// solo puede venir vacío si hasWeeklySchedule(days) fuese false, pero
// Gym.js ya filtra ese caso antes de renderizar esta sección entera -- el
// mensaje neutro de aquí es un colchón defensivo, no la vía esperada.
function restDayMessage(upcoming, todayISO) {

    if (!upcoming.length) return "No tienes entrenamiento programado hoy.";

    const next = upcoming[0];

    if (next.date === addDays(todayISO, 1)) {

        const count = next.day.exercises.length;
        return `Descansa hoy. Mañana toca ${next.day.title} · ${count} ejercicio${count === 1 ? "" : "s"}.`;

    }

    return `Recupera hoy. Tu próximo entrenamiento es ${next.day.title} · ${formatWeekday(next.date)} ${formatDayNumber(next.date)}.`;

}

function todayCard(day, upcoming, todayISO) {

    if (!day) {

        return `

            <div class="gym-today-card is-rest">

                <span class="gym-today-label">HOY</span>

                <h2>Día de descanso</h2>

                <p>${restDayMessage(upcoming, todayISO)}</p>

            </div>

        `;

    }

    return `

        <div class="gym-today-card">

            <span class="gym-today-label">ENTRENAMIENTO DE HOY</span>

            <h2>${day.title}</h2>

            <span class="gym-today-count">${todaySummaryLine(day)}</span>

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

// Mensaje de cierre de la semana -- sesiones que faltan (dato real,
// total-completed de gymSchedule.js) o "semana completada" cuando ya no
// queda ninguna. Nunca inventa qué sesión concreta falta, solo el conteo.
function pendingSessionMessage(completed, total) {

    const remaining = total - completed;

    if (remaining <= 0) return "Semana completada.";

    return `Te queda${remaining === 1 ? "" : "n"} ${remaining} sesión${remaining === 1 ? "" : "es"} esta semana.`;

}

function weekSummary({ completed, total, exercises, sets, expanded, sessions }) {

    const percent = total ? Math.round((completed / total) * 100) : 0;

    return `

        <div class="gym-week-summary">

            <button class="gym-week-summary-header" data-action="toggle-week-summary">

                <h2>Resumen semanal</h2>

                <span>${completed}/${total} sesiones</span>

            </button>

            <p class="gym-week-summary-stats">${exercises} ejercicio${exercises === 1 ? "" : "s"} · ${sets} serie${sets === 1 ? "" : "s"}</p>

            <div class="gym-week-progress-track">

                <div class="gym-week-progress-fill" style="width:${percent}%"></div>

            </div>

            <p class="gym-week-summary-message">${pendingSessionMessage(completed, total)}</p>

            ${expanded ? weekSessionsList(sessions) : ""}

        </div>

    `;

}

// todayDay puede ser null (día de descanso real — hoy no coincide con
// ningún día de la rutina). upcoming/weekProgress vienen ya calculados por
// gymSchedule.js — este componente solo renderiza. weekProgress incluye
// además expanded/sessions (estado del desplegable y su listado, con
// dayTitle ya resuelto) para el borrado desde el resumen semanal.
export function GymHomeSummary({ todayDay, upcoming, weekProgress, todayISO }) {

    return `

        <div class="gym-home-summary">

            ${todayCard(todayDay, upcoming, todayISO)}

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
