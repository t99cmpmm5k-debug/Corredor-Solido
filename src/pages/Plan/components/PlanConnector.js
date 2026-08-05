import "./PlanConnector.css";

// Puro conector visual entre el timeline (dentro de PlanHeader, que
// tiene overflow:hidden — nada puede asomar desde ahí) y PlanWorkoutCard,
// su hermano posterior en Plan.js. Sale del nodo seleccionado, que
// cambia de columna según el día — por eso initPlanConnector() mide su
// posición real en vez de repetir el cálculo de paddings del timeline
// (los 7 nodos se reparten con flex:1, su centro no cae en fracciones
// simples de i/(n-1)).
export function PlanConnector() {

    return `

        <div class="plan-connector">

            <div class="plan-connector-line"></div>

            <div class="plan-connector-arrow"></div>

        </div>

    `;

}

let observer = null;

export function initPlanConnector() {

    if (observer) {
        observer.disconnect();
        observer = null;
    }

    const connector = document.querySelector(".plan-connector");
    const line = connector?.querySelector(".plan-connector-line");
    const arrow = connector?.querySelector(".plan-connector-arrow");
    const timeline = document.querySelector(".plan-timeline");

    if (!connector || !line || !arrow || !timeline) return;

    function reposition() {

        const selectedDay = document.querySelector(".timeline-day.is-selected");
        const selectedIcon = selectedDay?.querySelector(".workout-icon");
        const stem = selectedDay?.querySelector(".day-stem");

        if (!selectedIcon || !stem) return;

        const iconRect = selectedIcon.getBoundingClientRect();
        const connectorRect = connector.getBoundingClientRect();

        const centerX = iconRect.left + iconRect.width / 2 - connectorRect.left;

        line.style.left = `${centerX}px`;
        arrow.style.left = `${centerX}px`;

        // El color sale del propio tallo del día seleccionado (--stem-color
        // en TimelineDay.css) — una sola fuente de verdad, sin mapa de
        // colores duplicado aquí.
        const stemColor = getComputedStyle(stem).getPropertyValue("--stem-color");

        if (stemColor) connector.style.setProperty("--connector-color", stemColor);

    }

    reposition();

    observer = new ResizeObserver(reposition);

    observer.observe(timeline);

}
