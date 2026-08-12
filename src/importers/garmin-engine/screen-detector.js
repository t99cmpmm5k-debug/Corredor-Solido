import * as U from "./garmin-utils.js";

export function detect(text) {
    const n = U.normalize(text);

    if (/\bresumen\b/.test(n) && /anadir notas|añadir notas/.test(n)) {
        return { type: "summary", confidence: .99 };
    }

    // Pantalla "Intervalos" de un Entrenamiento en pista (Carrera/Recuperación
    // por tramo). "intervalos" solo también está en la barra de pestañas de
    // Resumen/Estadísticas de esa misma actividad — se exige además al menos
    // una fila real con forma de Carrera (nº + tiempo + distancia en metros
    // + ritmo), el mismo patrón que usa parser-intervals.js para leerlas.
    if (/\bintervalos\b/.test(n) && /\brecuperacion\b/.test(n) && /\b[0-9]{1,2}\s+carrera\s+[0-9]{1,2}:[0-5][0-9](?:[.,][0-9]+)?\s+[0-9]{1,4}\s+[0-9]{1,2}:[0-5][0-9]\b/.test(n)) {
        return { type: "intervals", confidence: .97 };
    }

    // "estadisticas" solo no basta — esa palabra aparece en la barra de
    // pestañas de CUALQUIER pantalla (Vueltas, Gráficos, Equipo...), no
    // solo en la propia pantalla de Estadísticas. Igual que "resumen"
    // exige "añadir notas" a su lado, aquí se exige alguna etiqueta real
    // de esa pantalla (las mismas que busca extractor-engine.js).
    if (/\bestadisticas\b/.test(n) && /distancia recorrida|distancia real|frecuencia cardiaca|cadencia media|temperatura media|ascenso total|desnivel positivo|calorias totales|calorias activas|tiempo total|duracion total/.test(n)) {
        return { type: "statistics", confidence: .98 };
    }

    // Mismo problema que "estadisticas": "vueltas" también está en la
    // barra de pestañas de cualquier captura. Se exige además al menos
    // una fila con forma de vuelta real (nº + distancia + ritmo) — el
    // mismo patrón que usa parser-splits.js para leerlas.
    if (/\bvueltas\b/.test(n) && /\b[0-9]{1,2}\s+[0-9]{1,3}[,.][0-9]{1,2}\s*(?:km)?\s+[0-9]{1,2}:[0-5][0-9]/.test(n)) {
        return { type: "splits", confidence: .97 };
    }

    return { type: "unknown", confidence: .35 };
}
