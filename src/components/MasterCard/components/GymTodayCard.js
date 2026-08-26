import { getAverageDurationForDay } from "../../../data/gymSessionStore.js";

// Compactado 2026-08-26: "Pierna · 6 ejercicios · 45 min" en vez de solo
// el título del día -- ejercicios reales (day.exercises.length), y una
// duración real solo si hay historial de ESTE día concreto ya terminado
// (media de las últimas sesiones, ver getAverageDurationForDay() en
// gymSessionStore.js) -- un día que nunca se ha hecho todavía no tiene
// duración que mostrar, y no se inventa una.
function compactSummary(day) {

    const parts = [day.title, `${day.exercises.length} ejercicio${day.exercises.length === 1 ? "" : "s"}`];

    const avgDurationSec = getAverageDurationForDay(day.id);
    if (avgDurationSec != null) parts.push(`~${Math.round(avgDurationSec / 60)} min`);

    return parts.join(" · ");

}

// Rellena el mismo hueco de tarjeta que SessionCard cuando hoy no hay
// running planificado pero sí toca gimnasio (ver getGymDayForDate() en
// gymTimelineBridge.js, misma fuente que Plan) -- running sigue mandando
// siempre que haya running planificado hoy (decisión confirmada), esto
// solo sustituye el aviso genérico de "nada planificado" cuando sí hay
// algo, aunque no sea running. Reutiliza las mismas clases CSS que
// SessionCard (session-card/session-glass/session-outline...) para que
// sessionCardOutline.js (genérico, busca ".session-card" por clase) le
// dé el mismo tratamiento visual sin duplicar ni un estilo nuevo.
export function GymTodayCard({ routine, day, finishedSession }) {

    const completed = finishedSession != null;

    return `

<section class="session-card">

    <div class="session-glass"></div>

    <div class="session-highlight"></div>

    <svg class="session-outline">

        <path class="session-outline-stroke"></path>

    </svg>

    <div class="session-content">

        <header class="session-header">

            <div class="session-title">

                <i data-lucide="dumbbell"></i>

                <span>GIMNASIO DE HOY</span>

            </div>

            ${completed ? `

                <span class="session-completed-badge">

                    <i data-lucide="check-circle"></i>

                    Finalizada

                </span>

            ` : ""}

        </header>

        <div class="session-type">

            <i data-lucide="dumbbell"></i>

            <span>${compactSummary(day)}</span>

        </div>

        <button
            class="session-button"
            data-action="${completed ? "view-completed-gym-session" : "start-gym-day"}"
            data-day-id="${day.id}"
        >

            <i data-lucide="${completed ? "check" : "play"}"></i>

            ${completed ? "Ver resumen" : "Empezar rutina"}

        </button>

    </div>

</section>

`;

}
