import "./Hero.css";

import { themeManager } from "../../theme/themeManager.js";
import { getHeroData, getCompletedHeroData } from "../../data/heroData.js";
import { WORKOUT_TYPES } from "../../data/workoutTypes.js";
import { getTodaySession, getWorkouts } from "../../data/workoutStore.js";
import { formatCurrentDate, formatISODate } from "../../utils/date.js";
import { formatKm } from "../../utils/format.js";
import { buildRestDayHero, mostRecentWorkout, daysBetween, LAST_WORKOUT_STALE_DAYS } from "../../utils/restDayHero.js";
import { HERO_IMAGES } from "../../assets/hero";
import { getGymDayForDate } from "../../pages/Plan/gymTimelineBridge.js";

// "HOY: <TIPO>" (rediseño de Inicio, 2026-09-25) -- mismo label ya
// definido en WORKOUT_TYPES (una sola fuente para el nombre de cada
// tipo, el mismo que usa Plan), sin paréntesis y en mayúsculas ("Rodaje
// (Z2)" -> "RODAJE Z2"). RECUPERA es la excepción: WORKOUT_TYPES.recovery.label
// es "Recuperación" (sustantivo, para el resto de la app), pero aquí se
// pide el verbo en imperativo, igual que ya usaba heroData.recovery
// ("Hoy" / "recupera").
function todayTypeLabel(type) {

    if (type === "recovery") return "RECUPERA";

    const label = WORKOUT_TYPES[type]?.label ?? "";
    return label.replace(/[()]/g, "").toUpperCase();

}

function relativeDayLabel(days) {

    if (days === 0) return "hoy";
    if (days === 1) return "ayer";

    return `hace ${days} días`;

}

// Línea secundaria "Último entreno · 4,3 km ayer" (rediseño 2026-09-25) --
// se muestra SIEMPRE que haya un entreno real reciente (mismo umbral
// LAST_WORKOUT_STALE_DAYS que ya usaba restDayHero.js), haya o no sesión
// de plan hoy. Antes esta información solo aparecía cuando NO había plan
// (como titular entero, una de las variantes al azar de
// buildRestDayHero()); ahora pasa a ser info secundaria fija, aparte del
// titular de arriba. null sin ningún entreno real reciente -- nunca un
// hueco vacío ni una fecha inventada.
function lastWorkoutCaption(workouts) {

    const last = mostRecentWorkout(workouts);
    if (!last) return null;

    const days = daysBetween(last.date, formatISODate(new Date()));
    if (days < 0 || days > LAST_WORKOUT_STALE_DAYS) return null;

    return last.distanceKm
        ? `Último entreno · ${formatKm(last.distanceKm)} km ${relativeDayLabel(days)}`
        : `Último entreno · ${relativeDayLabel(days)}`;

}

export function Hero() {

    const theme = themeManager.getTheme();

    const todaySession = getTodaySession();

    // Sin running planificado hoy, se comprueba si hoy toca gimnasio
    // (mismo mecanismo que ya usa Plan, ver gymTimelineBridge.js) antes de
    // caer al mensaje de día libre -- si no, el Hero podía decir "hoy no
    // tienes ningún entrenamiento planificado" con una rutina de gimnasio
    // programada de verdad ese mismo día.
    const gymMatch = !todaySession ? getGymDayForDate(formatISODate(new Date())) : null;

    const workout = WORKOUT_TYPES[todaySession?.type]
        ?? (gymMatch ? WORKOUT_TYPES.strength : WORKOUT_TYPES.generic);

    const workouts = getWorkouts();

    // Titular (rediseño 2026-09-25): con sesión de plan real hoy (running
    // o gimnasio) sin terminar, "HOY: <TIPO>" -- literal, ya no la frase
    // poética de heroData[type].title de antes (p. ej. "Construye base"
    // para Z2) -- esas dos palabras por tipo se quedan sin usar aquí,
    // pero coachTitle/coachMessages[0] de heroData SÍ se siguen
    // reutilizando tal cual como frase contextual corta debajo (una
    // sola, no las dos que llevaba antes -- titular más informativo,
    // frase de debajo más breve). Completada hoy, o sin ningún plan
    // activo (ni running ni gimnasio programado), el comportamiento NO
    // cambia: getCompletedHeroData()/buildRestDayHero() exactamente como
    // antes -- buildRestDayHero() sigue pudiendo elegir "Último entreno"
    // como una de sus variantes al azar (pedido explícito: "si no hay
    // plan activo, usa ÚLTIMO ENTRENO como hasta ahora").
    let hero;

    if (todaySession) {

        hero = todaySession.status === "completed"
            ? getCompletedHeroData()
            : (() => {
                const data = getHeroData(todaySession.type);
                return { ...data, title: ["HOY:", todayTypeLabel(todaySession.type)], coachMessages: data.coachMessages.slice(0, 1) };
            })();

    } else if (gymMatch) {

        hero = gymMatch.finishedSession
            ? getCompletedHeroData()
            : (() => {
                const data = getHeroData("strength");
                return { ...data, title: ["HOY:", "FUERZA"], coachMessages: data.coachMessages.slice(0, 1) };
            })();

    } else {

        hero = buildRestDayHero(workouts);

    }

    const lastWorkout = lastWorkoutCaption(workouts);

    return `

<section class="hero">

    <img
        class="hero-image"
        src="${HERO_IMAGES[theme.hero]}"
        alt="Corredor sólido"
    >

    <div class="hero-overlay-top"></div>

<div class="hero-overlay-focus"></div>

<div class="hero-glow"></div>
<div class="hero-bottom-fade"></div>
    <div class="hero-content">

        <header class="hero-header">

            <div class="hero-header-left">

                <span class="hero-greeting">
                    ${theme.greeting}
                </span>

                <span class="hero-date">
                    ${formatCurrentDate()}
                </span>

            </div>

        </header>

        <div class="hero-divider"></div>

        <h1 class="hero-title">

            ${hero.title[0]}

            <span>
                ${hero.title[1]}
            </span>

        </h1>

        <div class="hero-divider hero-divider-small"></div>

        <div class="hero-coach">

            <div class="hero-coach-icon">

                <i data-lucide="${workout.icon}"></i>

            </div>

            <div class="hero-coach-content">

                <span class="hero-coach-title">
                    ${hero.coachTitle}
                </span>

                ${hero.coachMessages
                    .map(message => `<p>${message}</p>`)
                    .join("")}

                ${lastWorkout ? `<p class="hero-last-workout">${lastWorkout}</p>` : ""}

            </div>

        </div>

    </div>

</section>

`;

}
