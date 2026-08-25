import "./MasterCard.css";

import { SessionCard } from "./components/SessionCard.js";
import { GymTodayCard } from "./components/GymTodayCard.js";
import { getTodaySession } from "../../data/workoutStore.js";
import { getState } from "../../core/state.js";
import { getGymDayForDate } from "../../pages/Plan/gymTimelineBridge.js";
import { formatISODate } from "../../utils/date.js";

function EmptySessionCard() {

    return `

        <section class="session-card session-card--empty">

            <p>No hay ninguna sesión planificada para hoy.</p>

        </section>

    `;

}

export function MasterCard(){

    // Lectura directa de state en vez de planStore.getSelectedWorkout():
    // ese getter auto-inicializa la selección a sessions[0] si no hay
    // sesión hoy, y aquí eso mostraría el lunes como si fuera "hoy" en
    // un día de descanso real. Solo se sustituye getTodaySession() cuando
    // el usuario ha elegido otro día de verdad (botón "Cambiar").
    const workout = getState().selectedWorkout ?? getTodaySession();

    if (workout) {

        return `<section class="master-card">${SessionCard(workout)}</section>`;

    }

    // Sin running planificado hoy (workout === null implica también que
    // no hay una selección manual de otro día, ver comentario de arriba):
    // si hoy toca gimnasio, se muestra en este mismo hueco en vez del
    // aviso genérico -- running sigue mandando siempre que haya running
    // planificado (decisión confirmada 2026-08-25), esto solo rellena el
    // hueco cuando no lo hay. Mismo mecanismo que ya usa Plan, no uno
    // nuevo (ver gymTimelineBridge.js).
    const gymMatch = getGymDayForDate(formatISODate(new Date()));

    return `<section class="master-card">${gymMatch ? GymTodayCard(gymMatch) : EmptySessionCard()}</section>`;

}