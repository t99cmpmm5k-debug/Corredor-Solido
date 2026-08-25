import "./Hero.css";

import { themeManager } from "../../theme/themeManager.js";
import { getHeroData, getCompletedHeroData } from "../../data/heroData.js";
import { WORKOUT_TYPES } from "../../data/workoutTypes.js";
import { getTodaySession, getWorkouts } from "../../data/workoutStore.js";
import { formatCurrentDate, formatISODate } from "../../utils/date.js";
import { buildRestDayHero } from "../../utils/restDayHero.js";
import { HERO_IMAGES } from "../../assets/hero";
import { getGymDayForDate } from "../../pages/Plan/gymTimelineBridge.js";

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

    // Sin sesión planificada hoy NI gimnasio programado, el Hero no usa el
    // genérico fijo "A entrenar / hoy toca" — en su lugar, una frase
    // calculada a partir de los entrenos reales (ver restDayHero.js), o el
    // mensaje neutro si no hay datos suficientes para decir algo veraz.
    // "completed" (running vía status ya resuelto, gimnasio vía
    // finishedSession) siempre usa el mismo mensaje de "ya lo hiciste" en
    // vez de seguir invitando a entrenar algo que ya está hecho.
    const hero = todaySession
        ? (todaySession.status === "completed" ? getCompletedHeroData() : getHeroData(todaySession.type))
        : gymMatch
            ? (gymMatch.finishedSession ? getCompletedHeroData() : getHeroData("strength"))
            : buildRestDayHero(getWorkouts());

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

            </div>

        </div>

    </div>

</section>

`;

}