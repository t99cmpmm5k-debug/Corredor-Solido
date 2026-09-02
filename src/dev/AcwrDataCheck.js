// TEMPORAL - QUITAR CUANDO SE CIERRE EL DIAGNÓSTICO DE ACWR
// Tarjeta de solo lectura en Perfil para confirmar, desde el propio
// dispositivo (sin devtools ni Mac), cuántas semanas reales de histórico
// hay con datos aprovechables para carga aguda/crónica (ACWR) -- no
// calcula ninguna carga todavía, solo cuenta lo que ya existe en
// IndexedDB. Quitar el import/uso en Profile.js y este archivo en cuanto
// se decida si hay suficiente historial para diseñar la fórmula de verdad.

import { getWorkouts } from "../data/workoutStore.js";
import { getGymSessions } from "../data/gymSessionStore.js";

function daysBetween(a, b) {

    if (!a || !b) return null;

    return Math.round((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24));

}

function computeStats() {

    const workouts = getWorkouts();
    const gymSessions = getGymSessions();

    const runDates = workouts.map(w => w.date).filter(Boolean).sort();
    const runWithHr = workouts.filter(w => w.avgHr != null).length;

    // Mismo criterio que getAverageDurationForDay() en gymSessionStore.js:
    // solo sesiones terminadas con reloj fiable cuentan como "duración real".
    const reliableGym = gymSessions.filter(g => g.durationSec != null && !g.durationUnreliable);
    const gymDates = reliableGym.map(g => g.date).filter(Boolean).sort();

    return {

        running: {
            count: workouts.length,
            withHr: runWithHr,
            first: runDates[0] || null,
            last: runDates[runDates.length - 1] || null,
            spanDays: daysBetween(runDates[0], runDates[runDates.length - 1])
        },

        gym: {
            count: gymSessions.length,
            withReliableDuration: reliableGym.length,
            first: gymDates[0] || null,
            last: gymDates[gymDates.length - 1] || null,
            spanDays: daysBetween(gymDates[0], gymDates[gymDates.length - 1])
        }

    };

}

function row(label, value) {

    return `<div class="acwr-check-row"><span>${label}</span><strong>${value}</strong></div>`;

}

export function AcwrDataCheckCard() {

    const stats = computeStats();

    return `

        <section class="profile-backup-card acwr-check-card">

            <h3>Diagnóstico ACWR (temporal)</h3>

            <p class="profile-backup-note">
                Solo cuenta lo que ya hay guardado en este dispositivo -- no calcula ninguna carga todavía.
            </p>

            <p class="acwr-check-group-title">Running</p>

            ${row("Entrenos totales", stats.running.count)}
            ${row("Con FC media real", stats.running.withHr)}
            ${row("Primer entreno", stats.running.first || "—")}
            ${row("Último entreno", stats.running.last || "—")}
            ${row("Rango cubierto", stats.running.spanDays != null ? `${stats.running.spanDays} días` : "—")}

            <p class="acwr-check-group-title">Gimnasio</p>

            ${row("Sesiones totales", stats.gym.count)}
            ${row("Con duración fiable", stats.gym.withReliableDuration)}
            ${row("Primera sesión", stats.gym.first || "—")}
            ${row("Última sesión", stats.gym.last || "—")}
            ${row("Rango cubierto", stats.gym.spanDays != null ? `${stats.gym.spanDays} días` : "—")}

        </section>

    `;

}
