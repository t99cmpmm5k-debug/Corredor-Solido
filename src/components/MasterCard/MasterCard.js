import "./MasterCard.css";

import { SessionCard } from "./components/SessionCard.js";
import { getTodaySession } from "../../data/workoutStore.js";

function EmptySessionCard() {

    return `

        <section class="session-card session-card--empty">

            <p>No hay ninguna sesión planificada para hoy.</p>

        </section>

    `;

}

export function MasterCard(){

    const workout = getTodaySession();

    return `

        <section class="master-card">

            ${workout ? SessionCard(workout) : EmptySessionCard()}

        </section>

    `;

}