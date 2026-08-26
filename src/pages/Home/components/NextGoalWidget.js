import "./NextGoalWidget.css";

import { getUpcomingPlannedRaces } from "../../../data/workoutStore.js";
import { parseISODate, formatISODate, formatWeekday, formatDayMonth } from "../../../utils/date.js";
import { formatDistance, formatDisciplineType } from "../../Carreras/raceFormat.js";

// Días reales hasta la carrera (diff de fecha, nunca estimado) --
// referenceDate solo se pasa distinto de new Date() en tests.
function daysUntil(dateISO, referenceDate) {

    const target = parseISODate(dateISO);
    const today = parseISODate(formatISODate(referenceDate));

    return Math.round((target - today) / 86400000);

}

function capitalize(text) {
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

// "Hoy"/"Mañana" igual que el resto de la app (ver weekInsight.js), o
// día de la semana + fecha real para cualquier carrera más lejana --
// nunca una hora de inicio, ese dato no existe hoy en el esquema de
// plannedRaces (solo registrationDeadline, que es la fecha límite de
// INSCRIPCIÓN, no la de salida -- no son lo mismo, mostrarlo aquí sería
// inventar una hora de carrera que no tenemos).
function dateLabel(dateISO, days) {

    if (days <= 0) return "Hoy";
    if (days === 1) return "Mañana";

    return `${capitalize(formatWeekday(dateISO))}, ${formatDayMonth(dateISO).toLowerCase()}`;

}

// Segunda línea del widget: tipo/distancia real (si el import la trae) ·
// ubicación real · fecha real -- cada pieza se omite si esa carrera en
// concreto no la tiene, en vez de fingirla (mismo criterio que
// RaceListCard.js). Nunca las 3 piezas fijas de un tirón: unas carreras
// solo tienen disciplina (RU/TRS) sin distancia en km, y no todas traen
// ubicación.
function buildSubtitle(race, days) {

    const parts = [];

    if (race.distanceKm != null) parts.push(formatDistance(race.distanceKm));
    else {
        // plannedRaces guarda la disciplina en "type" (RU/TRS), no
        // "disciplineType" -- ese renombrado solo existe en la forma
        // normalizada de raceEntries.js (usada por Carreras), esto lee
        // directamente de getUpcomingPlannedRaces() sin pasar por ahí.
        const disciplineLabel = formatDisciplineType(race.type);
        if (disciplineLabel) parts.push(disciplineLabel);
    }

    if (race.location) parts.push(race.location);

    parts.push(dateLabel(race.date, days));

    return parts.join(" · ");

}

// "Próximo objetivo" (fase 3, rediseño de Inicio v2): la próxima carrera
// REAL marcada en Carreras (getUpcomingPlannedRaces(), ya ordenada por
// fecha) -- sin inventar un tiempo objetivo, ese campo no existe hoy en
// ningún sitio del esquema de carreras (ver plan). Si no hay ninguna
// carrera próxima, el widget no pinta nada (ni siquiera un contenedor
// vacío) en vez de mostrar un hueco sin sentido.
//
// Nombre a 2 líneas (antes se cortaba en 1, p. ej. "30ª Carrera Nocturna
// Fiestas de..." -- ver .next-goal-name en el CSS) + una segunda línea
// con el resumen real (buildSubtitle). La cápsula "HOY" solo aparece si
// la carrera es literalmente hoy -- para el resto, "Mañana"/el día de la
// semana ya va dentro de esa segunda línea, no hace falta repetirlo en
// una cápsula aparte.
export function NextGoalWidget(referenceDate = new Date()) {

    const race = getUpcomingPlannedRaces()[0];

    if (!race) return "";

    const days = daysUntil(race.date, referenceDate);

    return `

        <section class="next-goal-widget">

            <span class="next-goal-label">PRÓXIMO OBJETIVO</span>

            <div class="next-goal-line">

                <span class="next-goal-name">${race.name || "Carrera"}</span>

                ${days <= 0 ? `<span class="next-goal-today-pill">HOY</span>` : ""}

            </div>

            <span class="next-goal-subtitle">${buildSubtitle(race, days)}</span>

        </section>

    `;

}
