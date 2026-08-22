import "./Home.css";

import { Hero } from "../../components/Hero/Hero.js";
import { BottomNavigation } from "../../components/Navigation/BottomNavigation.js";
import { MasterCard } from "../../components/MasterCard/MasterCard.js";
import { WeekSummary } from "../../components/WeekSummary/WeekSummary.js";
import { HourlyWeather } from "./components/HourlyWeather.js";
import { getCurrentWeekSessions, getWeekVolume } from "../../data/workoutStore.js";
import { buildWeekInsight } from "../../utils/weekInsight.js";
import { getHourlyWeatherState } from "./homeWeatherStore.js";

export function Home(){

    const week = getCurrentWeekSessions();
    const { completed, goal } = getWeekVolume();

    const workoutCount = week.filter(
        session => session.status === "completed" && session.type !== "recovery" && session.type !== "free"
    ).length;

    const insight = buildWeekInsight(week, { completed, goal });

    // El pronóstico se pide una sola vez desde main.js (boot) y se cachea
    // en homeWeatherStore -- Home() solo lee el estado ya resuelto, nunca
    // dispara la petición él mismo. Con status distinto de "ready" (sin
    // ubicación, API caída, todavía cargando) HourlyWeather() devuelve ""
    // y la sección desaparece sin dejar hueco ni dato inventado.
    const weather = getHourlyWeatherState();

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

                ${weather.status === "ready" ? `

                    <section class="hourly-weather-card">

                        ${HourlyWeather(weather)}

                    </section>

                ` : ""}

            </section>

            ${BottomNavigation()}

        </main>

    `;

}
