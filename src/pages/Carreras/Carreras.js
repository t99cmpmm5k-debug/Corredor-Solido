import "./Carreras.css";

import { BottomNavigation } from "../../components/Navigation/BottomNavigation.js";
import { MonthCalendar, formatMonthLabel } from "../../components/MonthCalendar/MonthCalendar.js";
import { RaceImportWizard } from "./components/RaceImportWizard.js";
import { getWorkouts, getPlannedRaces } from "../../data/workoutStore.js";
import { getViewedMonth, getSelectedDate } from "./carrerasStore.js";
import { getRaceImportStep } from "./raceImportStore.js";
import { parseISODate, formatDayMonth } from "../../utils/date.js";
import { formatSecondsAsClock } from "../../utils/format.js";

const URGENT_DEADLINE_DAYS = 3;

// Un marcador por carrera de ese día: sólido para las ya corridas (workout
// real), outline para las planificadas (importadas, todavía sin correr) —
// mismo icono, distinto relleno/color para distinguirlas de un vistazo en
// el calendario. MonthCalendar solo pinta el primero y un "+N" si hay más.
function raceMarkersByDate(races, plannedRaces) {

    const map = {};

    races.forEach(workout => {
        (map[workout.date] ||= []).push({ icon: "solar:flag-2-bold-duotone", color: "var(--color-danger)" });
    });

    plannedRaces.forEach(race => {
        if (!race.date) return;
        (map[race.date] ||= []).push({ icon: "solar:flag-2-bold-duotone", color: "var(--color-primary)" });
    });

    return map;

}

function formatDistance(distanceKm) {

    return distanceKm != null ? `${distanceKm.toFixed(2).replace(".", ",")} km` : "—";

}

function formatDeadline(iso) {

    const [datePart, timePart] = iso.split("T");
    const date = parseISODate(datePart);

    const dateLabel = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" })
        .format(date)
        .replace(".", "");

    const timeLabel = timePart ? timePart.slice(0, 5) : null;

    return timeLabel ? `${dateLabel}, ${timeLabel}` : dateLabel;

}

function isDeadlineUrgent(iso) {

    const deadline = new Date(iso);
    if (Number.isNaN(deadline.getTime())) return false;

    const msUntil = deadline.getTime() - Date.now();

    return msUntil >= 0 && msUntil <= URGENT_DEADLINE_DAYS * 24 * 60 * 60 * 1000;

}

// Fila de una carrera ya corrida (workout real) dentro del panel del día
// seleccionado — toca abrir su detalle real, que vive en Running (ver
// RunningDetailView.js); no se duplica ninguna tarjeta de Running.js, esta
// es una versión propia y más simple, sin botón de borrar (borrar sigue
// siendo cosa de Running).
function CarreraRow(workout) {

    const distance = formatDistance(workout.distanceKm);
    const duration = workout.durationSec != null ? formatSecondsAsClock(workout.durationSec) : "—";
    const pace = workout.avgPaceSecPerKm != null ? `${formatSecondsAsClock(workout.avgPaceSecPerKm)}/km` : "—";

    return `

        <button class="carreras-day-race" data-action="open-race-detail" data-workout-id="${workout.id}">

            <iconify-icon icon="solar:flag-2-bold-duotone"></iconify-icon>

            <div class="carreras-day-race-text">

                <span class="carreras-day-race-title">${workout.title || "Carrera"}</span>

                <span class="carreras-day-race-stats">${distance} · ${duration} · ${pace}</span>

            </div>

            <iconify-icon icon="solar:alt-arrow-right-bold-duotone" class="carreras-day-race-chevron"></iconify-icon>

        </button>

    `;

}

