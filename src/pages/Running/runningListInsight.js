import { formatSecondsAsClock, formatShoeName } from "../../utils/format.js";

// Tarjeta de insight rotatorio sobre la lista de entrenos (distinta del
// insight de progreso de RunningTypeSummary, que solo compara ritmo
// dentro de un tipo) — cada variante se calcula con datos reales o no
// entra en la rotación; nunca se rellena un hueco con una cifra inventada.
// El día del año decide cuál se ve (estable durante el mismo día, cambia
// al día siguiente), sobre las variantes que de verdad tengan dato ese
// momento -- con una sola variante disponible, se ve siempre esa.
function dayOfYear(date) {

    const start = new Date(date.getFullYear(), 0, 0);
    return Math.floor((date - start) / 86400000);

}

// Mejor ritmo real dentro del conjunto filtrado -- mismo dato que ya
// muestra la tarjeta de resumen (bestPaceSecPerKm), repetido aquí como
// una de las variantes posibles de rotación, nunca inventado aparte.
function bestPaceVariant(filteredWorkouts) {

    const paces = filteredWorkouts.map(w => w.avgPaceSecPerKm).filter(v => v != null);
    if (!paces.length) return null;

    const best = Math.min(...paces);

    return {
        icon: "solar:cup-star-bold-duotone",
        text: `Tu mejor ritmo hasta ahora es ${formatSecondsAsClock(best)}/km.`
    };

}

// % real del kilometraje TOTAL (todos los tipos, no solo el filtro activo
// -- el kilometraje de una zapatilla no depende de qué tipo de entreno se
// esté mirando ahora) que concentra la zapatilla más usada. Km por
// zapatilla calculados aquí mismo a partir de `allWorkouts` (el mismo
// conjunto que ya pasa Running.js) en vez de leer getShoeTotalKm() del
// store real -- misma cifra en producción (Running.js siempre pasa
// getWorkouts() como allWorkouts), pero sin depender de un estado global
// mutable para poder testear esta función con datos de mentira.
function topShoeShareVariant(allWorkouts, shoes) {

    if (!shoes.length) return null;

    const totalKm = allWorkouts.reduce((sum, w) => sum + (w.distanceKm || 0), 0);
    if (totalKm <= 0) return null;

    const kmByShoeId = {};
    allWorkouts.forEach(w => {
        if (!w.shoeId) return;
        kmByShoeId[w.shoeId] = (kmByShoeId[w.shoeId] || 0) + (w.distanceKm || 0);
    });

    let top = null;

    shoes.forEach(shoe => {

        const km = kmByShoeId[shoe.id] || 0;
        if (km > 0 && (!top || km > top.km)) top = { shoe, km };

    });

    if (!top) return null;

    const percent = Math.round((top.km / totalKm) * 100);

    return {
        icon: "solar:running-round-bold-duotone",
        text: `Tus ${formatShoeName(top.shoe)} concentran el ${percent}% de tu kilometraje.`
    };

}

// null si ninguna variante tiene datos reales suficientes -- el llamador
// no debe pintar nada en ese caso, nunca un texto de relleno.
//
// La variante de conteo+km del mes en curso ("Llevas X entrenos y X km
// acumulados este mes") se quitó de la rotación (2026-09-24, pulido de
// Running): con el filtro "Todos" activo repetía tal cual el mismo dato
// que ya muestra MonthlyKmWidget.js en Inicio (misma fuente, getWorkouts()
// -- ver monthlyKm.js). Solo con un tipo concreto seleccionado aportaba
// algo que Inicio no tiene (el total del mes SOLO de ese tipo), pero es un
// matiz que solo se veía 1 de cada 3 días de rotación y con un filtro
// activo -- no compensaba mantener una tercera variante para eso.
export function buildListInsight({ filteredWorkouts, allWorkouts, shoes, now = new Date() }) {

    const variants = [
        bestPaceVariant(filteredWorkouts),
        topShoeShareVariant(allWorkouts, shoes)
    ].filter(Boolean);

    if (!variants.length) return null;

    return variants[dayOfYear(now) % variants.length];

}
