import "./MasterCard.css";

import { SessionCard } from "./components/SessionCard.js";
import { GymTodayCard } from "./components/GymTodayCard.js";
import { getTodaySession } from "../../data/workoutStore.js";
import { getState } from "../../core/state.js";
import { getGymDayForDate } from "../../pages/Plan/gymTimelineBridge.js";
import { formatISODate } from "../../utils/date.js";
import { PLAN_NEAR_COMPLETE_THRESHOLD_PERCENT } from "../../utils/runnerStatus.js";
import { getCurrentWeatherState } from "../../pages/Home/currentWeatherStore.js";
import { weatherIconName } from "../../services/hourlyForecast.js";

// Día sin running planificado (Capa 3, punto 3 del documento de mejoras) --
// antes era un hueco sin contexto ("No hay ninguna sesión planificada para
// hoy."). `planCompliance` es el mismo cálculo YA EXISTENTE de "Cumplimiento
// del plan" (utils/planCompliance.js, ver Home.js) -- nunca se calcula nada
// nuevo aquí, solo se reutiliza.
//
// Sin plan importado esta semana (hasPlan:false, ningún running planificado
// en absoluto) no hay ningún número real que dar -- mensaje neutro, igual
// que antes. Con plan, se usan sessionsCompleted/sessionsPlanned reales
// (nunca inventados) y, si además la semana está cerca de completarse
// (mismo umbral que la frase-resumen de "Estado del corredor",
// PLAN_NEAR_COMPLETE_THRESHOLD_PERCENT), se añade un refuerzo -- nunca al
// revés (no se refuerza si está lejos de completarse).
function buildEmptySessionMessage(planCompliance) {

    if (!planCompliance?.hasPlan) return "Sin sesión planificada para hoy.";

    const { sessionsCompleted, sessionsPlanned, kmPercent } = planCompliance;

    let message = `Día de recuperación. Llevas ${sessionsCompleted}/${sessionsPlanned} sesiones completadas esta semana.`;

    if (kmPercent != null && kmPercent >= PLAN_NEAR_COMPLETE_THRESHOLD_PERCENT) {
        message += " Hoy no necesitas sumar más carga.";
    }

    return message;

}

function EmptySessionCard(planCompliance) {

    return `

        <section class="session-card session-card--empty">

            <p>${buildEmptySessionMessage(planCompliance)}</p>

        </section>

    `;

}

// Tiempo EN VIVO por geolocalización real del dispositivo (Fase 1 de 3,
// ver currentWeatherStore.js/services/currentWeather.js) -- distinto del
// widget "Hoy" más abajo en Inicio (HourlyWeather.js), que usa la
// ubicación del entreno más reciente, no el GPS real de ahora mismo.
// Oculto entero mientras no haya un dato real que mostrar (permiso
// denegado, sin geolocalización, sin red, todavía cargando) -- nunca un
// valor fabricado ni un placeholder que ocupe espacio de más.
function LiveWeatherBadge() {

    const { status, temp, icon } = getCurrentWeatherState();
    if (status !== "ready" || temp == null) return "";

    return `

        <div class="master-card-weather">

            <iconify-icon icon="${weatherIconName(icon)}"></iconify-icon>

            <span>${temp}°</span>

        </div>

    `;

}

// Corrección 2026-08-26 (coherencia Plan↔Home): "running siempre manda"
// (decisión del 25 ago) se descarta -- si Plan tiene programados running
// Y gimnasio el mismo día, Inicio debe reflejar los dos, no solo uno
// como si el otro no existiera. Las dos tarjetas se apilan (reutilizando
// tal cual el formato ya construido de cada una, sin diseño híbrido
// nuevo) en vez de fusionarse en una sola.
export function MasterCard(planCompliance = null){

    // homeSelectedWorkout (propio de Inicio, ver core/state.js) en vez de
    // planStore.getSelectedWorkout()/state.selectedWorkout: ese es el
    // estado de Plan, y compartirlo aquí causaba que tocar un día
    // cualquiera en Plan se colara en Inicio como si fuera "la sesión de
    // hoy" (bug real, corregido 2026-08-26). Tampoco se usa
    // planStore.getSelectedWorkout() directamente aunque estuviera bien
    // aislado: ese getter auto-inicializa la selección a sessions[0] si no
    // hay sesión hoy, y aquí eso mostraría el lunes como si fuera "hoy" en
    // un día de descanso real. Solo se sustituye getTodaySession() cuando
    // el usuario ha elegido otro día de verdad en Inicio (botón "Cambiar").
    const runningSession = getState().homeSelectedWorkout ?? getTodaySession();

    // La fecha que de verdad se está mirando -- la del día elegido a mano
    // (si lo hay) o hoy. El gimnasio se comprueba para ESA fecha, no
    // siempre "hoy a secas", para que "Cambiar" siga siendo coherente con
    // Plan también al previsualizar otro día con running planificado.
    const effectiveDate = runningSession?.date ?? formatISODate(new Date());
    const gymMatch = getGymDayForDate(effectiveDate);

    const cards = [];
    if (runningSession) cards.push(SessionCard(runningSession));
    if (gymMatch) cards.push(GymTodayCard(gymMatch));

    if (cards.length === 0) {
        return `<section class="master-card">${EmptySessionCard(planCompliance)}${LiveWeatherBadge()}</section>`;
    }

    return `<section class="master-card">${cards.join("")}${LiveWeatherBadge()}</section>`;

}