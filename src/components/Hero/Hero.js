import "./Hero.css";

import { themeManager } from "../../theme/themeManager.js";
import { getHeroData } from "../../data/heroData.js";
import { WORKOUT_TYPES } from "../../data/workoutTypes.js";
import { getTodaySession, getWorkouts } from "../../data/workoutStore.js";
import { formatCurrentDate } from "../../utils/date.js";
import { buildRestDayHero } from "../../utils/restDayHero.js";
import { HERO_IMAGES } from "../../assets/hero";

export function Hero() {

    const theme = themeManager.getTheme();

    const todaySession = getTodaySession();

    const workout = WORKOUT_TYPES[todaySession?.type] ?? WORKOUT_TYPES.generic;

    // Sin sesión planificada hoy, el Hero no usa el genérico fijo "A
    // entrenar / hoy toca" — en su lugar, una frase calculada a partir de
    // los entrenos reales (ver restDayHero.js), o el mensaje neutro si no
    // hay datos suficientes para decir algo veraz.
    const hero = todaySession
        ? getHeroData(todaySession.type)
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