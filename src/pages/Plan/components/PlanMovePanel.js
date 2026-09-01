import "./PlanMovePanel.css";

// Sustituye a PlanWorkoutCard mientras hay un movimiento o un duplicado
// en curso (ver Plan.js) — mismo envoltorio visual (.plan-workout-card)
// que la tarjeta normal, para no dar la sensación de una pantalla
// distinta. mode: "move" (por defecto), "duplicate" (menú "···" de
// PlanWorkoutCard, fase 4 del pulido de Plan) o "moveGym" (misma acción
// para un día de gimnasio, ver PlanGymDayCard.js/PlanGymMoveDayPicker.js)
// -- mismo componente, solo cambia el texto y qué acción de cancelar
// dispara. "moveGym" lleva texto propio (nunca "Desliza para cambiar de
// semana": el destino es un día de la semana RECURRENTE, no una fecha
// concreta de la semana que se esté viendo, ver moveRoutineDayToWeekday()
// en gymRoutineStore.js) en vez de reusar el de "move" con un simple
// isDuplicate booleano.
export function PlanMovePanel(session, mode = "move") {

    const isDuplicate = mode === "duplicate";
    const isMoveGym = mode === "moveGym";

    const instructions = isMoveGym
        ? `Toca un día de la semana para mover <strong>${session.title ?? "esta rutina"}</strong>. Se moverá cada semana, no solo esta.`
        : `Toca un día en el calendario de arriba para ${isDuplicate ? "duplicar" : "mover"} <strong>${session.title ?? "esta sesión"}</strong>. Desliza para cambiar de semana.`;

    const cancelAction = isMoveGym
        ? "cancel-move-gym-day"
        : isDuplicate ? "cancel-duplicate-session" : "cancel-move-session";

    return `

        <section class="plan-workout-card plan-move-panel">

            <p class="plan-move-instructions">

                ${instructions}

            </p>

            <button
                class="workout-button workout-button--ghost"
                data-action="${cancelAction}"
            >

                CANCELAR

            </button>

        </section>

    `;

}
