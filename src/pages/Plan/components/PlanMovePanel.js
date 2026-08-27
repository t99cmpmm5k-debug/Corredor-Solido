import "./PlanMovePanel.css";

// Sustituye a PlanWorkoutCard mientras hay un movimiento o un duplicado
// en curso (ver Plan.js) — mismo envoltorio visual (.plan-workout-card)
// que la tarjeta normal, para no dar la sensación de una pantalla
// distinta. mode: "move" (por defecto) o "duplicate" (menú "···" de
// PlanWorkoutCard, fase 4 del pulido de Plan) -- mismo componente, solo
// cambia el texto y qué acción de cancelar dispara (moveSessionTo() sigue
// necesitando cancelMoveSession() aparte de cancelDuplicateSession()
// porque son dos ids de store independientes, ver planStore.js).
export function PlanMovePanel(session, mode = "move") {

    const isDuplicate = mode === "duplicate";

    return `

        <section class="plan-workout-card plan-move-panel">

            <p class="plan-move-instructions">

                Toca un día en el calendario de arriba para ${isDuplicate ? "duplicar" : "mover"}
                <strong>${session.title ?? "esta sesión"}</strong>.
                Desliza para cambiar de semana.

            </p>

            <button
                class="workout-button workout-button--ghost"
                data-action="${isDuplicate ? "cancel-duplicate-session" : "cancel-move-session"}"
            >

                CANCELAR

            </button>

        </section>

    `;

}
