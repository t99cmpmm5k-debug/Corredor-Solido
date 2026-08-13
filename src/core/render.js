import { createIcons, icons } from "lucide";
import { getState } from "./state";
import { initPlanEvents } from "../pages/Plan/initPlanEvents";
import { initBottomNavigationEvents } from "../components/Navigation/BottomNavigation.js";
import { initSessionCardOutline } from "../components/MasterCard/sessionCardOutline.js";
import { initSessionCardEvents } from "../components/MasterCard/initSessionCardEvents.js";
import { initPlanConnector } from "../pages/Plan/components/PlanConnector.js";
import { initRunningEvents } from "../pages/Running/initRunningEvents.js";
import { initProfileEvents } from "../pages/Profile/initProfileEvents.js";
import { initGymEvents } from "../pages/Gym/initGymEvents.js";

export function render() {

    const app = document.querySelector("#app");

    const state = getState();

    if (!app || !state.currentPage) return;

    app.innerHTML = state.currentPage();

    createIcons({ icons });

    initPlanEvents();

    initBottomNavigationEvents();

    initSessionCardOutline();

    initSessionCardEvents();

    initPlanConnector();

    initRunningEvents();

    initProfileEvents();

    initGymEvents();

}