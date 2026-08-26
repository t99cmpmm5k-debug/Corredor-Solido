import "./Home.css";

import { Hero } from "../../components/Hero/Hero.js";
import { BottomNavigation } from "../../components/Navigation/BottomNavigation.js";
import { MasterCard } from "../../components/MasterCard/MasterCard.js";
import { WeekSummary } from "../../components/WeekSummary/WeekSummary.js";
import { HourlyWeather } from "./components/HourlyWeather.js";
import { MonthlyKmWidget } from "./components/MonthlyKmWidget.js";
import { NextGoalWidget } from "./components/NextGoalWidget.js";
import { getCurrentWeekSessions, getWeekVolume, getWorkouts } from "../../data/workoutStore.js";
import { buildWeekInsight } from "../../utils/weekInsight.js";
import { buildMonthlyKmStats } from "../../utils/monthlyKm.js";
import { getHourlyWeatherState } from "./homeWeatherStore.js";
import { getGymDayForDate } from "../Plan/gymTimelineBridge.js";
import { formatISODate } from "../../utils/date.js";
import { getState } from "../../core/state.js";

export function Home(){

    const week = getCurrentWeekSessions();
    const { completed, goal } = getWeekVolume();

    const workoutCount = week.filter(
        session => session.status === "completed" && session.type !== "recovery" && session.type !== "free"
    ).length;

    // Para que "Esta semana" nunca describa un día distinto de "hoy"
    // cuando hoy no hay running -- ver corrección de coherencia en
    // weekInsight.js. Misma fuente que MasterCard.js y Plan, no una
    // comprobación nueva.
    const todayGymMatch = getGymDayForDate(formatISODate(new Date()));

    const insight = buildWeekInsight(week, { completed, goal, todayGymMatch });

    // Solo entrenos reales (getWorkouts(), nunca sesiones planificadas) --
    // ver buildMonthlyKmStats() para qué se degrada cuando falta historial.
    const monthlyKm = buildMonthlyKmStats(getWorkouts());

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

                ${NextGoalWidget()}

                <section class="monthly-km-card">

                    ${MonthlyKmWidget(monthlyKm, getState().selectedMonthKey)}

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
