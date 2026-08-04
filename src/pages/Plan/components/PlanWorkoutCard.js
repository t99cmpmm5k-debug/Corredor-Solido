import "./PlanWorkoutCard.css";

import { isToday, formatDayMonth } from "../../../utils/date.js";

export function PlanWorkoutCard(workout) {

    const icons = [
        "🔥",
        "⚡",
        "❤️",
        "❄️",
        "🕒",
        "🎯"
    ];

    return `

        <section class="plan-workout-card">

            <div class="workout-header">

                <div>

                    <span class="workout-day">

                        ${isToday(workout.date) ? "HOY · " : ""}${workout.day} ${formatDayMonth(workout.date)}

                    </span>

                    <h2>

                        ${workout.title}

                        <span>

                            ${workout.subtitle}

                        </span>

                    </h2>

                </div>

                <div class="workout-badge">

                    ⚡

                </div>

            </div>

            <p class="workout-description">

                ${workout.description}

            </p>

            <div class="workout-grid">

                ${workout.details.map((detail,index)=>`

                    <div class="workout-item">

                        <div class="item-label">

                            <span class="item-icon">

                                ${icons[index] || "•"}

                            </span>

                            <span>

                                ${detail[0]}

                            </span>

                        </div>

                        <strong>

                            ${detail[1]}

                        </strong>

                    </div>

                `).join("")}

            </div>

            <button class="workout-button">

                VER DETALLES DE LA SESIÓN

            </button>

        </section>

    `;

}