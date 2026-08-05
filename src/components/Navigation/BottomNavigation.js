import "./BottomNavigation.css";

import { navigate } from "../../core/router.js";
import { getState } from "../../core/state.js";

import { Home } from "../../pages/Home/Home.js";
import { Plan } from "../../pages/Plan/Plan.js";
import { Running } from "../../pages/Running/Running.js";

const PAGES = { home: Home, plan: Plan, running: Running };

export function BottomNavigation() {

    const { currentPage } = getState();

    return `

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

            <button class="nav-item">

                <iconify-icon icon="solar:dumbbell-large-bold-duotone"></iconify-icon>

                <small>Gimnasio</small>

            </button>

            <button class="nav-item">

                <iconify-icon icon="solar:user-rounded-bold-duotone"></iconify-icon>

                <small>Perfil</small>

            </button>

        </nav>

    `;

}

export function initBottomNavigationEvents() {

    document.querySelectorAll(".nav-item[data-page]").forEach(button => {

        button.addEventListener("click", () => {

            navigate(PAGES[button.dataset.page]);

        });

    });

}