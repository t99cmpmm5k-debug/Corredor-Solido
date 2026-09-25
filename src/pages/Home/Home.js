import "./Home.css";

import { Hero } from "../../components/Hero/Hero.js";
import { BottomNavigation } from "../../components/Navigation/BottomNavigation.js";
import { MasterCard } from "../../components/MasterCard/MasterCard.js";
import { WeekSummary } from "../../components/WeekSummary/WeekSummary.js";
import { HourlyWeather } from "./components/HourlyWeather.js";
import { MonthlyKmWidget } from "./components/MonthlyKmWidget.js";
import { NextGoalWidget } from "./components/NextGoalWidget.js";
import { RunnerStatusWidget } from "./components/RunnerStatusWidget.js";
import { getCurrentWeekSessions, getWorkouts, getUpcomingPlannedRaces, getTodaySession } from "../../data/workoutStore.js";
import { buildWeekInsight } from "../../utils/weekInsight.js";
import { buildMonthlyKmStats } from "../../utils/monthlyKm.js";
import { buildPlanCompliance } from "../../utils/planCompliance.js";
import { buildRunnerStatusIndicators, buildRunnerStatusSummary } from "../../utils/runnerStatus.js";
import { buildAcwrInsight, buildRunningLoadEntries } from "../../utils/acwr.js";
import { buildZ2Evolution } from "../Running/runningEvolution.js";
import { getHourlyWeatherState } from "./homeWeatherStore.js";
import { getGymDayForDate } from "../Plan/gymTimelineBridge.js";
import { WORKOUT_TYPES } from "../../data/workoutTypes.js";
import { formatWeekday, formatISODate } from "../../utils/date.js";
import { getState } from "../../core/state.js";

