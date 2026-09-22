import "./BottomNavigation.css";

import { navigate } from "../../core/router.js";
import { getState } from "../../core/state.js";

import { Home } from "../../pages/Home/Home.js";
import { Plan } from "../../pages/Plan/Plan.js";
import { Running } from "../../pages/Running/Running.js";
import { Carreras } from "../../pages/Carreras/Carreras.js";
import { Profile } from "../../pages/Profile/Profile.js";
import { Gym } from "../../pages/Gym/Gym.js";
import { Comunidad } from "../../pages/Comunidad/Comunidad.js";
import { resetPlanView } from "../../pages/Plan/planStore.js";
import { resetCarrerasView } from "../../pages/Carreras/carrerasStore.js";
import { resetComunidadView } from "../../pages/Comunidad/comunidadStore.js";

const PAGES = { home: Home, plan: Plan, running: Running, carreras: Carreras, gym: Gym, comunidad: Comunidad, profile: Profile };

export function BottomNavigation() {

    const { currentPage } = getState();

    return `

        <div class="bottom-nav-safe-area"></div>

        <nav class="bottom-nav">
<button class="nav-item ${currentPage === Home ? "active" : ""}" data-page="home">

                <iconify-icon icon="solar:home-2-bold-duotone"></iconify-icon>

                <small>Inicio</small>

            </button>

            <button class="nav-item ${currentPage === Plan ? "active" : ""}" data-page="plan">

                <iconify-icon icon="solar:calendar-bold-duotone"></iconify-icon>

                <small>Plan</small>

            </button>

            <button class="nav-item ${currentPage === Running ? "active" : ""}" data-page="running">

                <iconify-icon icon="solar:running-bold-duotone"></iconify-icon>

                <small>Running</small>

            </button>

            <button class="nav-item ${currentPage === Carreras ? "active" : ""}" data-page="carreras">

                <iconify-icon icon="solar:flag-2-bold-duotone"></iconify-icon>

                <small>Carreras</small>

            </button>

            <button class="nav-item ${currentPage === Gym ? "active" : ""}" data-page="gym">

                <iconify-icon icon="solar:dumbbell-large-bold-duotone"></iconify-icon>

                <small>Gym</small>

            </button>

            <button class="nav-item ${currentPage === Comunidad ? "active" : ""}" data-page="comunidad">

                <iconify-icon icon="solar:users-group-rounded-bold-duotone"></iconify-icon>

                <small>Comunidad</small>

            </button>

            <button class="nav-item ${currentPage === Profile ? "active" : ""}" data-page="profile">

                <iconify-icon icon="solar:user-rounded-bold-duotone"></iconify-icon>

                <small>Perfil</small>

            </button>

        </nav>

    `;

}

export function initBottomNavigationEvents() {

    document.querySelectorAll(".nav-item[data-page]").forEach(button => {

        button.addEventListener("click", () => {

            const page = PAGES[button.dataset.page];

            // Plan siempre arranca en la semana actual al entrar desde la
            // navegación — la semana que estuvieras viendo antes no
            // persiste, para que "Plan" sea siempre predecible ("qué toca
            // ahora"), no una vuelta a donde lo dejaste.
            if (page === Plan) resetPlanView();
            if (page === Carreras) resetCarrerasView();
            if (page === Comunidad) resetComunidadView();

            navigate(page);

        });

    });

}