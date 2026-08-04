import "./PlanHeader.css";
import planHeader from "../../../assets/images/plan/plan-header.webp";

export function PlanHeader() {

    return `

    <header class="plan-header">

        <img
            class="plan-background-image"
            src="${planHeader}"
            alt=""
        >

        <div class="plan-overlay"></div>

        <div class="plan-glow"></div>

        <div class="plan-content">

            <div class="plan-header-top">

                <div class="plan-title">

                    <h1>PLAN</h1>

                    <p class="plan-subtitle">

                        TU MAPA DE ENTRENAMIENTO

                    </p>

                </div>

                <button class="plan-add-button">

                    +

                </button>

            </div>

            <div class="plan-stats">

                <div class="plan-week">

                    <span class="week-label">

                        SEMANA 30

                    </span>

                    <span class="week-date">

                        20 JUL · 26 JUL

                    </span>

                </div>

                <div class="plan-progress">

                    <div class="progress-ring">

                        63%

                    </div>

                    <small>

                        COMPLETADO

                    </small>

                </div>

                <div class="plan-load">

                    <span>

                        CARGA SEMANAL

                    </span>

                    <strong>

                        318 / 420

                    </strong>

                    <div class="load-bar">

                        <div class="load-fill"></div>

                    </div>

                </div>

            </div>

        </div>

    </header>

    `;

}