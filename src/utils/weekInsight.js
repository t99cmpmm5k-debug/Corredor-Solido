import { isToday, formatWeekday } from "./date.js";

// Etiqueta natural por tipo de sesión, para construir frases legibles.
const TYPE_LABEL = {
    long:"la tirada larga",
    easy:"un rodaje",
    series:"series",
    gym:"fuerza",
    rest:"descanso",
    free:"día libre"
};

function labelFor(session) {
    return TYPE_LABEL[session.type] ?? session.title.toLowerCase();
}

// Coletilla según cuánto pesa esa sesión sobre el objetivo semanal.
function tailFor(proportion) {
    if (proportion >= 0.45) return " — ahí está la mitad de la semana.";
    if (proportion >= 0.25) return " — el tramo más exigente de lo que queda.";
    return ".";
}

// Genera la frase de interpretación de la semana a partir de datos reales:
// km completados vs objetivo, qué sesión pesa más en lo que queda, y qué
// toca hoy. Si falta alguna pieza, esa parte se omite — nada de texto fijo.
export function buildWeekInsight(week, { completed, goal }) {

    if (!week?.length || goal <= 0) return "";

    const todayIndex = week.findIndex(session => isToday(session.date));
    const todaySession = todayIndex >= 0 ? week[todayIndex] : week[0];
    const fromToday = todayIndex >= 0 ? week.slice(todayIndex) : week;

    const keySession = fromToday
        .filter(session => session.status !== "completed" && session.volume > 0)
        .sort((a, b) => b.volume - a.volume)[0] ?? null;

    const keyIsToday = keySession?.date === todaySession.date;

    const parts = [`Llevas ${completed} de ${goal} km.`];

    if (keySession && !keyIsToday) {
        const proportion = keySession.volume / goal;
        parts.push(`El ${formatWeekday(keySession.date)} tienes ${labelFor(keySession)} de ${keySession.volume} km${tailFor(proportion)}`);
    }

    if (keyIsToday) {

        const proportion = keySession.volume / goal;
        parts.push(`Hoy toca ${labelFor(todaySession)} de ${todaySession.volume} km${tailFor(proportion)}`);

    } else if (todaySession.volume > 0) {

        parts.push(`Hoy toca ${labelFor(todaySession)} de ${todaySession.volume} km.`);

    } else if (todaySession.type === "gym") {

        parts.push(`Hoy toca ${labelFor(todaySession)}: no suma kilómetros, pero suma.`);

    } else {

        const hasFutureKey = Boolean(keySession);
        parts.push(hasFutureKey
            ? `Hoy toca ${labelFor(todaySession)}, así que guarda fuerzas.`
            : `Hoy toca ${labelFor(todaySession)}.`);

    }

    return parts.join(" ");

}
