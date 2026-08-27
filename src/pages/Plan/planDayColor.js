// Sistema de color con significado fijo (fase 2 del pulido de Plan,
// 2026-08-27): antes el color era 100% por TIPO (z2 siempre verde, tempo
// siempre azul...), bonito pero sin comunicar de un vistazo "¿esto lo he
// hecho ya?". Ahora el color por defecto es de ESTADO -- azul =
// pendiente, verde = realizado, gris = descanso -- y solo dos tipos
// concretos (series/intervals, tirada larga/longRun) mantienen un color
// fijo propio, porque señalar "esto es un día de series" de un vistazo
// importa más que su estado para esos dos tipos en concreto (decisión
// explícita del usuario, no un criterio inventado).
//
// Módulo aparte (ni PlanTimeline.js ni TimelineDay.js) para que ambos
// puedan importarlo sin depender el uno del otro -- TimelineDay ya es un
// hijo de PlanTimeline, y PlanMonthCalendar.js también lo necesita para
// sus marcadores del mes, con la misma fuente de verdad en los tres
// sitios.
export function resolveDayColorKey(session) {

    if (session.isRest) return "rest";
    if (session.type === "intervals") return "series";
    if (session.type === "longRun") return "longrun";
    return session.status === "completed" ? "completed" : "pending";

}

const COLOR_BY_KEY = {
    pending: "var(--color-primary)",
    completed: "var(--color-success)",
    rest: "var(--color-text-muted)",
    series: "#ff7a33",
    longrun: "var(--color-warning)"
};

// Color real (no solo la clave) para quien no necesita una clase CSS --
// PlanMonthCalendar.js pinta sus marcadores con un color inline, y
// PlanTimeline.js construye el degradado de la línea con colores reales,
// ninguno de los dos puede depender de las reglas .day-color-* de
// TimelineDay.css.
export function resolveDayColor(session) {
    return COLOR_BY_KEY[resolveDayColorKey(session)];
}
