import "./WeekSummary.css";

import { WeekChart } from "../WeekChart/WeekChart.js";
import { formatKm } from "../../utils/format.js";

// No lee planData.js ni ningún estado — todo llega por parámetro.
// { title, kmDone, kmTarget, sessionsDone, sessionsPlanned, insight, nextUp, days, variant }
// Si llega `insight` se muestra esa frase; si no, se usa `days` para
// dibujar el WeekChart (así la variante "strip" de Plan no cambia).
//
// `nextUp` (Inicio, rediseño 2026-09-25) -- { typeLabel, distanceKm, dayLabel } |
// null/undefined -- "Próximo: RODAJE Z2 · 8 km · Miércoles", la sesión de
// plan sin completar más próxima. Opcional: sin pasarlo, esta tarjeta se
// pinta exactamente igual que antes (Home.js es hoy su único consumidor
// real, pero el componente sigue siendo genérico por si Plan lo reutiliza
// algún día, ver comentario de cabecera).
//
// `sessionsDone`/`sessionsPlanned` (ajuste de Inicio 2026-09-27) --
// "8/23 km · 2/3 sesiones": cumplimiento del PLAN, mismo par que ya da
// buildPlanCompliance() (sessionsCompleted/sessionsPlanned). Sustituye al
// antiguo "N entrenamientos" + "Objetivo semanal", que no decía de
// cuántas sesiones planificadas salía ese número.
//
// `empty` (ajuste final de Inicio 2026-09-28) -- true sin ninguna sesión
// de plan esta semana: en vez de un anillo "0/0 km · 0/0 sesiones" (que
// parecía un dato real a cero), estado vacío con acceso directo a la
// importación de Plan (data-action="import-plan", ver initHomeEvents.js).
export function WeekSummary({ title, kmDone, kmTarget, sessionsDone, sessionsPlanned, insight, nextUp, days, variant = "card", empty = false }) {

    if (empty) {

        return `

            <section class="week-summary week-summary--${variant} week-summary--empty">

                <h3 class="week-summary-title">${title}</h3>

                <p class="week-summary-empty-message">Aún no tienes sesiones planificadas.</p>

                <button type="button" class="week-summary-empty-action" data-action="import-plan">

                    Importar plan <span aria-hidden="true">›</span>

                </button>

            </section>

        `;

    }

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
                        <strong>${formatKm(kmDone)}/${formatKm(kmTarget)} km</strong>
                    </p>

                    <p class="week-summary-count">

                        ${sessionsDone}/${sessionsPlanned} ${sessionsPlanned === 1 ? "sesión" : "sesiones"}

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
