// Orden de los bloques movibles de Inicio (ver Home.js) -- Hero y
// "Entrenamiento de hoy" (MasterCard) van siempre primero en los dos
// casos, nunca se reordenan: son el ancla de la pantalla. Lo que cambia
// es dónde cae el Tiempo respecto a Esta semana/Próximo objetivo/Km del
// mes.
//
// De día (antes de la ventana nocturna) el Tiempo va justo después del
// entreno de hoy -- tiene sentido consultarlo antes de salir a correr.
// De noche ya no aporta nada de cara a "salir ahora", así que baja al
// final, casi como un dato de consulta para mañana, y el resto de
// bloques (más urgentes: qué toca esta semana, la próxima carrera, el
// resumen del mes) sube.
//
// NIGHT_HOUR es un umbral de diseño (20:00, "después de trabajar/cenar,
// ya no vas a mirar el tiempo antes de correr hoy"), no un dato del
// pronóstico -- reabierto explícitamente por el usuario en esta ronda
// tras haberse fijado como "sin cambios" en la ronda anterior.
export const NIGHT_HOUR = 20;

export function isDaytimeWindow(now = new Date()) {
    return now.getHours() < NIGHT_HOUR;
}

// Claves de los 4 bloques movibles, en el orden en que Home.js debe
// pintarlos -- cada uno se omite solo si no tiene nada real que mostrar
// (ver Home.js), nunca se salta uno por el mero hecho de reordenar.
export function getHomeSectionOrder(now = new Date()) {

    return isDaytimeWindow(now)
        ? ["weather", "week", "goal", "km"]
        : ["week", "goal", "km", "weather"];

}
