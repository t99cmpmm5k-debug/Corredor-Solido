import { isToday, formatWeekday } from "./date.js";

// Etiqueta corta por tipo de sesión -- a diferencia de TYPE_LABEL de
// antes ("un rodaje", "la tirada larga"), esta va pegada a un número de
// km en una frase de una sola línea ("8 km Z2", "13 km de tirada
// larga"), así que tiene que leerse igual de bien ahí que sola.
const SHORT_TYPE_LABEL = {
    longRun:"tirada larga",
    z2:"Z2",
    intervals:"series",
    tempo:"tempo",
    strength:"fuerza",
    recovery:"descanso",
    race:"carrera",
    free:"libre",
    generic:"entreno"
};

function shortLabelFor(session) {
    return SHORT_TYPE_LABEL[session.type] ?? session.title?.toLowerCase() ?? "sesión";
}

// Formato "entrenador" (fase 3 del pulido de densidad, 2026-08-26):
// una frase corta por línea, sin la coletilla interpretativa de antes
// ("ahí está la mitad de la semana...") ni el "Llevas X de Y km" inicial
// -- ese dato ya lo muestra el anillo de WeekSummary.js justo encima,
// repetirlo en texto era ruido. Solo queda lo accionable: qué toca hoy y,
// si hay una sesión más relevante más adelante en la semana, cuál y
// cuándo. Sigue devolviendo "" si no hay datos reales que sustenten
// ninguna de las dos frases (mismo criterio de siempre).
export function buildWeekInsight(week, { goal }) {

    if (!week?.length || goal <= 0) return "";

    const todayIndex = week.findIndex(session => isToday(session.date));
    const todaySession = todayIndex >= 0 ? week[todayIndex] : week[0];
    const fromToday = todayIndex >= 0 ? week.slice(todayIndex) : week;

    const keySession = fromToday
        .filter(session => session.status !== "completed" && session.volume > 0)
        .sort((a, b) => b.volume - a.volume)[0] ?? null;

    const keyIsToday = keySession?.date === todaySession.date;

    const parts = [];

    // "Hoy: ..." solo cuando hay algo concreto que decir -- una sesión
    // con km reales, o un tipo sin km pero igual de real (fuerza/
    // descanso/libre). Una sesión de running sin volumen ni esos tres
    // tipos (dato incompleto) no genera esta línea, nunca un "Hoy: 0 km".
    if (todaySession.volume > 0) {
        parts.push(`Hoy: ${todaySession.volume} km ${shortLabelFor(todaySession)}.`);
    } else if (["strength", "recovery", "free"].includes(todaySession.type)) {
        parts.push(`Hoy: ${shortLabelFor(todaySession)}.`);
    }

    if (keySession && !keyIsToday) {
        parts.push(`El ${formatWeekday(keySession.date)}, ${keySession.volume} km de ${shortLabelFor(keySession)}.`);
    }

    return parts.join(" ");

}
