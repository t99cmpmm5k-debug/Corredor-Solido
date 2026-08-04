import "./PlanTimeline.css";

import { week } from "../../../data/planData";
import { TimelineDay } from "./TimelineDay/TimelineDay";

export function PlanTimeline(selectedWorkout) {

    const selectedIndex = week.findIndex(
        session => session.day === selectedWorkout.day
    );

    const progress =
        (selectedIndex / (week.length - 1)) * 100;

    return `

        <section class="plan-timeline">

            <div class="timeline-track">

                <div
                    class="timeline-progress"
                    style="width:${progress}%"
                ></div>

            </div>

            ${week.map((session,index)=>

                TimelineDay(

                    session,

                    index === selectedIndex,

                    index < selectedIndex

                )

            ).join("")}

        </section>

    `;

}