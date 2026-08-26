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

// Corrección 2026-08-26 (coherencia Plan↔Home): "running siempre manda"
// (decisión del 25 ago) se descarta -- si Plan tiene programados running
// Y gimnasio el mismo día, Inicio debe reflejar los dos, no solo uno
// como si el otro no existiera. Las dos tarjetas se apilan (reutilizando
// tal cual el formato ya construido de cada una, sin diseño híbrido
// nuevo) en vez de fusionarse en una sola.
export function MasterCard(){

    // homeSelectedWorkout (propio de Inicio, ver core/state.js) en vez de
    // planStore.getSelectedWorkout()/state.selectedWorkout: ese es el
    // estado de Plan, y compartirlo aquí causaba que tocar un día
    // cualquiera en Plan se colara en Inicio como si fuera "la sesión de
    // hoy" (bug real, corregido 2026-08-26). Tampoco se usa
    // planStore.getSelectedWorkout() directamente aunque estuviera bien
    // aislado: ese getter auto-inicializa la selección a sessions[0] si no
    // hay sesión hoy, y aquí eso mostraría el lunes como si fuera "hoy" en
    // un día de descanso real. Solo se sustituye getTodaySession() cuando
    // el usuario ha elegido otro día de verdad en Inicio (botón "Cambiar").
    const runningSession = getState().homeSelectedWorkout ?? getTodaySession();

    // La fecha que de verdad se está mirando -- la del día elegido a mano
    // (si lo hay) o hoy. El gimnasio se comprueba para ESA fecha, no
    // siempre "hoy a secas", para que "Cambiar" siga siendo coherente con
    // Plan también al previsualizar otro día con running planificado.
    const effectiveDate = runningSession?.date ?? formatISODate(new Date());
    const gymMatch = getGymDayForDate(effectiveDate);

    const cards = [];
    if (runningSession) cards.push(SessionCard(runningSession));
    if (gymMatch) cards.push(GymTodayCard(gymMatch));

    if (cards.length === 0) {
        return `<section class="master-card">${EmptySessionCard()}</section>`;
    }

    return `<section class="master-card">${cards.join("")}</section>`;

}