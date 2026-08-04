import "./MasterCard.css";

import { SessionCard } from "./components/SessionCard.js";
import { getTodayWorkout } from "../../data/planData.js";

export function MasterCard(){

    const workout = getTodayWorkout();

    return `

        <section class="master-card">

            ${SessionCard(workout)}

        </section>

    `;

}