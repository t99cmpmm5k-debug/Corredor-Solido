// Puente de solo lectura entre Gimnasio y Plan -- vive en Plan a propósito
// (no en src/data/ ni en src/pages/Gym/) para no tocar el store de datos de
// ninguno de los dos módulos, solo leerlo y traducirlo a lo que necesita la
// línea temporal semanal (ver PlanTimeline.js). Reutilizado también desde
// Home (ver MasterCard.js/Hero.js) para el mismo motivo -- "qué día de
// gimnasio toca en la fecha X" es la misma pregunta en los dos sitios, una
// sola fuente de verdad en vez de dos.
//
// Corrección 2026-08-25: la primera versión de este archivo adivinaba el
// día de la semana escaneando el texto libre de day.title -- resultó
// incorrecto. day.weekday SÍ está poblado de verdad en las rutinas reales
// del usuario (viene de antes de este rediseño; el seed de fábrica en
// db.js/gymData.js no lo pone, pero eso solo afecta a una instalación
// nueva, no a datos ya existentes) y es exactamente lo que ya usa
// "Próximos entrenamientos" en Gimnasio (getTodayGymDay(), en
// gymSchedule.js). Se reutiliza esa misma función tal cual -- ni se
// duplica su criterio de weekday/dedupe, ni se vuelve a inventar uno por
// texto -- para que los dos sitios muestren siempre el mismo día para la
// misma rutina.
import { getRoutines } from "../../data/gymRoutineStore.js";
import { getGymSessions } from "../../data/gymSessionStore.js";
import { getTodayGymDay, getFinishedGymSessionForDay } from "../Gym/gymSchedule.js";

// { routine, day, finishedSession } del día de gimnasio programado
// (day.weekday) para el día de la semana de `iso` -- null si ninguna
// rutina tiene un día programado ese día. getTodayGymDay() ya aplica el
// mismo dedupe por id que "Próximos entrenamientos" (ver scheduledDays()
// en gymSchedule.js); con dos rutinas distintas para el mismo día de la
// semana, gana la primera por orden de getRoutines(), igual que ahí.
// finishedSession es la sesión ya terminada para ESE dayId en la fecha
// `iso` exacta (null si no se ha hecho, o si `iso` no es la fecha en la
// que de verdad se registró) -- misma fuente que "Próximos entrenamientos"
// para "hoy", generalizada a cualquier fecha porque Plan pinta 7 a la vez.
export function getGymDayForDate(iso) {

    const allDays = getRoutines().flatMap(routine =>
        routine.days.map(day => ({ ...day, __routineId: routine.id, __routineName: routine.name }))
    );

    const match = getTodayGymDay(allDays, iso);
    if (!match) return null;

    const finishedSession = getFinishedGymSessionForDay(match.id, getGymSessions(), iso);

    return { routine: { id: match.__routineId, name: match.__routineName }, day: match, finishedSession };

}
