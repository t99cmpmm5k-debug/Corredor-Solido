import "./WeekSummary.css";

import { WeekChart } from "../WeekChart/WeekChart.js";

// No lee planData.js ni ningún estado — todo llega por parámetro.
// { title, kmDone, kmTarget, workoutCount, insight, nextUp, days, variant }
// Si llega `insight` se muestra esa frase; si no, se usa `days` para
// dibujar el WeekChart (así la variante "strip" de Plan no cambia).
//
// `nextUp` (Inicio, rediseño 2026-09-25) -- { typeLabel, distanceKm, dayLabel } |
// null/undefined -- "Próximo: RODAJE Z2 · 8 km · Miércoles", la sesión de
// plan sin completar más próxima. Opcional: sin pasarlo, esta tarjeta se
// pinta exactamente igual que antes (Home.js es hoy su único consumidor
// real, pero el componente sigue siendo genérico por si Plan lo reutiliza
// algún día, ver comentario de cabecera).
export function WeekSummary({ title, kmDone, kmTarget, workoutCount, insight, nextUp, days, variant = "card" }) {

    const percent = kmTarget > 0 ? Math.round((kmDone / kmTarget) * 100) : 0;

    return `

        <section class="week-summary week-summary--${variant}">

            <h3 class="week-summary-title">

                ${title}

            </h3>

            <div class="week-summary-body">

                <div class="week-summary-ring" style="--percent:${percent}">

                    <span class="week-summary-percent">

                        ${percent}%

                    </span>

                </div>

                <div class="week-summary-stats">

                    <p class="week-summary-km">
                        <strong>${kmDone} / ${kmTarget} km</strong>
                        <span>Objetivo semanal</span>
                    </p>

                    <p class="week-summary-count">

                        ${workoutCount} ${workoutCount === 1 ? "entrenamiento" : "entrenamientos"}

                    </p>

                </div>

            </div>

            ${insight
                ? `<p class="week-summary-insight">${insight}</p>`
                : days ? WeekChart(days, variant) : ""}

            ${nextUp ? `

                <p class="week-summary-next">

                    <iconify-icon icon="solar:calendar-mark-bold-duotone"></iconify-icon>

                    <span>Próximo: <strong>${nextUp.typeLabel}</strong>${nextUp.distanceKm ? ` · ${nextUp.distanceKm} km` : ""} · ${nextUp.dayLabel}</span>

                </p>

            ` : ""}

        </section>

    `;

}
