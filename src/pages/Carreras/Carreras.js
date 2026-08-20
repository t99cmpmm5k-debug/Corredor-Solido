import "./Carreras.css";

import { BottomNavigation } from "../../components/Navigation/BottomNavigation.js";
import { MonthCalendar, formatMonthLabel } from "../../components/MonthCalendar/MonthCalendar.js";
import { getWorkouts } from "../../data/workoutStore.js";
import { getViewedMonth, getSelectedDate } from "./carrerasStore.js";
import { parseISODate, formatDayMonth } from "../../utils/date.js";
import { formatSecondsAsClock } from "../../utils/format.js";

// Un marcador por carrera de ese día (bandera roja, mismo icono que
// TYPE_ICON.race en Running.js) — MonthCalendar solo pinta el primero y
// un "+N" si hay más de uno.
function raceMarkersByDate(races) {

    return races.reduce((map, workout) => {

        (map[workout.date] ||= []).push({ icon: "solar:flag-2-bold-duotone", color: "var(--color-danger)" });
        return map;

    }, {});

}

function formatDistance(distanceKm) {

    return distanceKm != null ? `${distanceKm.toFixed(2).replace(".", ",")} km` : "—";

}

// Fila de una carrera dentro del panel del día seleccionado — toca abrir
// su detalle real, que vive en Running (ver RunningDetailView.js); no se
// duplica ninguna tarjeta de Running.js, esta es una versión propia y más
// simple, sin botón de borrar (borrar sigue siendo cosa de Running).
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

function SelectedDayPanel(selectedDate, races) {

    if (!selectedDate) return "";

    const dayRaces = races.filter(w => w.date === selectedDate);
    if (!dayRaces.length) return "";

    return `

        <section class="carreras-day-panel">

            <h3 class="carreras-day-panel-title">${formatDayMonth(selectedDate)}</h3>

            ${dayRaces.map(CarreraRow).join("")}

        </section>

    `;

}

export function Carreras() {

    const races = getWorkouts().filter(w => w.type === "race");
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

                ${races.length === 0 ? `

                    <div class="carreras-empty">

                        <iconify-icon icon="solar:flag-2-bold-duotone"></iconify-icon>

                        <p>Aún no has registrado ninguna carrera.</p>

                        <p class="carreras-empty-hint">Importa una carrera desde Running y clasifícala como "Carrera" para verla aquí.</p>

                    </div>

                ` : `

                    ${MonthCalendar(viewedMonth, {
                        markersByDate: raceMarkersByDate(races),
                        selectedDate,
                        dataAction: "select-race-day"
                    })}

                    ${SelectedDayPanel(selectedDate, races)}

                `}

            </div>

            ${BottomNavigation()}

        </div>

    `;

}
