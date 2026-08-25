import "./MonthCalendar.css";

import { parseISODate, formatISODate, addDays, getWeekStartDate, isToday } from "../../utils/date.js";

const WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

export function formatMonthLabel(monthDate) {

    const label = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(monthDate);
    return label.charAt(0).toUpperCase() + label.slice(1);

}

// Semanas completas (lunes-domingo) que cubren el mes — 4, 5 o 6 filas
// según en qué día caigan el 1 y el último día del mes, nunca una fila
// entera de más. Exportada aparte del componente para poder testear la
// lógica de límites sin montar HTML.
export function buildCalendarWeeks(monthDate) {

    const monthIndex = monthDate.getMonth();
    const monthStart = formatISODate(new Date(monthDate.getFullYear(), monthIndex, 1));
    const monthEnd = formatISODate(new Date(monthDate.getFullYear(), monthIndex + 1, 0));

    const gridStart = getWeekStartDate(monthStart);
    const gridEnd = addDays(getWeekStartDate(monthEnd), 6);

    const days = [];
    let cursor = gridStart;

    while (cursor <= gridEnd) {
        days.push(cursor);
        cursor = addDays(cursor, 1);
    }

    const weeks = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

    return weeks;

}

function CalendarDayCell(iso, { monthIndex, markers, isSelected, dataAction, disableEmptyDays }) {

    const date = parseISODate(iso);
    const inMonth = date.getMonth() === monthIndex;
    const hasMarkers = markers.length > 0;
    const isTappable = hasMarkers || !disableEmptyDays;

    return `

        <button
            class="
                month-calendar-day
                ${inMonth ? "" : "is-outside"}
                ${isToday(iso) ? "is-today" : ""}
                ${isSelected ? "is-selected" : ""}
                ${hasMarkers ? "has-marker" : ""}
            "
            data-action="${isTappable ? dataAction : ""}"
            data-date="${iso}"
            ${isTappable ? "" : "disabled"}
        >

            <span class="month-calendar-day-number">${date.getDate()}</span>

            ${hasMarkers ? `

                <span class="month-calendar-day-markers">

                    <iconify-icon icon="${markers[0].icon}" style="color:${markers[0].color}"></iconify-icon>

                    ${markers.length > 1 ? `<span class="month-calendar-day-marker-count">+${markers.length - 1}</span>` : ""}

                </span>

            ` : ""}

        </button>

    `;

}

// Calendario mensual genérico — hoy solo lo usa Carreras (un punto por
// día con carrera), pensado para que Plan lo reutilice cuando aborde su
// propia vista mensual (ver CLAUDE.md, "known duplication").
//
// markersByDate: { [iso]: { icon, color }[] } — por defecto (disableEmptyDays
// true) un día sin entrada o con array vacío no es tocable (sin
// data-action, disabled), pensado para un calendario de solo lectura como
// el de Carreras. Plan pasa disableEmptyDays:false (ver PlanMonthCalendar.js)
// porque ahí un día vacío SÍ es tocable -- abre el formulario de creación
// manual de sesión (ver initPlanEvents.js), mismo punto de entrada que un
// día "Descanso" en la línea temporal semanal. Navegar de mes
// (data-action="calendar-prev-month"/"calendar-next-month") y tocar un
// día (dataAction, por defecto "select-calendar-day") los cablea quien
// use el componente, igual que el resto de data-action de la app.
export function MonthCalendar(monthDate, { markersByDate = {}, selectedDate = null, dataAction = "select-calendar-day", disableEmptyDays = true } = {}) {

    const weeks = buildCalendarWeeks(monthDate);

    return `

        <div class="month-calendar">

            <header class="month-calendar-header">

                <button class="month-calendar-nav" data-action="calendar-prev-month">
                    <iconify-icon icon="solar:alt-arrow-left-bold-duotone"></iconify-icon>
                </button>

                <span class="month-calendar-label">${formatMonthLabel(monthDate)}</span>

                <button class="month-calendar-nav" data-action="calendar-next-month">
                    <iconify-icon icon="solar:alt-arrow-right-bold-duotone"></iconify-icon>
                </button>

            </header>

            <div class="month-calendar-weekdays">

                ${WEEKDAY_LABELS.map(label => `<span>${label}</span>`).join("")}

            </div>

            <div class="month-calendar-grid">

                ${weeks.map(week => `

                    <div class="month-calendar-week">

                        ${week.map(iso => CalendarDayCell(iso, {
                            monthIndex: monthDate.getMonth(),
                            markers: markersByDate[iso] || [],
                            isSelected: iso === selectedDate,
                            dataAction,
                            disableEmptyDays
                        })).join("")}

                    </div>

                `).join("")}

            </div>

        </div>

    `;

}
