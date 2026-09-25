import "./NextGoalWidget.css";

import { getUpcomingPlannedRaces } from "../../../data/workoutStore.js";
import { parseISODate, formatISODate, formatDayMonth } from "../../../utils/date.js";
import { formatDistance } from "../../Carreras/raceFormat.js";

// Días reales hasta la carrera (diff de fecha, nunca estimado) --
// referenceDate solo se pasa distinto de new Date() en tests.
function daysUntil(dateISO, referenceDate) {

    const target = parseISODate(dateISO);
    const today = parseISODate(formatISODate(referenceDate));

    return Math.round((target - today) / 86400000);

}

function countdownLabel(days) {

    if (days <= 0) return "Es hoy";
    if (days === 1) return "Falta 1 día";

    return `Faltan ${days} días`;

}

// "TU PRÓXIMO OBJETIVO" (rediseño de Inicio, 2026-09-25 -- antes
// "Próximas carreras", que mostraba la más próxima del calendario
// general aunque no tuviera nada marcado) -- SOLO existe con una carrera
// marcada de verdad Inscrito (isRegistered) u Objetivo (isGoal), nunca
// una del calendario general ni una solo "Siguiendo" (isGoal e
// isRegistered ambos false, ver raceEntries.js/RaceDetailView.js --
// campos que YA EXISTÍAN en el esquema de plannedRaces antes de este
// rediseño, con sus propios setters/botones en Carreras, no se ha
// añadido ningún campo nuevo). Prioridad: Inscrito más próxima primero;
// sin ninguna inscrita, Objetivo más próxima. getUpcomingPlannedRaces()
// ya viene ordenada por fecha, así que basta el primer find() de cada
// categoría -- sin ninguna de las dos, el widget no pinta nada (ni
// siquiera un contenedor vacío) y "Esta semana" vuelve a ocupar el ancho
// completo (ver Home.js/.home-two-col en Home.css).
export function NextGoalWidget(referenceDate = new Date()) {

    const upcoming = getUpcomingPlannedRaces();
    const race = upcoming.find(r => r.isRegistered) ?? upcoming.find(r => r.isGoal) ?? null;

    if (!race) return "";

    const days = daysUntil(race.date, referenceDate);

    // Sin superficie/ubicación/día de la semana (pedido explícito de este
    // rediseño -- "sin datos innecesarios") -- solo distancia real (si el
    // import la trae) y fecha, seguidas de la cuenta atrás real. Ninguna
    // hora de salida: sigue sin existir ese campo en el esquema (solo
    // date + registrationDeadline, la fecha límite de INSCRIPCIÓN, no la
    // de salida -- mismo motivo ya documentado en versiones anteriores de
    // este widget).
    const metaParts = [];
    if (race.distanceKm != null) metaParts.push(formatDistance(race.distanceKm));
    metaParts.push(formatDayMonth(race.date));

    return `

        <div class="next-goal-widget" data-action="open-goal-race" data-race-id="${race.id}">

            <div class="next-goal-header">

                <span class="next-goal-label">TU PRÓXIMO OBJETIVO</span>

                <div class="next-goal-header-right">

                    <span class="next-goal-badge next-goal-badge--${race.isRegistered ? "registered" : "goal"}">${race.isRegistered ? "INSCRITO" : "OBJETIVO"}</span>

                    <iconify-icon icon="solar:alt-arrow-right-bold-duotone" class="next-goal-more-hint"></iconify-icon>

                </div>

            </div>

            <span class="next-goal-name">${race.name || "Carrera"}</span>

            <p class="next-goal-meta">${metaParts.join(" · ")} · <strong>${countdownLabel(days)}</strong></p>

        </div>

    `;

}
