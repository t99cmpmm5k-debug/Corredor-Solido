import "./PlanLoadChart.css";

import { week } from "../../../data/planData.js";
import { DAY_INITIALS, isToday } from "../../../utils/date.js";

// Categoría visual de la barra (mismo valor que el "type" de planData.js,
// como whitelist defensiva frente a un type desconocido)
const LOAD_CATEGORY = {
    easy:"easy",
    gym:"gym",
    series:"series",
    rest:"rest",
    long:"long",
    free:"free"
};

export function PlanLoadChart(){

    const today = week.find(session => isToday(session.date)) || week[0];

    return `

        <section class="plan-load-chart">

            <div class="chart-header">

                <h3>

                    CARGA DE LA SEMANA

                </h3>

                <div class="chart-tag">

                    ${today.day} · ${today.title.toUpperCase()} · CARGA ${today.load}

                </div>

            </div>

            <div class="chart-bars">

                ${week.map(session=>`

                    <div class="chart-column">

                        <span class="chart-value">

                            ${session.load}

                        </span>

                        <div
                            class="chart-bar ${LOAD_CATEGORY[session.type] ?? "easy"} ${isToday(session.date) ? "selected" : ""}"
                            style="height:${Math.max(session.load,6)}px"
                        ></div>

                        <span class="chart-day">

                            ${DAY_INITIALS[session.day] ?? session.day}

                        </span>

                    </div>

                `).join("")}

            </div>

            <div class="chart-legend">

                <span><i class="easy"></i>Rodaje</span>

                <span><i class="series"></i>Series</span>

                <span><i class="gym"></i>Fuerza</span>

                <span><i class="long"></i>Tirada</span>

                <span><i class="rest"></i>Descanso</span>

            </div>

            <p class="chart-note">

                ℹ️ La carga se calcula según duración e intensidad de cada sesión.

            </p>

        </section>

    `;

}
