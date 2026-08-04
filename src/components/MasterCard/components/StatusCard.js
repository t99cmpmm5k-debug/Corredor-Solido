import "./StatusCard.css";
export function StatusCard() {

    return `

<section class="status-card">

    <div class="status-surface"></div>

    <div class="status-highlight"></div>

    <div class="status-content">

        <div class="status-title">

            <i data-lucide="activity"></i>

            <span>ESTADO DE HOY</span>

        </div>

        <div class="status-list">

            <div class="status-item">

                <i data-lucide="moon"></i>

                <span>Sueño</span>

                <strong>7 h</strong>

            </div>

            <div class="status-item">

                <i data-lucide="zap"></i>

                <span>Energía</span>

                <strong>Alta</strong>

            </div>

            <div class="status-item">

                <i data-lucide="thermometer"></i>

                <span>Temperatura</span>

                <strong>31°</strong>

            </div>

            <div class="status-item">

                <i data-lucide="gauge"></i>

                <span>Carga</span>

                <strong>Media</strong>

            </div>

        </div>

        <div class="status-score">

            <div class="status-score-top">

                <span>Preparado para entrenar</span>

                <strong>82%</strong>

            </div>

            <div class="status-progress">

                <div class="status-progress-fill"></div>

            </div>

        </div>

    </div>

</section>

`;

}