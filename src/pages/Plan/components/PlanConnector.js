import "./PlanConnector.css";

// Puro conector visual entre el timeline (dentro de PlanHeader, que
// tiene overflow:hidden — nada puede asomar desde ahí) y PlanWorkoutCard,
// su hermano posterior en Plan.js. Sale del nodo seleccionado, que
// cambia de columna según el día — por eso initPlanConnector() mide su
// posición real en vez de repetir el cálculo de paddings del timeline
// (los 7 nodos se reparten con flex:1, su centro no cae en fracciones
// simples de i/(n-1)).
//
// Sin flecha (fase 3 del pulido de Plan): ya se entiende que la tarjeta
// de abajo pertenece al día seleccionado sin necesidad de un puntero
// explícito -- la línea sola basta de puente visual.
export function PlanConnector() {

    return `

        <div class="plan-connector">

            <div class="plan-connector-line"></div>

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
    const timeline = document.querySelector(".plan-timeline");

    if (!connector || !line || !timeline) return;

    function reposition() {

        const selectedDay = document.querySelector(".timeline-day.is-selected");
        const selectedIcon = selectedDay?.querySelector(".workout-icon");

        // Con la línea temporal mostrando siempre 7 días (ver
        // fillWeekDays() en PlanTimeline.js), una semana sin ninguna
        // sesión real puede llegar aquí sin ningún día seleccionado
        // (selectedWorkout a null) -- sin esto, la línea/flecha se
        // quedarían clavadas en su posición por defecto (left:0) en vez
        // de no señalar a nada.
        if (!selectedIcon) {
            connector.style.display = "none";
            return;
        }

        connector.style.display = "";

        const iconRect = selectedIcon.getBoundingClientRect();
        const connectorRect = connector.getBoundingClientRect();

        const centerX = iconRect.left + iconRect.width / 2 - connectorRect.left;

        line.style.left = `${centerX}px`;

        // El color sale del propio icono ya resuelto del día seleccionado
        // (ver planDayColor.js/TimelineDay.css para quién decide ese
        // color) — una sola fuente de verdad, sin mapa de colores
        // duplicado aquí. Antes leía --stem-color del "tallo" bajo el
        // nodo (.day-stem); el color final ya resuelto del propio icono
        // es la misma fuente real, sin depender de un elemento aparte que
        // solo existía para esto.
        const iconColor = getComputedStyle(selectedIcon).color;

        if (iconColor) connector.style.setProperty("--connector-color", iconColor);

    }

    reposition();

    observer = new ResizeObserver(reposition);

    observer.observe(timeline);

}
