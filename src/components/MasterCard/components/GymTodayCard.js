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

            <span>${day.title}</span>

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
