import { formatSecondsAsClock } from "../../utils/format.js";

// Tarjeta de insight sobre la lista de entrenos (distinta del insight de
// progreso de RunningTypeSummary, que solo compara ritmo dentro de un
// tipo). Solo queda una variante (mejor ritmo) -- la de conteo+km del mes
// (2026-09-24) y la de % de zapatilla más usada (2026-09-24, a petición de
// Rafa: "Tus Asics concentran tu kilometraje" no aportaba nada que no se
// pudiera ver ya en Kilometraje de zapatillas, un poco más abajo en la
// misma pantalla) se quitaron las dos. dayOfYear()/variants[] se dejan tal
// cual (aunque con 1 sola variante la rotación no hace nada) por si vuelve
// a hacer falta rotar entre varias -- nunca se rellena un hueco con una
// cifra inventada si la variante no tiene dato real.
function dayOfYear(date) {

    const start = new Date(date.getFullYear(), 0, 0);
    return Math.floor((date - start) / 86400000);

}

// Mejor ritmo real dentro del conjunto filtrado -- mismo dato que ya
// muestra la tarjeta de resumen (bestPaceSecPerKm), repetido aquí.
function bestPaceVariant(filteredWorkouts) {

    const paces = filteredWorkouts.map(w => w.avgPaceSecPerKm).filter(v => v != null);
    if (!paces.length) return null;

    const best = Math.min(...paces);

    return {
        icon: "solar:cup-star-bold-duotone",
        text: `Tu mejor ritmo hasta ahora es ${formatSecondsAsClock(best)}/km.`
    };

}

// null si ninguna variante tiene datos reales -- el llamador no debe
// pintar nada en ese caso, nunca un texto de relleno.
export function buildListInsight({ filteredWorkouts, now = new Date() }) {

    const variants = [
        bestPaceVariant(filteredWorkouts)
    ].filter(Boolean);

    if (!variants.length) return null;

    return variants[dayOfYear(now) % variants.length];

}
