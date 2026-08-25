// Puente de solo lectura entre Gimnasio y Plan -- vive en Plan a propósito
// (no en src/data/ ni en src/pages/Gym/) para no tocar el store de datos de
// ninguno de los dos módulos, solo leerlo y traducirlo a lo que necesita la
// línea temporal semanal (ver PlanTimeline.js).
import { getRoutines } from "../../data/gymRoutineStore.js";
import { parseISODate } from "../../utils/date.js";

// Mismo orden que Date.getDay() (0 = domingo) -- mismo criterio que
// WEEKDAYS_BY_INDEX en src/pages/Gym/gymSchedule.js, duplicado aquí en vez
// de importado: ese día.weekday estructurado todavía no lo rellena el
// constructor manual de rutinas para ninguna rutina (ver comentario en
// gymSchedule.js), así que la única señal real hoy es el texto libre de
// day.title (p. ej. "Lunes - Torso") y esa lectura es asunto de Plan, no de
// Gimnasio.
const WEEKDAY_NAMES = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

function stripAccents(text) {

    return text.normalize("NFD").replace(/[̀-ͯ]/g, "");

}

// Busca un nombre de día de la semana como palabra suelta dentro del
// título libre de un día de rutina -- null si el título no menciona
// ninguno (ese día simplemente no aparece en Plan hasta que se le añada).
function weekdayInTitle(title) {

    const normalized = stripAccents(title).toLowerCase();

    return WEEKDAY_NAMES.find(name => new RegExp(`\\b${name}\\b`).test(normalized)) ?? null;

}

// { routine, day } del primer día de gimnasio (de cualquier rutina
// guardada) cuyo título menciona el día de la semana de `iso` -- null si
// ninguno coincide. Con dos rutinas que caigan el mismo día de la semana,
// gana la primera por orden de getRoutines(), mismo criterio de "el
// primero gana" que ya usa fillWeekDays() en PlanTimeline.js con dos
// sesiones reales el mismo día.
export function getGymDayForDate(iso) {

    const weekday = WEEKDAY_NAMES[parseISODate(iso).getDay()];

    for (const routine of getRoutines()) {

        for (const day of routine.days) {

            if (weekdayInTitle(day.title) === weekday) return { routine, day };

        }

    }

    return null;

}
