import "./RaceListCard.css";

import { getRaceImage } from "../../../utils/raceImage.js";
import { parseISODate } from "../../../utils/date.js";
import { monthAbbrev, formatDistance } from "../raceFormat.js";

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

// Tarjeta común a las 3 tabs — kind ("completed"/"planned") solo decide
// el borde (sólido/discontinuo, mismo lenguaje visual que ya usaba el
// calendario) y qué data-action dispara al tocarla; el resto del
// contenido sale de la forma normalizada de raceEntries.js, así que una
// carrera completada sin location/disciplina simplemente no pinta esas
// líneas en vez de fingirlas.
export function RaceListCard(entry) {

    const image = getRaceImage({ type: entry.disciplineType, name: entry.name, date: entry.date });
    const isPlanned = entry.kind === "planned";

    return `

        <button
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

                    ${entry.disciplineType === "RU" ? `<span class="race-card-pill">Asfalto</span>` : ""}

                </div>

            </div>

            <iconify-icon icon="solar:alt-arrow-right-bold-duotone" class="race-card-chevron"></iconify-icon>

        </button>

    `;

}
