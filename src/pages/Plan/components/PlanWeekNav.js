import "./PlanWeekNav.css";

// Compartido entre PlanHeader (sobre la foto de fondo, texto blanco) y
// PlanEmptyState (fondo plano, sin foto) — mismo comportamiento de
// navegación en los dos sitios, solo cambia el contraste del texto.
export function PlanWeekNav(weekNumber, dateRange, { photo = false } = {}) {

    return `

        <div class="plan-week-nav ${photo ? "plan-week-nav--photo" : ""}">

            <button class="week-nav-button" data-action="prev-week" aria-label="Semana anterior">

                <iconify-icon icon="solar:alt-arrow-left-bold-duotone"></iconify-icon>

            </button>

            <div class="week-label-group">

                <span class="week-label">

                    SEMANA ${weekNumber}

                </span>

                <span class="week-date">

                    ${dateRange}

                </span>

            </div>

            <button class="week-nav-button" data-action="next-week" aria-label="Semana siguiente">

                <iconify-icon icon="solar:alt-arrow-right-bold-duotone"></iconify-icon>

            </button>

        </div>

    `;

}
