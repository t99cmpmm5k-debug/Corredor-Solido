import "./Home.css";

import { Hero } from "../../components/Hero/Hero.js";
import { BottomNavigation } from "../../components/Navigation/BottomNavigation.js";
import { MasterCard } from "../../components/MasterCard/MasterCard.js";
import { WeekSummary } from "../../components/WeekSummary/WeekSummary.js";
import { HourlyWeather } from "./components/HourlyWeather.js";
import { MonthlyKmWidget } from "./components/MonthlyKmWidget.js";
import { NextGoalWidget } from "./components/NextGoalWidget.js";
import { PlanComplianceWidget } from "./components/PlanComplianceWidget.js";
import { RunnerStatusWidget } from "./components/RunnerStatusWidget.js";
import { getCurrentWeekSessions, getWeekVolume, getWorkouts, getUpcomingPlannedRaces } from "../../data/workoutStore.js";
import { buildWeekInsight } from "../../utils/weekInsight.js";
import { buildMonthlyKmStats } from "../../utils/monthlyKm.js";
import { buildPlanCompliance } from "../../utils/planCompliance.js";
import { buildRunnerStatusIndicators, buildRunnerStatusSummary } from "../../utils/runnerStatus.js";
import { buildAcwrInsight, buildRunningLoadEntries } from "../../utils/acwr.js";
import { buildZ2Evolution } from "../Running/runningEvolution.js";
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
    const workouts = getWorkouts();
    const monthlyKm = buildMonthlyKmStats(workouts);

    // "Cumplimiento del plan" (Capa 2) -- planificado vs. realizado de
    // running para la semana real actual (`week`, nunca la semana que se
    // esté navegando en Plan). Solo running: ver buildPlanCompliance().
    const planCompliance = buildPlanCompliance(week, workouts);
    const planComplianceHtml = PlanComplianceWidget(planCompliance);

    // "Estado del corredor" (Capa 2) -- 4 indicadores compactos, cada uno
    // leyendo un cálculo YA EXISTENTE en otra pantalla (nunca uno nuevo,
    // ver buildRunnerStatusIndicators()): la misma carga ACWR y evolución
    // Z2 que ya muestra Running (mismos workouts), el mismo % de
    // cumplimiento semanal de arriba, y la misma carrera/prioridad que ya
    // usa NextGoalWidget.
    const runnerStatusInputs = {
        acwrInsight: buildAcwrInsight(buildRunningLoadEntries(workouts)),
        z2Evolution: buildZ2Evolution(workouts),
        planCompliance,
        upcomingRaces: getUpcomingPlannedRaces()
    };
    const runnerStatusIndicators = buildRunnerStatusIndicators(runnerStatusInputs);

    // Frase-resumen (Capa 3) -- misma entrada que los indicadores de
    // arriba, una sola interpretación priorizada (carrera inminente >
    // carga alta > semana completada > Z2 de fondo), ver
    // buildRunnerStatusSummary() para el porqué del orden.
    const runnerStatusSummary = buildRunnerStatusSummary(runnerStatusInputs);
    const runnerStatusHtml = RunnerStatusWidget(runnerStatusIndicators, runnerStatusSummary);

    // El pronóstico se pide una sola vez desde main.js (boot) y se cachea
    // en homeWeatherStore -- Home() solo lee el estado ya resuelto, nunca
    // dispara la petición él mismo. Con status distinto de "ready" (sin
    // ubicación, API caída, todavía cargando) HourlyWeather() devuelve ""
    // y la sección desaparece sin dejar hueco ni dato inventado.
    const weather = getHourlyWeatherState();

    const weekSummaryHtml = `

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

    `;

    // "Próximas carreras" (NextGoalWidget) devuelve "" sin ninguna carrera
    // próxima real -- en ese caso Esta semana vuelve a ocupar el ancho
    // completo en vez de dejar una columna vacía a su lado (ver
    // .home-two-col en Home.css).
    const nextGoalHtml = NextGoalWidget();

    return `

        <main class="home">

            <section class="hero-layout">

                ${Hero()}

                ${MasterCard()}

                ${nextGoalHtml ? `

                    <div class="home-two-col">

                        ${weekSummaryHtml}

                        ${nextGoalHtml}

                    </div>

                ` : weekSummaryHtml}

                ${planComplianceHtml ? `

                    <section class="plan-compliance-card">

                        ${planComplianceHtml}

                    </section>

                ` : ""}

                ${runnerStatusHtml ? `

                    <section class="runner-status-card">

                        ${runnerStatusHtml}

                    </section>

                ` : ""}

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
