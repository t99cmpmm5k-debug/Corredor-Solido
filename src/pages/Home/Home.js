import "./Home.css";

import { Hero } from "../../components/Hero/Hero.js";
import { BottomNavigation } from "../../components/Navigation/BottomNavigation.js";
import { MasterCard } from "../../components/MasterCard/MasterCard.js";
import { WeekSummary } from "../../components/WeekSummary/WeekSummary.js";
import { getCurrentWeekSessions, getWeekVolume } from "../../data/workoutStore.js";
import { buildWeekInsight } from "../../utils/weekInsight.js";

export function Home(){

    const week = getCurrentWeekSessions();
    const { completed, goal } = getWeekVolume();

    const workoutCount = week.filter(
        session => session.status === "completed" && session.type !== "recovery" && session.type !== "free"
    ).length;

    const insight = buildWeekInsight(week, { completed, goal });

    return `

        <main class="home">

            <section class="hero-layout">

                ${Hero()}

                ${MasterCard()}

                <section class="week-chart-card">

                    ${WeekSummary({
                        title:"ESTA SEMANA",
                        kmDone: completed,
                        kmTarget: goal,
                        workoutCount,
                        insight,
                        variant:"card"
                    })}

                </section>

            </section>

            ${BottomNavigation()}

        </main>

    `;

}