// Fila de una carrera planificada (importada, todavía sin correr) — sin
// detalle al que saltar (no hay workout real todavía), con la fecha
// límite de inscripción si el archivo la traía y un botón para abrir el
// enlace de inscripción en una pestaña nueva.
function PlannedRaceRow(race) {

    const urgent = race.registrationDeadline && isDeadlineUrgent(race.registrationDeadline);

    return `

        <div class="carreras-day-planned-race">

            <iconify-icon icon="solar:flag-2-bold-duotone"></iconify-icon>

            <div class="carreras-day-planned-race-text">

                <span class="carreras-day-planned-race-title">${race.name || "Carrera"}</span>

                ${race.location ? `<span class="carreras-day-planned-race-stats">${race.location}${race.type ? ` · ${race.type}` : ""}</span>` : ""}

                ${race.registrationDeadline ? `

                    <span class="carreras-day-planned-race-deadline ${urgent ? "is-urgent" : ""}">

                        <iconify-icon icon="solar:clock-circle-bold-duotone"></iconify-icon>

                        Inscripción hasta ${formatDeadline(race.registrationDeadline)}

                    </span>

                ` : ""}

            </div>

            ${race.url ? `

                <button class="carreras-day-planned-race-link" data-action="open-race-url" data-url="${race.url}" title="Abrir inscripción">

                    <iconify-icon icon="solar:link-bold-duotone"></iconify-icon>

                </button>

            ` : ""}

        </div>

    `;

}

function SelectedDayPanel(selectedDate, races, plannedRaces) {

    if (!selectedDate) return "";

    const dayRaces = races.filter(w => w.date === selectedDate);
    const dayPlannedRaces = plannedRaces.filter(r => r.date === selectedDate);

    if (!dayRaces.length && !dayPlannedRaces.length) return "";

    return `

        <section class="carreras-day-panel">

            <h3 class="carreras-day-panel-title">${formatDayMonth(selectedDate)}</h3>

            ${dayRaces.map(CarreraRow).join("")}

            ${dayPlannedRaces.map(PlannedRaceRow).join("")}

        </section>

    `;

}

export function Carreras() {

    // El wizard de importación se superpone a la pantalla normal de
    // Carreras (mismo patrón que en Plan) en vez de vivir en su propia
    // ruta — así el gesto de atrás del móvil puede cerrarlo sin salir de
    // la app.
    if (getRaceImportStep() !== "closed") {

        return `

            <section class="carreras">

                ${RaceImportWizard()}

            </section>

            ${BottomNavigation()}

        `;

    }

    const races = getWorkouts().filter(w => w.type === "race");
    const plannedRaces = getPlannedRaces();
    const viewedMonth = getViewedMonth();
    const selectedDate = getSelectedDate();

    const racesThisMonth = races.filter(w => {
        const date = parseISODate(w.date);
        return date.getFullYear() === viewedMonth.getFullYear() && date.getMonth() === viewedMonth.getMonth();
    }).length;

    return `

        <div class="carreras">

            <div class="carreras-content">

                <header class="carreras-header">

                    <h1>Carreras</h1>

                    <p class="carreras-subtitle">${racesThisMonth} ${racesThisMonth === 1 ? "carrera" : "carreras"} en ${formatMonthLabel(viewedMonth).toLowerCase()}</p>

                </header>

                <button class="carreras-import-button" data-action="open-race-import">

                    <iconify-icon icon="solar:calendar-add-bold-duotone"></iconify-icon>

                    Importar carreras

                </button>

                ${races.length === 0 && plannedRaces.length === 0 ? `

                    <div class="carreras-empty">

                        <iconify-icon icon="solar:flag-2-bold-duotone"></iconify-icon>

                        <p>Aún no has registrado ninguna carrera.</p>

                        <p class="carreras-empty-hint">Importa un calendario de carreras futuras, o clasifica un entreno como "Carrera" desde Running para verlo aquí.</p>

                    </div>

                ` : `

                    ${MonthCalendar(viewedMonth, {
                        markersByDate: raceMarkersByDate(races, plannedRaces),
                        selectedDate,
                        dataAction: "select-race-day"
                    })}

                    ${SelectedDayPanel(selectedDate, races, plannedRaces)}

                `}

            </div>

            ${BottomNavigation()}

        </div>

    `;

}
