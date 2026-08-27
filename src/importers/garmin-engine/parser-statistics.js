import * as U from "./garmin-utils.js";
import * as E from "./extractor-engine.js";

// Bloque "TRAINING EFFECT" real: vive DENTRO de la propia pantalla
// Estadísticas (confirmado 2026-08-27 contra una captura real completa,
// no una pantalla aparte) -- "Aeróbica"/"Anaeróbico" aparecen dos veces en
// el texto real (una vez en la etiqueta "Beneficio principal Base
// (Aeróbica baja)", otra en la fila con el número), pero U.around() busca
// un valor numérico en las líneas cercanas a CUALQUIERA de las dos
// coincidencias, así que encuentra el número real sin confundirlo con la
// etiqueta de beneficio. Verificado con esa captura real: aerobic=3,6,
// anaerobic=0,0, load=117.
function findNumber(text, labelRegex, valueRegex) {
    const lines = U.linesOf(text);
    return U.around(lines, labelRegex, valueRegex, 3);
}

export function parse(text) {
    const raw = U.cleanText(text);
    const fields = {};

    const distance = E.distance(raw);
    const avgHr = E.avgHeartRate(raw);
    const maxHr = E.maxHeartRate(raw);
    const pace = E.avgPace(raw);
    const total = E.totalTime(raw);
    const calories = E.calories(raw);
    const cadence = E.cadence(raw);
    const maxCadence = E.maxCadence(raw);
    const temp = E.temperature(raw);
    const elevation = E.elevation(raw);

    const aerobicEffect = findNumber(raw, /aerobica|efecto aerobico/, /\b([0-5](?:[,.][0-9])?)\b/);
    const anaerobicEffect = findNumber(raw, /anaerobico|efecto anaerobico/, /\b([0-5](?:[,.][0-9])?)\b/);
    const exerciseLoad = findNumber(raw, /carga de ejercicio/, /\b([0-9]{1,4})\b/);

    fields.source = U.field("Garmin", "Pantalla Estadísticas", .99);
    fields.screen_type = U.field("statistics", "Estadísticas", .98);
    fields.distance_km = U.field(distance?.value ?? null, distance?.source, distance?.confidence || 0);
    fields.avg_heart_rate_bpm = U.field(avgHr?.value ?? null, avgHr?.source, avgHr?.confidence || 0);
    fields.max_heart_rate_bpm = U.field(maxHr?.value ?? null, maxHr?.source, maxHr?.confidence || 0);
    fields.avg_pace_min_km = U.field(pace?.value ?? null, pace?.source, pace?.confidence || 0);
    fields.total_time = U.field(total?.value ?? null, total?.source, total?.confidence || 0);
    fields.calories_kcal = U.field(calories?.value ?? null, calories?.source, calories?.confidence || 0);
    fields.cadence_spm = U.field(cadence?.value ?? null, cadence?.source, cadence?.confidence || 0);
    fields.max_cadence_spm = U.field(maxCadence?.value ?? null, maxCadence?.source, maxCadence?.confidence || 0);
    fields.temperature_c = U.field(temp?.value ?? null, temp?.source, temp?.confidence || 0);
    fields.elevation_gain_m = U.field(elevation?.value ?? null, elevation?.source, elevation?.confidence || 0);
    fields.training_effect_aerobic = U.field(aerobicEffect ? U.num(aerobicEffect.match[1]) : null, aerobicEffect?.source ?? null, aerobicEffect ? .9 : 0);
    fields.training_effect_anaerobic = U.field(anaerobicEffect ? U.num(anaerobicEffect.match[1]) : null, anaerobicEffect?.source ?? null, anaerobicEffect ? .9 : 0);
    fields.exercise_load = U.field(exerciseLoad ? U.num(exerciseLoad.match[1]) : null, exerciseLoad?.source ?? null, exerciseLoad ? .9 : 0);

    return { parser: "statistics-v4-engine", fields };
}
