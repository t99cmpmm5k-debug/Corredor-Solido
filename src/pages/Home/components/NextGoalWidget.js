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

// Cápsula "HOY"/"MAÑANA" (mismo lenguaje visual para las dos, ver
// .next-goal-day-pill) -- para cualquier carrera más lejana no hay
// cápsula, esa fecha real va dentro de la segunda línea (buildSubtitle).
function dayPillLabel(days) {

    if (days <= 0) return "HOY";
    if (days === 1) return "MAÑANA";

    return null;

}

// Segunda línea del widget: tipo/distancia real (si el import la trae) ·
// ubicación real -- cada pieza se omite si esa carrera en concreto no la
// tiene, en vez de fingirla (mismo criterio que RaceListCard.js). Nunca
// las piezas fijas de un tirón: unas carreras solo tienen disciplina
// (RU/TRS) sin distancia en km, y no todas traen ubicación.
//
// La fecha YA NO va aquí para HOY ni para MAÑANA (versión final, ronda
// de cierre + ajuste B2) -- la cápsula de al lado ya lo dice, repetirlo
// en la propia línea era redundante. Para cualquier otra carrera (sin
// cápsula) el día de la semana + fecha real sigue siendo la única pista
// de cuándo es, así que se mantiene -- nunca una hora de inicio, ese
// dato no existe hoy en el esquema de plannedRaces (solo
// registrationDeadline, que es la fecha límite de INSCRIPCIÓN, no la de
// salida -- no son lo mismo, mostrarlo aquí sería inventar una hora de
// carrera que no tenemos).
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

    if (days > 1) parts.push(`${capitalize(formatWeekday(race.date))}, ${formatDayMonth(race.date).toLowerCase()}`);

    return parts.join(" · ");

}

// "Próximas carreras" (renombrado en los ajustes finales de cierre --
// antes "Próximo objetivo", mismo widget) -- la próxima carrera REAL
// marcada en Carreras (getUpcomingPlannedRaces(), ya ordenada por
// fecha), sin inventar un tiempo objetivo, ese campo no existe hoy en
// ningún sitio del esquema de carreras. Sigue mostrando UNA sola carrera
// a propósito (el resto vive en Carreras, ver .next-goal-more-hint más
// abajo) -- si no hay ninguna carrera próxima, el widget no pinta nada
// (ni siquiera un contenedor vacío) en vez de mostrar un hueco sin
// sentido.
//
// Nombre a 2 líneas (antes se cortaba en 1, p. ej. "30ª Carrera Nocturna
// Fiestas de..." -- ver .next-goal-name en el CSS) + una segunda línea
// con el resumen real (buildSubtitle). La cápsula HOY/MAÑANA solo
// aparece si la carrera es literalmente hoy o mañana -- para el resto,
// el día de la semana ya va dentro de esa segunda línea, no hace falta
// repetirlo en una cápsula aparte.
//
// Cápsula + flecha van en la cabecera (junto al título), NO en la misma
// línea que el nombre -- desde que este widget vive a media anchura
// (columna junto a Esta semana, ver Home.js/Home.css) el nombre real
// necesita todo el ancho de la tarjeta para caber en 2 líneas sin
// recortarse casi entero; compartir esa línea con la cápsula lo dejaba
// en "30ª Carrera…" a secas.
//
// Hora de salida junto a la cápsula (p. ej. "HOY · 21:30"): pedida y
// RE-verificada varias veces ya (seedRaces.js, importPlannedRaces() en
// workoutStore.js, RaceImportReviewStep.js) -- sigue sin existir ningún
// campo de hora de SALIDA en ningún registro real (solo date, sin hora,
// y registrationDeadline, que es la fecha límite de INSCRIPCIÓN). Por
// eso la cápsula se queda en HOY/MAÑANA a secas: añadir una hora aquí
// sería inventar un dato que no tenemos.
export function NextGoalWidget(referenceDate = new Date()) {

    const race = getUpcomingPlannedRaces()[0];

    if (!race) return "";

    const days = daysUntil(race.date, referenceDate);
    const subtitle = buildSubtitle(race, days);
    const pillLabel = dayPillLabel(days);

    return `

        <section class="next-goal-widget">

            <div class="next-goal-header">

                <span class="next-goal-label">PRÓXIMAS CARRERAS</span>

                <div class="next-goal-header-right">

                    ${pillLabel ? `<span class="next-goal-day-pill">${pillLabel}</span>` : ""}

                    <iconify-icon icon="solar:alt-arrow-right-bold-duotone" class="next-goal-more-hint"></iconify-icon>

                </div>

            </div>

            <span class="next-goal-name">${race.name || "Carrera"}</span>

            ${subtitle ? `<span class="next-goal-subtitle">${subtitle}</span>` : ""}

        </section>

    `;

}
