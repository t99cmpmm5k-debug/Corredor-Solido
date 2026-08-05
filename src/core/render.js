import { createIcons, icons } from "lucide";
import { getState } from "./state";
import { initPlanEvents } from "../pages/Plan/initPlanEvents";
import { initBottomNavigationEvents } from "../components/Navigation/BottomNavigation.js";
import { initSessionCardOutline } from "../components/MasterCard/sessionCardOutline.js";
import { initPlanConnector } from "../pages/Plan/components/PlanConnector.js";

export function render() {

    const app = document.querySelector("#app");

    const state = getState();

    if (!app || !state.currentPage) return;

    app.innerHTML = state.currentPage();

    createIcons({ icons });

    initPlanEvents();

    initBottomNavigationEvents();

    initSessionCardOutline();

    initPlanConnector();

}