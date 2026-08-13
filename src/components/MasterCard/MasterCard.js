import "./MasterCard.css";

import { SessionCard } from "./components/SessionCard.js";
import { getTodaySession } from "../../data/workoutStore.js";
import { getState } from "../../core/state.js";

function EmptySessionCard() {

    return `

        <section class="session-card session-card--empty">

            <p>No hay ninguna sesión planificada para hoy.</p>

        </section>

    `;

}

export function MasterCard(){

    // Lectura directa de state en vez de planStore.getSelectedWorkout():
    // ese getter auto-inicializa la selección a sessions[0] si no hay
    // sesión hoy, y aquí eso mostraría el lunes como si fuera "hoy" en
    // un día de descanso real. Solo se sustituye getTodaySession() cuando
    // el usuario ha elegido otro día de verdad (botón "Cambiar").
    const workout = getState().selectedWorkout ?? getTodaySession();

    return `

        <section class="master-card">

            ${workout ? SessionCard(workout) : EmptySessionCard()}

        </section>

    `;

}