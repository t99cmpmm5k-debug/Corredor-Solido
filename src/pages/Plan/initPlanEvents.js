import { week } from "../../data/planData";
import { setSelectedWorkout } from "./planStore";
import { rerender } from "../../core/router";

export function initPlanEvents() {

    document.querySelectorAll(".timeline-day").forEach(day => {

        day.addEventListener("click", () => {

            const workout = week.find(
                session => session.day === day.dataset.day
            );

            if (!workout) return;

            setSelectedWorkout(workout);

            rerender();

        });

    });

}