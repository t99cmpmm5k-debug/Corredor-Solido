export function SessionCard(workout) {

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

                <i data-lucide="zap"></i>

                <span>SESIÓN DE HOY</span>

            </div>

            <button class="session-change">

                <i data-lucide="refresh-cw"></i>

                Cambiar

            </button>

        </header>

        <div class="session-type">

            <i data-lucide="footprints"></i>

            <span>${workout.title}</span>

        </div>

        <div class="session-metrics">

            ${workout.metrics.map(metric => `

                <div class="metric">

                    <i data-lucide="${metric.icon}"></i>

                    <strong>${metric.value}${metric.unit ? `<span class="metric-unit">${metric.unit}</span>` : ""}</strong>

                    <span>${metric.label}</span>

                </div>

            `).join("")}

        </div>

        <button class="session-button">

            <i data-lucide="play"></i>

            Iniciar entrenamiento

        </button>

    </div>

</section>

`;

}
