// Sistema de color con significado fijo (fase 2 del pulido de Plan,
// 2026-08-27): antes el color era 100% por TIPO (z2 siempre verde, tempo
// siempre azul...), bonito pero sin comunicar de un vistazo "¿esto lo he
// hecho ya?". Ahora el color por defecto es de ESTADO -- azul =
// pendiente, verde = realizado, gris = descanso -- y tres tipos
// concretos (series/intervals, tirada larga/longRun, gimnasio/strength)
// mantienen un color fijo propio, porque señalar "esto es un día de
// series" (o de gimnasio) de un vistazo importa más que su estado para
// esos tipos en concreto (decisión explícita del usuario, no un criterio
// inventado). Gimnasio se sumó después (bug real reportado: el indicador
// de gimnasio en el timeline y los días "solo gimnasio" reutilizaban el
// mismo azul que "pendiente" de running -- #2faeff, casi idéntico a
// --color-primary #2EA8FF -- solo distinguibles por el icono a tamaño
// pequeño).
//
// Módulo aparte (ni PlanTimeline.js ni TimelineDay.js) para que ambos
// puedan importarlo sin depender el uno del otro -- TimelineDay ya es un
// hijo de PlanTimeline, y PlanMonthCalendar.js también lo necesita para
// sus marcadores del mes, con la misma fuente de verdad en los tres
// sitios.
//
// Pulido final (2026-10-01): el color pasa a ser por CATEGORÍA mientras la
// sesión está pendiente -- naranja = calidad (series Y tempo), amarillo =
// tirada larga Y carrera, cian (--color-primary) = rodaje/recuperación --
// y "completado" gana sobre todo lo demás (verde), también para series,
// tirada larga y gimnasio: una sesión ya hecha no debe seguir leyéndose
// como "activa" en naranja/cian (antes esos tipos mantenían su color fijo
// incluso completados). Un "free" real (día libre de un plan importado)
// se trata igual que el hueco de descanso.
export function resolveDayColorKey(session) {

    if (session.isRest || session.type === "free") return "rest";
    if (session.status === "completed") return "completed";
    if (session.type === "intervals" || session.type === "tempo") return "series";
    if (session.type === "longRun" || session.type === "race") return "longrun";
    if (session.type === "strength") return "gym";
    return "pending";

}

const COLOR_BY_KEY = {
    pending: "var(--color-primary)",
    completed: "var(--color-success)",
    rest: "var(--color-text-muted)",
    series: "#ff7a33",
    longrun: "var(--color-warning)",
    gym: "var(--color-gym)"
};

// Color real (no solo la clave) para quien no necesita una clase CSS --
// PlanMonthCalendar.js pinta sus marcadores con un color inline, y
// PlanTimeline.js construye el degradado de la línea con colores reales,
// ninguno de los dos puede depender de las reglas .day-color-* de
// TimelineDay.css.
export function resolveDayColor(session) {
    return COLOR_BY_KEY[resolveDayColorKey(session)];
}
