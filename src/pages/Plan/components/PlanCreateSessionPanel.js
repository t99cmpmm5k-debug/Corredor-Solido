import "./PlanCreateSessionPanel.css";

import { WORKOUT_TYPES } from "../../../data/workoutTypes.js";
import { formatDayMonth } from "../../../utils/date.js";

// Mismos tipos que ya usa la app entera (WORKOUT_TYPES — de ahí sale
// también TIMELINE_TYPE_COLOR en PlanTimeline.js), nunca una lista propia
// -- ya es el mismo catálogo que ofrece el selector de tipo al revisar un
// plan importado (ver PLAN_SESSION_REVIEW_FIELDS en PlanImportReviewStep.js).
const TYPE_OPTIONS = Object.values(WORKOUT_TYPES);

// Sustituye a PlanWorkoutCard al tocar un día "Descanso" de la línea
// semanal o del calendario mensual (ver initPlanEvents.js) -- mismo
// envoltorio visual (.plan-workout-card) que la tarjeta normal y que
// PlanMovePanel, para no dar sensación de pantalla distinta. La fecha ya
// viene fija del día que se tocó -- este flujo simple no la deja editar,
// a diferencia del wizard de importación (que sí permite fecha por
// sesión).
export function PlanCreateSessionPanel(date, type, notes) {

    return `

        <section class="plan-workout-card plan-create-session-panel">

            <p class="plan-create-session-date">

                Nueva sesión · ${formatDayMonth(date)}

            </p>

            <label class="plan-create-session-field">

                <span>Tipo de sesión</span>

                <select data-action="set-manual-session-type">

                    ${TYPE_OPTIONS.map(option => `

                        <option value="${option.id}" ${option.id === type ? "selected" : ""}>

                            ${option.label}

                        </option>

                    `).join("")}

                </select>

            </label>

            <label class="plan-create-session-field">

                <span>Notas (opcional)</span>

                <textarea
                    data-action="set-manual-session-notes"
                    placeholder="Ej. rodaje suave, sin prisa"
                >${notes ?? ""}</textarea>

            </label>

            <div class="plan-create-session-actions">

                <button class="workout-button workout-button--ghost" data-action="cancel-manual-session">

                    CANCELAR

                </button>

                <button class="workout-button" data-action="save-manual-session">

                    GUARDAR SESIÓN

                </button>

            </div>

        </section>

    `;

}
