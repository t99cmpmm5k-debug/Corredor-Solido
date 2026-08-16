import "./PlanMovePanel.css";

// Sustituye a PlanWorkoutCard mientras hay un movimiento en curso
// (ver Plan.js) — mismo envoltorio visual (.plan-workout-card) que la
// tarjeta normal, para no dar la sensación de una pantalla distinta.
export function PlanMovePanel(movingSession) {

    return `

        <section class="plan-workout-card plan-move-panel">

            <p class="plan-move-instructions">

                Toca un día en el calendario de arriba para mover
                <strong>${movingSession.title ?? "esta sesión"}</strong>.
                Desliza para cambiar de semana.

            </p>

            <button class="workout-button workout-button--ghost" data-action="cancel-move-session">

                CANCELAR

            </button>

        </section>

    `;

}
