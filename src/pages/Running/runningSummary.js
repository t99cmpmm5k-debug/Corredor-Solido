function average(values) {
    return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// Resumen del filtro activo (o de todo, si no hay filtro) — recibe la
// lista YA filtrada por tipo, la misma que se usa para pintar el
// historial, para no duplicar ese filtro aquí. null si no hay ningún
// entreno — el llamador debe mostrar el estado vacío en su lugar, no un
// resumen con guiones por todas partes.
export function buildTypeSummary(filteredWorkouts) {

    if (!filteredWorkouts || filteredWorkouts.length === 0) return null;

    // Ritmo medio = tiempo total ÷ distancia total, no la media
    // aritmética de los ritmos por entreno — un promedio de promedios
    // pesaría igual una tirada de 3 km que una de 20 km.
    const withDistanceAndDuration = filteredWorkouts.filter(
        w => w.distanceKm > 0 && w.durationSec != null
    );
    const totalKm = withDistanceAndDuration.reduce((sum, w) => sum + w.distanceKm, 0);
    const totalDurationSec = withDistanceAndDuration.reduce((sum, w) => sum + w.durationSec, 0);
    const avgPaceSecPerKm = totalKm > 0 ? Math.round(totalDurationSec / totalKm) : null;

    const hrValues = filteredWorkouts.map(w => w.avgHr).filter(v => v != null);
    const avgHr = hrValues.length ? Math.round(average(hrValues)) : null;

    const paceValues = filteredWorkouts.map(w => w.avgPaceSecPerKm).filter(v => v != null);
    const bestPaceSecPerKm = paceValues.length ? Math.min(...paceValues) : null;

    return {
        count: filteredWorkouts.length,
        avgPaceSecPerKm,
        avgHr,
        bestPaceSecPerKm
    };

}
