import "./RunnerStatusWidget.css";

// "Estado del corredor" (Inicio, Capa 2) -- `indicators` ya viene
// calculado y filtrado (ver buildRunnerStatusIndicators() en
// utils/runnerStatus.js), este componente es puro renderizado, igual que
// MonthlyKmWidget.js/PlanComplianceWidget.js.
//
// Sin ningún indicador disponible, el bloque entero no se pinta -- mismo
// criterio que NextGoalWidget.js sin carrera próxima. Con 1 a 4
// indicadores, el grid se reparte el ancho entre los que haya (ver
// .runner-status-item en el CSS, flex:1 igual que .running-summary-item
// en Running.css) -- nunca huecos vacíos reservados para uno que falte.
export function RunnerStatusWidget(indicators) {

    if (!indicators.length) return "";

    return `

        <section class="runner-status-widget">

            <span class="runner-status-label">ESTADO DEL CORREDOR</span>

            <div class="runner-status-grid">

                ${indicators.map(indicator => `

                    <div class="runner-status-item">

                        <iconify-icon icon="${indicator.icon}"></iconify-icon>

                        <span class="runner-status-value">${indicator.value}</span>

                        <span class="runner-status-item-label">${indicator.label}</span>

                    </div>

                `).join("")}

            </div>

        </section>

    `;

}
