import "./NextGoalWidget.css";

import { getUpcomingPlannedRaces } from "../../../data/workoutStore.js";
import { parseISODate, formatISODate } from "../../../utils/date.js";

// Días reales hasta la carrera (diff de fecha, nunca estimado) --
// referenceDate solo se pasa distinto de new Date() en tests.
function daysUntil(dateISO, referenceDate) {

    const target = parseISODate(dateISO);
    const today = parseISODate(formatISODate(referenceDate));

    return Math.round((target - today) / 86400000);

}

function daysLabel(days) {

    if (days <= 0) return "Hoy";
    if (days === 1) return "Mañana";

    return `${days} días`;

}

// "Próximo objetivo" (fase 3, rediseño de Inicio v2): la próxima carrera
// REAL marcada en Carreras (getUpcomingPlannedRaces(), ya ordenada por
// fecha) -- sin inventar un tiempo objetivo, ese campo no existe hoy en
// ningún sitio del esquema de carreras (ver plan). Si no hay ninguna
// carrera próxima, el widget no pinta nada (ni siquiera un contenedor
// vacío) en vez de mostrar un hueco sin sentido.
export function NextGoalWidget(referenceDate = new Date()) {

    const race = getUpcomingPlannedRaces()[0];

    if (!race) return "";

    return `

        <section class="next-goal-widget">

            <span class="next-goal-label">PRÓXIMO OBJETIVO</span>

            <div class="next-goal-line">

                <span class="next-goal-name">${race.name || "Carrera"}</span>

                <span class="next-goal-days">${daysLabel(daysUntil(race.date, referenceDate))}</span>

            </div>

        </section>

    `;

}
