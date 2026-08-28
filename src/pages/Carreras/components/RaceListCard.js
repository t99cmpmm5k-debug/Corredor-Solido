import "./RaceListCard.css";

import { getRaceImage } from "../../../utils/raceImage.js";
import { parseISODate } from "../../../utils/date.js";
import { monthAbbrev, formatDistance, formatDisciplineType, daysUntilRace, formatDaysUntilRace, isRegistrationOpen } from "../raceFormat.js";
import { getRaceCardMenuOpenId } from "../carrerasStore.js";

function DateBadge(iso) {

    const date = parseISODate(iso);
    const month = monthAbbrev(iso);

    return `

        <div class="race-card-date-badge">

            <span class="race-card-date-day">${date.getDate()}</span>
            <span class="race-card-date-month">${month}</span>

        </div>

    `;

}

// Fila de badges de estado real -- HOY (isToday, calculado en
// RaceListCard()), Objetivo (isGoal), Inscrito de verdad (isRegistered,
// distinto de "Inscripción abierta/cerrada" de RaceMeta, que es el estado
// del EVENTO, no del usuario) y En tu plan (linkedPlanSessionId, conexión
// real con una plannedSession de Plan, ver linkPlannedRaceToPlan() en
// workoutStore.js). Cada badge se omite si su indicador no está activo --
// nunca los 4 a la fuerza. HOY primero: es el más urgente de los cuatro.
function RaceBadges(entry, isToday) {

    if (!isToday && !entry.isGoal && !entry.isRegistered && !entry.linkedPlanSessionId) return "";

    return `

        <div class="race-card-badges">

            ${isToday ? `

                <span class="race-card-badge race-card-badge--today">
                    <iconify-icon icon="solar:flag-bold-duotone"></iconify-icon>
                    Hoy
                </span>

            ` : ""}

            ${entry.isGoal ? `

                <span class="race-card-badge race-card-badge--goal">
                    <iconify-icon icon="solar:cup-star-bold-duotone"></iconify-icon>
                    Objetivo
                </span>

            ` : ""}

            ${entry.isRegistered ? `

                <span class="race-card-badge race-card-badge--registered">
                    <iconify-icon icon="solar:check-circle-bold-duotone"></iconify-icon>
                    Inscrito
                </span>

            ` : ""}

            ${entry.linkedPlanSessionId ? `

                <span class="race-card-badge race-card-badge--in-plan">
                    <iconify-icon icon="solar:calendar-mark-bold-duotone"></iconify-icon>
                    En tu plan
                </span>

            ` : ""}

        </div>

    `;

}

// Fila de meta con datos derivables de lo que ya trae la carrera --
// inscripción abierta/cerrada (estado del EVENTO, solo si hay
// registrationDeadline real, nunca se inventa un estado sin dato, ver
// CLAUDE.md) y "Faltan X días" (solo para una planificada con fecha aún
// por llegar -- una pasada mostraría un número negativo, una completada ya
// se corrió) son dos datos de naturaleza distinta -- inscripción es un
// estado binario del organizador, días-restantes es una cuenta atrás --
// así que se pintan como dos niveles visuales separados (pill verde vs.
// texto llano) en vez de mezclados en una sola línea con " · ". Días=0 no
// se repite aquí -- ya lo cubre el badge "Hoy" de RaceBadges(), una
// segunda mención sería ruido redundante. Cualquiera de los dos puede
// faltar sin que falte el otro.
function RaceMeta(entry) {

    let registrationBadge = "";

    if (entry.registrationDeadline) {
        const registrationOpen = isRegistrationOpen(entry.registrationDeadline);
        registrationBadge = `
            <span class="race-card-registration ${registrationOpen ? "is-open" : "is-closed"}">
                <iconify-icon icon="${registrationOpen ? "solar:lock-keyhole-unlocked-bold-duotone" : "solar:lock-keyhole-bold-duotone"}"></iconify-icon>
                ${registrationOpen ? "Inscripción abierta" : "Inscripción cerrada"}
            </span>
        `;
    }

    let daysLabel = "";

    if (entry.kind === "planned") {
        const days = daysUntilRace(entry.date);
        if (days > 0) daysLabel = `<span class="race-card-days">${formatDaysUntilRace(days)}</span>`;
    }

    if (!registrationBadge && !daysLabel) return "";

    return `<div class="race-card-status-row">${registrationBadge}${daysLabel}</div>`;

}