function capitalize(text) {
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

// Mismo mapeo type -> etiqueta que usa Hero.js ("HOY: RODAJE Z2") --
// duplicado a propósito, no compartido entre páginas/bloques (ver
// CLAUDE.md "known duplication"), es una transformación trivial de una
// sola línea sobre un dato que ya existe en WORKOUT_TYPES.
function typeLabel(type) {

    if (type === "recovery") return "RECUPERA";

    const label = WORKOUT_TYPES[type]?.label ?? "";
    return label.replace(/[()]/g, "").toUpperCase();

}

// "Próximo: RODAJE Z2 · 8 km · Miércoles" (WeekSummary.js, rediseño de
// Inicio 2026-09-25) -- la sesión de plan sin completar más próxima
// dentro de la semana real actual (`week`, ya ordenada por fecha/slot,
// ver getWeekSessions() en workoutStore.js). HOY MISMO se excluye a
// propósito (s.date > todayIso, no >=): la sesión de hoy ya la cuenta el
// Hero ("HOY: RODAJE Z2") y, muchas veces, también la frase-insight de
// esta misma tarjeta -- repetirla aquí una tercera vez no aporta nada
// nuevo (verificado en pantalla: "Hoy: Z2 · 10 km." seguido de "Próximo:
// RODAJE Z2 · 10 km · Viernes" decía lo mismo dos veces). "Próximo" solo
// tiene sentido para lo que viene DESPUÉS de hoy. null sin ninguna sesión
// futura sin completar (semana ya completada del todo, o sin plan
// importado) -- WeekSummary.js omite la línea entera en ese caso.
//
// Comparación por STRING ISO (todayIso), no por Date -- bug real
// encontrado al verificar: `new Date()` lleva la hora actual (p. ej.
// 18:53), así que comparar contra la medianoche de hoy (parseISODate)
// hacía que ninguna sesión de HOY calificara nunca como "próxima"
// (medianoche siempre es "antes" que cualquier hora del mismo día) --
// con la comparación de fechas AAAA-MM-DD como texto no hay ninguna hora
// de por medio.
function buildNextUp(week, todayIso) {

    const next = (week ?? []).find(s => s.status !== "completed" && s.date > todayIso);
    if (!next) return null;

    return {
        typeLabel: typeLabel(next.type),
        distanceKm: next.volume > 0 ? next.volume : null,
        dayLabel: capitalize(formatWeekday(next.date))
    };

}

export function Home(){

    const today = new Date();
    const todayIso = formatISODate(today);

    const week = getCurrentWeekSessions();

    // FUENTE ÚNICA para el progreso semanal (corregido en el rediseño de
    // Inicio, 2026-09-25 -- ver el comentario de buildPlanCompliance() en
    // utils/planCompliance.js para la causa real del bug). Antes Home.js
    // llamaba a getWeekVolume() (workoutStore.js) para el anillo/km de
    // "Esta semana" Y por separado a buildPlanCompliance() para
    // "Cumplimiento del plan" -- dos definiciones distintas de "km
    // realizado" (una solo sesiones enlazadas, la otra TODOS los workouts
    // de la semana por rango de fechas) que podían mostrar números
    // distintos para la MISMA semana en dos sitios de la misma pantalla
    // (bug real visto en pantalla: 8 km en un sitio, 12,3 km en otro).
    // Ahora "Esta semana" y el % de cumplimiento leen del mismo objeto --
    // ya no existe la card independiente "Cumplimiento del plan", queda
    // fusionada aquí (ver WeekSummary() más abajo).
    const planCompliance = buildPlanCompliance(week);

    const workoutCount = week.filter(
        session => session.status === "completed" && session.type !== "recovery" && session.type !== "free"
    ).length;

    // Para que "Esta semana" nunca describa un día distinto de "hoy"
    // cuando hoy no hay running -- ver corrección de coherencia en
    // weekInsight.js. Misma fuente que MasterCard.js y Plan, no una
    // comprobación nueva.
    const todayGymMatch = getGymDayForDate(todayIso);

    const insight = buildWeekInsight(week, { goal: planCompliance.plannedKm, todayGymMatch });

    // Solo entrenos reales (getWorkouts(), nunca sesiones planificadas) --
    // ver buildMonthlyKmStats() para qué se degrada cuando falta historial.
    const workouts = getWorkouts();
    const monthlyKm = buildMonthlyKmStats(workouts);

    // "Estado del corredor" -- 3 indicadores compactos (Carga/Z2/Semana,
    // "Próx. carrera" se quitó de aquí en este rediseño: ya la cubre "Tu
    // próximo objetivo" si hay una carrera Inscrita/Objetivo real), cada
    // uno leyendo un cálculo YA EXISTENTE en otra pantalla (nunca uno
    // nuevo, ver buildRunnerStatusIndicators()): la misma carga ACWR y
    // evolución Z2 que ya muestra Running (mismos workouts), y el mismo %
    // de cumplimiento semanal de arriba (misma fuente única que ya usa
    // "Esta semana").
    const runnerStatusInputs = {
        acwrInsight: buildAcwrInsight(buildRunningLoadEntries(workouts)),
        z2Evolution: buildZ2Evolution(workouts),
        planCompliance,
        upcomingRaces: getUpcomingPlannedRaces()
    };
    const runnerStatusIndicators = buildRunnerStatusIndicators(runnerStatusInputs);

    // Frase-resumen -- misma entrada que los indicadores de arriba, una
    // sola interpretación priorizada (carrera Inscrita/Objetivo inminente
    // > carga alta > semana completada > Z2 de fondo), ver
    // buildRunnerStatusSummary() para el porqué del orden.
    const runnerStatusSummary = buildRunnerStatusSummary(runnerStatusInputs);
    const runnerStatusHtml = RunnerStatusWidget(runnerStatusIndicators, runnerStatusSummary);

    // El pronóstico se pide una sola vez desde main.js (boot) y se cachea
    // en homeWeatherStore -- Home() solo lee el estado ya resuelto, nunca
    // dispara la petición él mismo. Con status distinto de "ready" (sin
    // ubicación, API caída, todavía cargando) HourlyWeather() devuelve ""
    // y la sección desaparece sin dejar hueco ni dato inventado.
    const weather = getHourlyWeatherState();

    // "Clima para correr", no "app meteorológica" (rediseño de Inicio,
    // punto 8) -- solo busca la mejor franja si hoy hay una sesión de
    // RUNNING real programada (ni gimnasio ni descanso) -- mismo dato que
    // ya decide el titular del Hero (getTodaySession(), workoutStore.js),
    // ninguna comprobación nueva.
    const todaySession = getTodaySession();
    const hasRunningSessionToday = !!todaySession && todaySession.type !== "recovery";

    const weekSummaryHtml = `

        <section class="week-chart-card">

            ${WeekSummary({
                title:"ESTA SEMANA",
                kmDone: planCompliance.actualKm,
                kmTarget: planCompliance.plannedKm,
                workoutCount,
                insight,
                nextUp: buildNextUp(week, todayIso),
                variant:"card"
            })}

        </section>

    `;

    // "Tu próximo objetivo" (NextGoalWidget) devuelve "" sin ninguna
    // carrera Inscrita/Objetivo real -- en ese caso Esta semana vuelve a
    // ocupar el ancho completo en vez de dejar una columna vacía a su
    // lado (ver .home-two-col en Home.css).
    const nextGoalHtml = NextGoalWidget();

    return `

        <main class="home">

            <section class="hero-layout">

                ${Hero()}

                ${MasterCard(planCompliance)}

                ${nextGoalHtml ? `

                    <div class="home-two-col">

                        ${weekSummaryHtml}

                        ${nextGoalHtml}

                    </div>

                ` : weekSummaryHtml}

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

                        ${HourlyWeather({ ...weather, hasSessionToday: hasRunningSessionToday })}

                    </section>

                ` : ""}

            </section>

            ${BottomNavigation()}

        </main>

    `;

}
