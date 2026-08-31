import * as U from "./garmin-utils.js";

// Cuenta líneas con dos tokens seguidos de 2-3 dígitos (p. ej. "140 152",
// el cuerpo de una tabla de FC) -- por token separado por espacio, no por
// un \b suelto sobre la línea entera: "5:34" no debe contar como si "34"
// fuera un número de columna real solo porque hay un límite de palabra
// entre ":" y "3" (mismo problema que ya se corrigió en parser-splits.js).
function countNumericPairRows(text) {

    const isHrShaped = token => /^[0-9]{2,3}$/.test(token);

    return text.split("\n").filter(line => {
        const tokens = line.trim().split(/\s+/);
        return tokens.some((token, i) => isHrShaped(token) && isHrShaped(tokens[i + 1] || ""));
    }).length;

}

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

    // Pantalla "Intervalos" de una Carrera normal (no en pista): misma
    // familia que la de arriba (filtro "Seleccionar tipo de paso"), pero
    // para una actividad sin tramos de Recuperación que filtrar -- solo
    // trae los chips "Todos"/"Carrera", nunca la palabra "recuperacion",
    // así que la rama de arriba no la reconoce. Sus columnas coinciden
    // letra a letra con las de la tabla de Vueltas desplazada a la FC (ver
    // parser-splits.js) -- sin este chequeo ANTES de esa rama, esta
    // pantalla caía ahí y cada fila (bloque real Y submuestra de ~1 km) se
    // numeraba por igual como si fuera una vuelta. Confirmado con 5
    // capturas reales de un mismo entreno (11 km + 2,02 km) que la fila con
    // número en "Int." SÍ es un agregado real por bloque (Tipo/Tiempo/
    // Distancia/Ritmo medio/FC media/FC máx., ya calculado por Garmin) y
    // las filas sin número son sus submuestras de 1 km -- ver
    // parser-intervals-road.js, que solo usa las primeras.
    if (/seleccionar tipo de paso/.test(n)) {
        return { type: "intervals-road", confidence: .9 };
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

    // Misma pantalla de Vueltas pero desplazada a la derecha para ver la FC
    // por vuelta — el conjunto de columnas visible varía según hasta dónde
    // se deslice la tabla (a veces GAP medio, a veces Ascenso/Descenso, a
    // veces ninguna de las dos: verificado contra tres capturas reales
    // distintas), y la captura suele venir recortada justo a la tabla, sin
    // la palabra "vueltas" visible. No se exige ninguna columna concreta
    // aparte de la propia FC — solo su cabecera, más varias filas con dos
    // números seguidos en rango de pulsaciones (el cuerpo de la tabla) para
    // no confundirla con la etiqueta suelta "Frecuencia cardíaca media" que
    // también aparece como una única estadística en Resumen/Estadísticas
    // (esas pantallas ya se identifican antes, más arriba, así que solo
    // hace falta este resguardo para una captura que no traiga ninguna de
    // sus etiquetas propias). Ver parser-splits.js.
    if (
        (/frecuencia cardiaca media/.test(n) || /frec\.? cardiaca max/.test(n))
        && countNumericPairRows(n) >= 2
    ) {
        return { type: "splits", confidence: .96 };
    }

    // Última red para "Intervalos" de una Carrera normal: capturas
    // recortadas a la vista Int./Tipo/Tiempo/Distancia/Ritmo medio (sin el
    // filtro "Seleccionar tipo de paso" visible, ver arriba, porque la
    // tabla venía desplazada hacia abajo) no traen ninguna etiqueta propia
    // de FC ni de Vueltas -- la única señal que les queda es la barra de
    // pestañas de la app, que dice "Intervalos" en vez de "Vueltas" (misma
    // barra que usa la rama de pista, más arriba). Se deja como ÚLTIMO
    // recurso, después de estadísticas/splits: esa misma barra de pestañas
    // aparece también en capturas de Resumen/Estadísticas/Gráficos/Equipo
    // de una actividad de este tipo, así que solo debe ganar cuando
    // ninguna etiqueta más específica de esas pantallas identificó ya la
    // captura.
    if (/\bintervalos\b/.test(n)) {
        return { type: "intervals-road", confidence: .75 };
    }

    return { type: "unknown", confidence: .35 };
}