// Menú "···" (pulido de cierre: sustituye a la papelera siempre visible
// de antes, mismo motivo/patrón que Running/Plan -- reduce el riesgo de
// borrado accidental) -- solo en carreras planificadas, una ya corrida no
// se borra desde aquí (eso sigue siendo cosa de Running, ver
// history-delete en Running.css).
function RaceCardMenu(entry) {

    const isMenuOpen = getRaceCardMenuOpenId() === entry.id;

    return `

        <div class="race-card-menu">

            <button
                class="race-card-menu-toggle"
                data-action="toggle-race-card-menu"
                data-id="${entry.id}"
                aria-label="Más opciones"
            >

                <iconify-icon icon="solar:menu-dots-bold-duotone"></iconify-icon>

            </button>

            ${isMenuOpen ? `

                <div class="race-card-menu-popover">

                    <button class="race-card-menu-danger" data-action="delete-planned-race" data-id="${entry.id}">
                        <iconify-icon icon="solar:trash-bin-trash-bold-duotone"></iconify-icon>
                        Eliminar
                    </button>

                </div>

            ` : ""}

        </div>

    `;

}

// Tarjeta común a las 3 tabs — kind ("completed"/"planned") solo decide
// el borde (sólido/discontinuo, mismo lenguaje visual que ya usaba el
// calendario) y qué data-action dispara al tocarla; el resto del
// contenido sale de la forma normalizada de raceEntries.js, así que una
// carrera completada sin location/disciplina simplemente no pinta esas
// líneas en vez de fingirlas.
//
// <article>, no <button>: una planificada necesita su propio menú "···"
// dentro de la tarjeta (ver RaceCardMenu arriba) — un <button> no puede
// anidar otro <button>. Mismo patrón que RunningHistoryItem (Running.js):
// el contenedor entero abre el detalle vía data-action + listener JS, el
// menú hace stopPropagation() para no disparar también la apertura.
export function RaceListCard(entry) {

    const image = getRaceImage({ type: entry.disciplineType, name: entry.name, date: entry.date });
    const isPlanned = entry.kind === "planned";
    const isToday = isPlanned && daysUntilRace(entry.date) === 0;
    const disciplineLabel = formatDisciplineType(entry.disciplineType);

    return `

        <article
            class="race-card ${isPlanned ? "is-planned" : "is-completed"} ${entry.isGoal ? "is-goal" : ""} ${isToday ? "is-today" : ""}"
            data-action="open-race-entry"
            data-kind="${entry.kind}"
            data-id="${entry.id}"
        >

            <div class="race-card-image" style="background-image:url('${image}')"></div>

            ${DateBadge(entry.date)}

            <div class="race-card-body">

                <span class="race-card-name">${entry.name}</span>

                ${RaceBadges(entry, isToday)}

                ${entry.location ? `

                    <span class="race-card-location">

                        <iconify-icon icon="solar:map-point-bold-duotone"></iconify-icon>
                        ${entry.location}

                    </span>

                ` : ""}

                <div class="race-card-pills">

                    ${entry.distanceKm != null ? `<span class="race-card-pill">${formatDistance(entry.distanceKm)}</span>` : ""}

                    ${disciplineLabel ? `<span class="race-card-pill">${disciplineLabel}</span>` : ""}

                </div>

                ${RaceMeta(entry)}

            </div>

            ${isPlanned ? RaceCardMenu(entry) : ""}

            <iconify-icon icon="solar:alt-arrow-right-bold-duotone" class="race-card-chevron"></iconify-icon>

        </article>

    `;

}
