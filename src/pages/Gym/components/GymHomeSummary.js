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

// Toda la fila arranca ese día (mismo data-action="select-day" que las
// filas de "Tus rutinas") -- no existe una vista de "calendario de fuerza"
// a la que llevar, así que tampoco se enlaza ninguna.
function upcomingItem({ day, date }) {

    const count = day.exercises.length;

    return `

        <li>

            <button class="gym-upcoming-item" data-action="select-day" data-day-id="${day.id}">

                <span class="gym-upcoming-date">${getDayAbbreviation(date)} ${formatDayNumber(date)}</span>

                <span class="gym-upcoming-title">${day.title}</span>

                <span class="gym-upcoming-count">${count} ejercicio${count === 1 ? "" : "s"}</span>

            </button>

        </li>

    `;

}

// Borrar una sesión de la semana: la única acción que ya existía aquí (no
// hay edición de una sesión pasada), ahora dentro de un ··· en vez de una
// papelera siempre visible. Comparte el estado "qué menú está abierto"
// con los ··· de las rutinas (ver RoutineMenu() en Gym.js).
function weekSessionRow(session, openMenuId) {

    const open = openMenuId === session.id;

    return `

        <li class="gym-week-session-row">

            <span class="gym-week-session-date">${formatDayMonth(session.date)}</span>

            <span class="gym-week-session-title">${session.dayTitle}</span>

            <div class="gym-routine-menu">

                <button class="gym-routine-menu-toggle" data-action="toggle-routine-menu" data-menu-id="${session.id}" aria-label="Más opciones de la sesión" aria-expanded="${open}">
                    <iconify-icon icon="solar:menu-dots-bold"></iconify-icon>
                </button>

                ${open ? `

                    <div class="gym-routine-menu-popover">

                        <button class="gym-routine-menu-danger" data-action="delete-gym-session" data-session-id="${session.id}">
                            <iconify-icon icon="solar:trash-bin-trash-bold-duotone"></iconify-icon>
                            Eliminar sesión
                        </button>

                    </div>

                ` : ""}

            </div>

        </li>

    `;

}

// sessions llega ya formada por Gym.js (fecha + título del día), no una
// sesión cruda — este componente solo renderiza.
function weekSessionsList(sessions, openMenuId) {

    if (!sessions.length) {

        return `<p class="gym-week-sessions-empty">Aún no hay sesiones completadas esta semana.</p>`;

    }

    return `<ul class="gym-week-sessions-list">${sessions.map(session => weekSessionRow(session, openMenuId)).join("")}</ul>`;

}

function plural(count, singular, pluralText) {

    return `${count} ${count === 1 ? singular : pluralText}`;

}

// Una sola línea de progreso real de la semana: ejercicios y series HECHOS
// (weekTotals() en gymSchedule.js, solo series marcadas) y sesiones
// terminadas/programadas. Sin ninguna sesión hecha todavía, solo el conteo
// de sesiones -- nunca "0 ejercicios · 0 series".
export function weekLine({ completed, total, exercises, sets }) {

    const sessions = `${completed}/${total} sesiones`;

    if (!completed) return sessions;

    return `${plural(exercises, "ejercicio", "ejercicios")} · ${plural(sets, "serie", "series")} · ${sessions}`;

}

function weekSummary(progress, openMenuId) {

    const { completed, total, expanded, sessions } = progress;
    const percent = total ? Math.round((completed / total) * 100) : 0;

    return `

        <section class="gym-week-summary">

            <button class="gym-week-summary-header" data-action="toggle-week-summary" aria-expanded="${expanded}">

                <h2>Resumen semanal</h2>

                <iconify-icon icon="solar:alt-arrow-${expanded ? "up" : "down"}-linear"></iconify-icon>

            </button>

            <p class="gym-week-summary-stats">${weekLine(progress)}</p>

            <div class="gym-week-progress-track">

                <div class="gym-week-progress-fill" style="width:${percent}%"></div>

            </div>

            ${expanded ? weekSessionsList(sessions, openMenuId) : ""}

        </section>

    `;

}

// todayDay puede ser null (día de descanso real — hoy no coincide con
// ningún día de la rutina). upcoming/weekProgress vienen ya calculados por
// gymSchedule.js — este componente solo renderiza. weekProgress incluye
// además expanded/sessions (estado del desplegable y su listado, con
// dayTitle ya resuelto) para el borrado desde el resumen semanal.
export function GymHomeSummary({ todayDay, upcoming, weekProgress, todayISO, openMenuId = null }) {

    return `

        <div class="gym-home-summary">

            ${todayCard(todayDay, upcoming, todayISO)}

            ${upcoming.length ? `

                <section class="gym-upcoming">

                    <h2 class="gym-section-title">Próximos entrenamientos</h2>

                    <ul class="gym-upcoming-list">

                        ${upcoming.map(upcomingItem).join("")}

                    </ul>

                </section>

            ` : ""}

            ${weekSummary(weekProgress, openMenuId)}

        </div>

    `;

}
