import "./WeekChart.css";

// days: [{ label, value, muted, highlighted }]
// No lee planData.js ni ningún estado — quien lo llama arma este array.
// Sin leyenda, así que las barras no distinguen categoría de entreno:
// solo tema (color-primary), atenuadas si no hay sesión, destacadas si es hoy.
export function WeekChart(days = [], variant = "card") {

    return `

        <div class="week-chart week-chart--${variant}">

            ${days.map(day => `

                <div class="week-chart-column">

                    <div
                        class="week-chart-bar ${day.muted ? "muted" : ""} ${day.highlighted ? "highlighted" : ""}"
                        style="height:${Math.max(day.value, 4)}px"
                    ></div>

                    <span class="week-chart-label">

                        ${day.label}

                    </span>

                </div>

            `).join("")}

        </div>

    `;

}
