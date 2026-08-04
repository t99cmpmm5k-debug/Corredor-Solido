import "./MasterCard.css";

export function MasterCard() {

    return `

<section class="master-card">

    <div class="mc-shell">

        <div class="mc-glow"></div>

        <div class="mc-notch"></div>

        <div class="mc-content">

            <div class="mc-top">

                <div>

                    <span class="mc-label">

                        ⚡ SESIÓN DE HOY

                    </span>

                    <h2>

                        Rodaje Z2

                    </h2>

                    <p>

                        Construyendo tu base aeróbica

                    </p>

                </div>

                <button class="mc-change">

                    Cambiar

                </button>

            </div>

            <div class="mc-divider"></div>

            <div class="mc-metrics">

                <div class="mc-metric">

                    <span class="metric-value">

                        8 km

                    </span>

                    <span class="metric-label">

                        Distancia

                    </span>

                </div>

                <div class="mc-metric">

                    <span class="metric-value">

                        Z2

                    </span>

                    <span class="metric-label">

                        Zona

                    </span>

                </div>

                <div class="mc-metric">

                    <span class="metric-value">

                        45 min

                    </span>

                    <span class="metric-label">

                        Duración

                    </span>

                </div>

            </div>

            <div class="mc-divider"></div>

            <div class="mc-coach">

                <span class="coach-title">

                    Coach IA

                </span>

                <p>

                    Hoy toca un rodaje en Zona 2.
                    Corre cómodo y mantén las pulsaciones
                    bajo control durante todo el entrenamiento.

                </p>

            </div>

            <button class="mc-start">

                ▶ Iniciar entrenamiento

            </button>

        </div>

    </div>

</section>

`;

}