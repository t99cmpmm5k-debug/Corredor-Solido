import "./Plan.css";

import { PlanHeader } from "./components/PlanHeader";
import { PlanTimeline } from "./components/PlanTimeline";
import { PlanConnector } from "./components/PlanConnector";
import { PlanWorkoutCard } from "./components/PlanWorkoutCard";

import { getSelectedWorkout } from "./planStore";
import { PlanLoadChart } from "./components/PlanLoadChart";
import { BottomNavigation } from "../../components/Navigation/BottomNavigation.js";

export function Plan() {

    const selectedWorkout = getSelectedWorkout();

    return `

        <section class="plan-page">

            ${PlanHeader(PlanTimeline(selectedWorkout))}

            ${PlanConnector()}

            ${PlanWorkoutCard(selectedWorkout)}
            ${PlanLoadChart()}

        </section>

        ${BottomNavigation()}

    `;

}