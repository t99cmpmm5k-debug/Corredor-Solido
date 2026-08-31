import * as U from "./garmin-utils.js";

// Pantalla "Intervalos" de una Carrera normal (ver screen-detector.js para
// por qué se reconoce aparte de "splits"/"intervals"). Deliberadamente no
// extrae ninguna vuelta: sin columna de distancia no hay forma fiable de
// saber cuánto mide cada fila, así que construir un split de 1 km por fila
// sería inventar un dato que Garmin no está dando. Se deja el screen_type
// identificado (en vez de "unknown") para que el diagnóstico diga "pantalla
// reconocida, sin soportar" en lugar de "no reconocida".
export function parse() {
    return {
        parser: "intervals-road-unsupported-v1",
        fields: {
            source: U.field("Garmin", "Pantalla Intervalos (Carrera)", .99),
            screen_type: U.field("intervals-road", "Intervalos (Carrera)", .9)
        },
        extras: { laps: [] }
    };
}
