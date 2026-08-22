import "./RaceDetailView.css";

import { getRaceImage } from "../../../utils/raceImage.js";
import { parseISODate, formatWeekday, formatDayMonth } from "../../../utils/date.js";
import { formatDeadline, isDeadlineUrgent, formatUrlHost, monthAbbrev, formatDistance, formatDisciplineType } from "../raceFormat.js";

function capitalize(text) {

    return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;

}

function DetailRow(label, value) {

    return `

        <div class="race-detail-row">

            <span class="race-detail-row-label">${label}</span>
            <span class="race-detail-row-value">${value}</span>

        </div>

    `;

}

// Vista de detalle de una carrera PLANIFICADA (importada, todavía sin
// correr) — una completada de verdad sigue abriendo el detalle real de
// Running (ver viewSessionWorkout()/openRaceDetail() en
// initCarrerasEvents.js), esta vista no lo sustituye ni lo duplica.
export function RaceDetailView(race) {

    if (!race) return "";

    const image = getRaceImage(race);
    const date = parseISODate(race.date);
    const urgentDeadline = race.registrationDeadline && isDeadlineUrgent(race.registrationDeadline);

    return `

        <section class="race-detail">

            <div class="race-detail-hero" style="background-image:url('${image}')">

                <div class="race-detail-hero-overlay"></div>

                <button class="race-detail-hero-button race-detail-back" data-action="close-race-detail">
                    <iconify-icon icon="solar:alt-arrow-left-bold-duotone"></iconify-icon>
                </button>

                <button class="race-detail-hero-button race-detail-share" data-action="share-race-detail" data-race-id="${race.id}">
                    <iconify-icon icon="solar:share-bold-duotone"></iconify-icon>
                </button>

            </div>

            <div class="race-detail-content">

                <div class="race-detail-heading">

                    <div class="race-detail-date-badge">
                        <span class="race-detail-date-day">${date.getDate()}</span>
                        <span class="race-detail-date-month">${monthAbbrev(race.date)}</span>
                    </div>

                    <div class="race-detail-heading-text">

                        <h1>${race.name}</h1>

                        <span class="race-detail-subtitle">
                            ${[formatDisciplineType(race.disciplineType), race.location].filter(Boolean).join(" · ")}
                        </span>

                    </div>

                </div>

                ${race.distanceKm != null ? `

                    <div class="race-detail-pills">
                        <span class="race-detail-pill">${formatDistance(race.distanceKm)}</span>
                    </div>

                ` : ""}

                <section class="race-detail-table">

                    <h2>Detalles</h2>

                    ${DetailRow("Fecha", capitalize(formatWeekday(race.date)) + " · " + formatDayMonth(race.date))}
                    ${DetailRow("Ubicación", race.location || "—")}

                    ${race.registrationDeadline ? DetailRow(
                        "Fecha límite de inscripción",
                        `<span class="${urgentDeadline ? "is-urgent" : ""}">${formatDeadline(race.registrationDeadline)}</span>`
                    ) : ""}

                    ${race.url ? DetailRow("Enlace", formatUrlHost(race.url)) : ""}

                </section>

                ${race.url ? `

                    <button class="wizard-primary-button" data-action="open-race-url" data-url="${race.url}">
                        Ver inscripciones
                    </button>

                ` : ""}

                <button class="wizard-undo-button" data-action="delete-planned-race" data-id="${race.id}">

                    <iconify-icon icon="solar:trash-bin-trash-bold-duotone"></iconify-icon>
                    Eliminar carrera

                </button>

            </div>

        </section>

    `;

}
