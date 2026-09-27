import { formatISODate } from "./date.js";

// Etiqueta corta por tipo de sesión -- a diferencia de TYPE_LABEL de
// antes ("un rodaje", "la tirada larga"), esta va delante de un número de
// km en una frase de una sola línea ("Z2 · 8 km", "tirada larga · 13
// km"), así que tiene que leerse igual de bien ahí que sola.
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

// Formato "entrenador" (fase 3 del pulido de densidad, 2026-08-25):
// una frase corta por línea, sin la coletilla interpretativa de antes
// ("ahí está la mitad de la semana...") ni el "Llevas X de Y km" inicial
// -- ese dato ya lo muestra el anillo de WeekSummary.js justo encima,
// repetirlo en texto era ruido. Solo queda lo accionable: qué toca hoy y,
// si hay una sesión más relevante más adelante en la semana, cuál y
// cuándo. Sigue devolviendo "" si no hay datos reales que sustenten
// ninguna de las dos frases (mismo criterio de siempre).
//
// Corrección de coherencia 2026-08-26: antes "hoy" se resolvía por
// POSICIÓN en el array (todayIndex/week[0]) -- sin running programado
// hoy, eso mostraba silenciosamente la sesión de OTRO día como si fuera
// la de hoy (p. ej. el lunes, en un jueves de descanso real). Ahora se
// filtra por FECHA real, nunca por posición, y un día sin running pero
// con gimnasio programado (todayGymMatch, ver getGymDayForDate() en
// gymTimelineBridge.js -- misma fuente que Plan) lo dice explícitamente
// en vez de omitirlo o inventar otro día.
// referenceDate inyectable (igual que buildRestDayHero()/
// parseForecastHours() en otros sitios de la app) para poder testear
// "hoy" de forma determinista, sin depender del reloj real de quien
// ejecute los tests.
//
// Ajuste de Inicio 2026-09-27: se quita la segunda frase de "sesión
// clave" ("Domingo: tirada larga · 15 km.") -- la misma tarjeta ya
// muestra debajo "Próximo: TIRADA LARGA · 15 km · Domingo" (buildNextUp()
// en Home.js) y en pantalla salía la misma sesión dos veces seguidas.
// Aquí queda solo lo de HOY; lo que viene después es cosa de "Próximo".
export function buildWeekInsight(week, { goal, todayGymMatch = null, referenceDate = new Date() } = {}) {

    if (!week?.length || goal <= 0) return "";

    const todayISO = formatISODate(referenceDate);

    const todaySession = week.find(session => session.date === todayISO) ?? null;

    const parts = [];

    // "Hoy: ..." solo con piezas concretas y REALES -- running (km, o el
    // tipo si no lleva km pero es igual de real: fuerza/descanso/libre/
    // series) Y gimnasio se combinan con "+" si Plan tiene programados los dos a la
    // vez ("Hoy: 8 km Z2 + Pierna (gimnasio)."), nunca mostrando solo uno
    // como si el otro no existiera. Sin ninguna pieza real, se omite del
    // todo -- nunca "Hoy: 0 km" ni el día equivocado.
    const todayParts = [];

    if (todaySession?.volume > 0) {
        todayParts.push(`${shortLabelFor(todaySession)} · ${todaySession.volume} km`);
    } else if (todaySession && ["strength", "recovery", "free", "intervals"].includes(todaySession.type)) {
        // "intervals" (series) se une aquí en esta ronda -- un día de
        // series real casi nunca trae distanceKm (se mide en repeticiones/
        // tiempo, no en km totales), así que exigir volume>0 lo omitía
        // en silencio aunque fuera un entreno real de hoy. z2/tempo/
        // longRun se quedan fuera a propósito: para esos tipos, 0 km sí
        // suele significar un dato roto/placeholder, no un entreno real.
        todayParts.push(shortLabelFor(todaySession));
    }

    if (todayGymMatch) {
        todayParts.push(`${todayGymMatch.day.title} · Gym`);
    }

    if (todayParts.length) {
        parts.push(`Hoy: ${todayParts.join(" + ")}.`);
    }


    return parts.join(" ");

}
