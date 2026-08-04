import "./TimelineDay.css";
import { WorkoutIcon } from "../../../../components/WorkoutIcon/WorkoutIcon";
import { formatDayNumber } from "../../../../utils/date.js";

export function TimelineDay(session, selected, completed) {

    return `

        <div
            class="
                timeline-day
                ${selected ? "today" : ""}
                ${completed ? "completed" : ""}
            "
            data-day="${session.day}"
        >

            <div class="timeline-top">

                <span class="day-name">

                    ${session.day}

                </span>

                <span class="day-number">

                    ${formatDayNumber(session.date)}

                </span>

            </div>

            <div class="day-center">

                ${WorkoutIcon(

                    session.type,

                    {

                        selected,

                        completed

                    }

                )}

            </div>

            <div class="timeline-bottom">

                <span class="timeline-title">

                    ${session.title}

                </span>

                <span class="timeline-subtitle">

                    ${session.subtitle}

                </span>

            </div>

        </div>

    `;

}
