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

// Línea de meta con datos derivables de lo que ya trae la carrera --
// "Faltan X días" solo tiene sentido para una planificada con fecha aún
// por llegar (una pasada mostraría un número negativo, una completada ya
// se corrió), inscripción abierta/cerrada solo si hay
// registrationDeadline real (nunca se inventa un estado sin dato, ver
// CLAUDE.md). Cualquiera de los dos puede faltar sin que falte el otro.
function RaceMeta(entry) {

    const parts = [];
    let registrationOpen = null;

    if (entry.registrationDeadline) {
        registrationOpen = isRegistrationOpen(entry.registrationDeadline);
        parts.push(`<span class="${registrationOpen ? "is-open" : "is-closed"}">${registrationOpen ? "Inscripción abierta" : "Inscripción cerrada"}</span>`);
    }

    if (entry.kind === "planned") {
        const days = daysUntilRace(entry.date);
        if (days >= 0) parts.push(formatDaysUntilRace(days));
    }

    if (parts.length === 0) return "";

    return `<span class="race-card-meta">${parts.join(" · ")}</span>`;

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
    const disciplineLabel = formatDisciplineType(entry.disciplineType);

    return `

        <article
            class="race-card ${isPlanned ? "is-planned" : "is-completed"}"
            data-action="open-race-entry"
            data-kind="${entry.kind}"
            data-id="${entry.id}"
        >

            <div class="race-card-image" style="background-image:url('${image}')"></div>

            ${DateBadge(entry.date)}

            <div class="race-card-body">

                <span class="race-card-name">${entry.name}</span>

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
