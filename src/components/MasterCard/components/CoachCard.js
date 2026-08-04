import "./CoachCard.css";
export function CoachCard(){

    return `

<section class="coach-card">

    <div class="coach-surface"></div>

    <div class="coach-highlight"></div>

    <div class="coach-content">

        <div class="coach-title">

            <i data-lucide="sparkles"></i>

            <span>COACH IA</span>

        </div>
<div class="coach-message">

    <div class="coach-tip">

        <span class="coach-tip-label">

            Consejo del entrenador

        </span>

        <p>

            Hoy hace bastante calor.

            Mantén las pulsaciones entre
            <strong>145 y 155 ppm</strong>.

            No persigas el ritmo.

        </p>

    </div>

</div>

        <button class="coach-button">

            <i data-lucide="play"></i>

            Iniciar entrenamiento

        </button>

    </div>

</section>

`;

}