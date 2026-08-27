import "./RunningDetailView.css";

import { formatWeekday, formatDayMonth } from "../../../utils/date.js";
import { formatSecondsAsClock, formatShoeName } from "../../../utils/format.js";
import { RUNNING_WORKOUT_TYPES } from "../../../data/runningWorkoutTypes.js";
import { buildWorkoutComparison, buildWorkoutComparisonMessage } from "../runningProgress.js";

// Garmin cierra la vuelta en curso al parar el cronómetro, así que la
// última entrada de splits suele ser un remanente corto (0.01-0.4 km) con
// un ritmo poco representativo — se descarta del gráfico si es así.
const RESIDUAL_LAP_THRESHOLD_KM = 0.3;

// Un solo split no dice nada sobre si hubo positivo/negativo split.
const MIN_SPLITS_FOR_CHART = 2;

// Escala fija alrededor del ritmo medio (no del propio rango min/max de la
// carrera) — si no, una carrera regular y una irregular se verían igual de
// "montañosas", porque la barra más alta siempre sería la vuelta más rápida.
const PACE_WINDOW_SEC = 45;

const CHART_HEIGHT_PX = 120;
const MIN_BAR_HEIGHT_PX = 4;
const LAP_LABEL_SPACE_PX = 20;
const REFLINE_BOTTOM_PX = LAP_LABEL_SPACE_PX + CHART_HEIGHT_PX / 2;

// Misma idea que PACE_WINDOW_SEC pero para FC: ventana fija alrededor de
// la FC media propia de la carrera, no del rango min/max real.
const HR_WINDOW_BPM = 15;

// El número de ritmo de una columna vive justo encima de su barra (~6px
// más su propia altura de texto). Si el punto de FC de ese mismo km cae a
// una altura parecida a la de la barra, su número (que por defecto vive
// encima del punto) invade esa misma franja y se pisan — verificado
// visualmente con un entreno real. Margen en el mismo eje 0-100 que usan
// barHeightPx()/hrPointPercent(), no en píxeles.
const HR_LABEL_FLIP_MARGIN_PCT = 20;

// Cuánto se aleja el número de FC de su punto al volcarlo hacia abajo, en
// el mismo eje 0-100 — equivalente a los ~22px (8px + alto del texto) que
// ya usa la variante de encima, pero expresado en porcentaje para poder
// recortarlo contra barPct (ver el comentario junto a HR_LABEL_FLIP_MARGIN_PCT).
const HR_VALUE_DROP_PCT = (22 / CHART_HEIGHT_PX) * 100;

function capitalize(text) {

    return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;

}

function chartSplits(workout) {

    const splits = (workout.splits || []).filter(s => s.paceSecPerKm != null);
    if (!splits.length) return [];

    // El heurístico de "vuelta remanente" asume una Vuelta normal cortada a
    // medias al parar el cronómetro — una Recuperación corta de Intervalos
    // (segmentType) es dato real, no un remanente, y nunca debe descartarse
    // por su distancia.
    const last = splits[splits.length - 1];
    const trimmed = last.segmentType == null && last.distanceKm != null && last.distanceKm < RESIDUAL_LAP_THRESHOLD_KM
        ? splits.slice(0, -1)
        : splits;

    return trimmed;

}

function averagePace(workout, splits) {

    // Un entreno de Intervalos mezcla ritmos de Carrera y Recuperación muy
    // distintos entre sí — el ritmo medio de Resumen (workout.avgPaceSecPerKm)
    // también los mezcla, porque la distancia y el tiempo totales de Garmin
    // incluyen el descanso. Aquí interesa el ritmo real del esfuerzo, así
    // que se calcula aparte solo con los tramos de Carrera.
    const workSplits = splits.filter(s => s.segmentType === "work");
    if (workSplits.length) {
        return workSplits.reduce((sum, s) => sum + s.paceSecPerKm, 0) / workSplits.length;
    }

    if (workout.avgPaceSecPerKm != null) return workout.avgPaceSecPerKm;
    if (!splits.length) return null;

    return splits.reduce((sum, s) => sum + s.paceSecPerKm, 0) / splits.length;

}

function barHeightPx(paceSecPerKm, avgPaceRef) {

    const clamped = Math.min(
        Math.max(paceSecPerKm, avgPaceRef - PACE_WINDOW_SEC),
        avgPaceRef + PACE_WINDOW_SEC
    );

    const fraction = (avgPaceRef + PACE_WINDOW_SEC - clamped) / (PACE_WINDOW_SEC * 2);

    return Math.max(MIN_BAR_HEIGHT_PX, fraction * CHART_HEIGHT_PX);

}

function averageHr(workout, splits) {

    if (workout.avgHr != null) return workout.avgHr;

    const values = splits.map(s => s.avgHr).filter(v => v != null);
    if (!values.length) return null;

    return values.reduce((sum, v) => sum + v, 0) / values.length;

}

// % vertical (0 = abajo del todo, 100 = arriba del todo) dentro de la
// misma zona donde crecen las barras — FC alta sube, igual que un ritmo
// rápido sube en barHeightPx(), para que las dos series "suban" cuando
// hay más esfuerzo y se lean con el mismo lenguaje visual.
export function hrPointPercent(avgHr, avgHrRef) {

    const clamped = Math.min(
        Math.max(avgHr, avgHrRef - HR_WINDOW_BPM),
        avgHrRef + HR_WINDOW_BPM
    );

    const fraction = (clamped - (avgHrRef - HR_WINDOW_BPM)) / (HR_WINDOW_BPM * 2);

    return fraction * 100;

}

// Agrupa los splits con FC válida en tramos contiguos — cada hueco
// (sensor perdido, o split sin FC porque viene de Garmin OCR) cierra el
// tramo anterior en vez de dejar que la línea salte por encima
// interpolando un dato que no existe.
export function hrSegments(splits) {

    const segments = [];
    let current = [];

    splits.forEach((split, index) => {

        if (split.avgHr == null) {
            if (current.length) segments.push(current);
            current = [];
            return;
        }

        current.push({ index, avgHr: split.avgHr });

    });

    if (current.length) segments.push(current);

    return segments;

}

function RunningHrOverlay(splits, avgHrRef, avgPaceRef) {

    const segments = hrSegments(splits);
    if (!segments.length) return "";

    const xPercent = index => ((index + 0.5) / splits.length) * 100;
    const point = p => ({ x: xPercent(p.index), y: hrPointPercent(p.avgHr, avgHrRef) });

    const lines = segments
        .filter(seg => seg.length >= 2)
        .map(seg => `<polyline class="pace-chart-hr-line" points="${seg.map(p => {
            const { x, y } = point(p);
            return `${x},${100 - y}`;
        }).join(" ")}" />`)
        .join("");

    const dots = segments.flat().map(p => {
        const { x, y } = point(p);
        return `<span class="pace-chart-hr-dot" style="left:${x}%;bottom:${y}%"></span>`;
    }).join("");

    // Mismo valor que ya se muestra sobre cada barra de ritmo, pero para
    // FC — solo se pintan donde hrSegments() ya decidió que hay un punto
    // real (nunca sobre un hueco). Por defecto el número vive encima del
    // punto, igual que el de ritmo vive encima de su barra — pero si el
    // punto cae a la altura de la barra de ese mismo km (o por encima),
    // esa franja ya la ocupa el número de ritmo: se ancla debajo del
    // punto en su lugar. La distancia al punto NO es fija: si el punto
    // está muy por encima de su propia barra (verificado con un caso real
    // de 21 km — un desplazamiento fijo se quedaba corto y el número de FC
    // acababa tapando entero al de ritmo), se recorta como mucho a la
    // altura de la propia barra, nunca por encima — así siempre queda por
    // debajo de la franja donde vive el número de ritmo, sea cual sea la
    // distancia real entre el punto y su barra.
    const values = segments.flat().map(p => {
        const { x, y } = point(p);
        const split = splits[p.index];
        const barPct = (barHeightPx(split.paceSecPerKm, avgPaceRef) / CHART_HEIGHT_PX) * 100;
        const flipBelow = y >= barPct - HR_LABEL_FLIP_MARGIN_PCT;
        const cls = `pace-chart-hr-value${flipBelow ? " pace-chart-hr-value--below" : ""}`;
        // Math.max(0, ...): con una barra muy corta (barPct cerca de 0) y
        // un punto solo un poco por encima, y - HR_VALUE_DROP_PCT puede
        // salir negativo -- un "bottom" inválido, fuera del propio
        // gráfico. 0 es el límite inferior real del eje.
        const bottomPct = flipBelow ? Math.max(0, Math.min(y - HR_VALUE_DROP_PCT, barPct)) : y;
        return `<span class="${cls}" style="left:${x}%;bottom:${bottomPct}%">${Math.round(p.avgHr)}</span>`;
    }).join("");

    return `

        <svg class="pace-chart-hr-lines" viewBox="0 0 100 100" preserveAspectRatio="none">${lines}</svg>

        ${dots}

        ${values}

    `;

}

// Km más rápido / FC máxima por km (retoque de cierre) -- solo si de
// verdad hay variación real entre splits (mismo criterio que
// hasVariation/is-fastest de más abajo): con todos los km al mismo ritmo
// o la misma FC, señalar uno como "el más rápido"/"el más alto" sería
// ruido, no un dato útil.
function buildChartInsights(splits) {

    const insights = [];

    const paceSplits = splits.filter(s => s.segmentType !== "rest" && s.paceSecPerKm != null);
    const paces = paceSplits.map(s => s.paceSecPerKm);

    if (paces.length >= 2 && Math.min(...paces) !== Math.max(...paces)) {

        const fastest = paceSplits.reduce((a, b) => a.paceSecPerKm <= b.paceSecPerKm ? a : b);
        insights.push(`Km más rápido: km ${fastest.lap} (${formatSecondsAsClock(fastest.paceSecPerKm)}/km)`);

    }

    // "FC máxima por km" (antes "FC más alta: km X (Y ppm)") -- ese
    // fraseo nombraba un único km aunque hubiera empate real entre varios
    // (reduce() se queda con el primero que encuentra, dando a entender
    // que solo ese km llegó a esa FC). El valor va primero (es el dato
    // real de verdad, un único número siempre correcto); los km donde
    // ocurrió se listan aparte -- puede ser más de uno si hay empate real
    // (nunca puede ser TODOS: eso exigiría que min===max, y entonces esta
    // rama ni se ejecuta, ver la condición de variación real de arriba).
    const hrSplits = splits.filter(s => s.avgHr != null);
    const hrs = hrSplits.map(s => s.avgHr);

    if (hrs.length >= 2 && Math.min(...hrs) !== Math.max(...hrs)) {

        const maxHr = Math.max(...hrs);
        const lapsAtMax = hrSplits.filter(s => s.avgHr === maxHr).map(s => s.lap);

        insights.push(`FC máxima por km: ${Math.round(maxHr)} ppm (km ${lapsAtMax.join(", ")})`);

    }

    return insights;

}

// Deriva cardíaca: mínimo de splits con FC real (mitad/mitad, ~4-6 km en
// la práctica) para no calcular esto sobre un puñado de puntos poco
// representativo.
const DRIFT_MIN_HR_SPLITS = 4;

// Umbrales fijos y trazables (ronda de insights avanzados) -- estándar de
// ciencia del deporte, la única fuente del calificativo: nunca se combina
// con ritmo o temperatura para decidir la etiqueta, precisamente para que
// siempre se pueda explicar con un solo número.
const DRIFT_GOOD_MAX = 5;
const DRIFT_OK_MAX = 10;

function driftTier(percent) {

    if (percent < DRIFT_GOOD_MAX) return { label: "Muy bueno", trend: "up" };
    if (percent <= DRIFT_OK_MAX) return { label: "Bueno", trend: "flat" };
    return { label: "Mejorable", trend: "down" };

}

// Deriva cardíaca real: ((FC media 2ª mitad − FC media 1ª mitad) / FC
// media 1ª mitad) × 100 -- fórmula estándar, comparando splits reales ya
// capturados por km. Solo tiene el mismo significado en un esfuerzo
// estable (Rodaje/Z2, workout.type "easy"): en Series u otro tipo con
// tramos de intensidad distinta a propósito, una FC más alta en la
// segunda mitad no es "deriva", es la propia estructura del entreno --
// null fuera de ese tipo, o sin suficiente FC real por km.
function buildCardiacDrift(workout, splits) {

    if (workout.type !== "easy") return null;

    const hrSplits = splits.filter(s => s.segmentType !== "rest" && s.avgHr != null);
    if (hrSplits.length < DRIFT_MIN_HR_SPLITS) return null;

    const half = Math.floor(hrSplits.length / 2);
    const firstHalf = hrSplits.slice(0, half);
    const secondHalf = hrSplits.slice(hrSplits.length - half);

    const average = list => list.reduce((sum, s) => sum + s.avgHr, 0) / list.length;

    const firstAvg = average(firstHalf);
    const secondAvg = average(secondHalf);

    const percent = ((secondAvg - firstAvg) / firstAvg) * 100;

    return { percent, ...driftTier(percent) };

}

// Jerarquía de color real (especificación de cierre de colores): el
// VALOR de la deriva siempre en cian (es un dato, no un juicio), la
// CLASIFICACIÓN coloreada según el umbral objetivo de driftTier() --
// nunca al revés, y nunca un tercer color inventado fuera de la paleta
// cian/verde/naranja/gris ya definida para toda la pantalla.
function formatDrift(drift) {

    const sign = drift.percent >= 0 ? "+" : "";
    const value = `${sign}${drift.percent.toFixed(1).replace(".", ",")}%`;

    return `Deriva FC: <span class="pace-chart-drift-value">${value}</span> · <span class="pace-chart-drift-label pace-chart-drift-label--${drift.trend}">${drift.label}</span>`;

}

// Frase de conclusión real (mismo patrón que el hero de Inicio: umbrales
// de fiabilidad, nunca inventada) -- depende del mismo cálculo de deriva
// que la etiqueta de arriba (nunca un segundo criterio de estabilidad
// distinto), así que solo aparece donde la deriva también aparece. La
// cláusula de calor es puro contexto factual (la temperatura real, sin
// más), nunca una alabanza cuando la deriva es "Mejorable" -- ahí se
// plantea como posible explicación, no como mérito.
const HOT_TEMPERATURE_C = 27;

function buildDetailConclusion(workout, drift) {

    if (!drift) return null;

    const clauses = [];

    if (drift.label === "Muy bueno") clauses.push("FC muy estable durante todo el entreno.");
    else if (drift.label === "Bueno") clauses.push("FC con una deriva moderada, dentro de lo esperable.");
    else clauses.push("FC con una deriva notable en la segunda mitad del entreno.");

    if (workout.temperatureC != null && workout.temperatureC >= HOT_TEMPERATURE_C) {

        clauses.push(drift.label === "Mejorable"
            ? `El calor (${workout.temperatureC}°C) puede explicar parte de la subida.`
            : `Buena eficiencia aeróbica pese a los ${workout.temperatureC}°C.`);

    }

    return clauses.join(" ");

}

// metricMode: "both" (por defecto) / "pace" / "hr" -- controla qué serie
// se ve, no qué se calcula (las dos siguen calculándose siempre igual,
// solo cambia qué se pinta vía CSS, ver .pace-chart--mode-* en
// RunningDetailView.css). Sin línea de FC real (hasHrLine=false) el modo
// se fuerza a "pace" -- no tiene sentido ofrecer "FC sola"/"Ritmo+FC"
// cuando no hay ninguna serie de FC por km que alternar.
function RunningPaceChart(splits, avgPaceRef, avgHrRef, metricMode = "both", workout) {

    // Con Recuperación de por medio, "más lento" sería siempre un tramo de
    // descanso — obvio y sin interés. El destacado de más rápido/más lento
    // solo compara los tramos de Carrera entre sí cuando hay segmentType.
    const paceSplits = splits.some(s => s.segmentType)
        ? splits.filter(s => s.segmentType === "work")
        : splits;

    const fastestPace = Math.min(...paceSplits.map(s => s.paceSecPerKm));
    const slowestPace = Math.max(...paceSplits.map(s => s.paceSecPerKm));
    const hasVariation = fastestPace !== slowestPace;

    // La insignia de FC media y la línea por km son datos independientes:
    // Garmin (OCR) solo trae la media general de serie (pantalla Resumen/
    // Estadísticas); la FC por vuelta es opcional y depende de que el
    // usuario también capture la tabla de Vueltas desplazada a la derecha
    // (columnas GAP medio/FC media/FC máx. — ver parser-splits.js), así
    // que no siempre está aunque la media sí lo esté. Amazfit (TCX) trae
    // FC por trackpoint y por tanto por split siempre. La insignia se
    // muestra siempre que haya media; la línea solo si hay al menos un
    // split con FC real que graficar — nunca se inventa.
    const hasAvgHr = avgHrRef != null;
    const hasHrLine = splits.some(s => s.avgHr != null);
    const mode = hasHrLine ? metricMode : "pace";

    // Solo el último split puede ser un km parcial de verdad -- computeSplits()
    // (tcx.js) / el parser de Vueltas (Garmin) siempre cortan en múltiplos
    // exactos de 1km salvo el remanente final. chartSplits() ya descarta el
    // remanente MUY corto (<0.3km, ver RESIDUAL_LAP_THRESHOLD_KM) por poco
    // representativo -- lo que llega aquí como parcial (0.3-1km) sí es un
    // tramo real, solo que corto, y antes se leía igual que cualquier otro
    // km sin ninguna marca que lo explicara.
    const lastIndex = splits.length - 1;

    const insights = buildChartInsights(splits);
    const drift = buildCardiacDrift(workout, splits);
    const conclusion = buildDetailConclusion(workout, drift);

    return `

        <div class="pace-chart pace-chart--mode-${mode}">

            <div class="pace-chart-header">

                <h3 class="pace-chart-title">RITMO POR KILÓMETRO</h3>

                <div class="pace-chart-badges">

                    <span class="pace-chart-avg-badge">${formatSecondsAsClock(avgPaceRef)}/km medio</span>

                    ${hasAvgHr ? `<span class="pace-chart-avg-badge pace-chart-avg-badge--hr">${Math.round(avgHrRef)} ppm medio</span>` : ""}

                </div>

            </div>

            ${hasHrLine ? `

                <div class="pace-chart-mode-toggle">

                    <button class="pace-chart-mode-button ${metricMode === "both" ? "is-active" : ""}" data-action="set-chart-metric-mode" data-mode="both">Ritmo+FC</button>

                    <button class="pace-chart-mode-button ${metricMode === "pace" ? "is-active" : ""}" data-action="set-chart-metric-mode" data-mode="pace">Ritmo</button>

                    <button class="pace-chart-mode-button ${metricMode === "hr" ? "is-active" : ""}" data-action="set-chart-metric-mode" data-mode="hr">FC</button>

                </div>

            ` : ""}

            <div class="pace-chart-track">

                <div class="pace-chart-bars">

                    <div class="pace-chart-refline" style="bottom:${REFLINE_BOTTOM_PX}px"></div>

                    <span class="pace-chart-refline-label" style="bottom:${REFLINE_BOTTOM_PX}px">Media</span>

                    ${splits.map((split, index) => {

                        const isRest = split.segmentType === "rest";
                        const isFastest = !isRest && hasVariation && split.paceSecPerKm === fastestPace;
                        const isSlowest = !isRest && hasVariation && split.paceSecPerKm === slowestPace;
                        const isPartial = index === lastIndex && split.distanceKm != null && split.distanceKm < 1;

                        return `

                            <div class="pace-chart-column ${isPartial ? "is-partial" : ""}">

                                <span class="pace-chart-value">${formatSecondsAsClock(split.paceSecPerKm)}</span>

                                <div
                                    class="pace-chart-bar ${isFastest ? "is-fastest" : ""} ${isSlowest ? "is-slowest" : ""} ${isRest ? "is-rest" : ""}"
                                    style="height:${barHeightPx(split.paceSecPerKm, avgPaceRef)}px"
                                ></div>

                                <span class="pace-chart-lap">${split.lap}</span>

                                ${isFastest ? `<span class="pace-chart-best-tag">Mejor</span>` : ""}

                                ${isPartial ? `<span class="pace-chart-partial-tag">Parcial</span>` : ""}

                            </div>

                        `;

                    }).join("")}

                    ${hasHrLine ? `

                        <div class="pace-chart-hr-overlay" style="bottom:${LAP_LABEL_SPACE_PX}px;height:${CHART_HEIGHT_PX}px">

                            ${RunningHrOverlay(splits, avgHrRef, avgPaceRef)}

                        </div>

                    ` : ""}

                </div>

            </div>

            ${hasHrLine ? `

                <div class="pace-chart-legend">

                    <span class="pace-chart-legend-item"><i class="pace-chart-legend-dot pace-chart-legend-dot--pace"></i>Ritmo</span>

                    <span class="pace-chart-legend-item"><i class="pace-chart-legend-dot pace-chart-legend-dot--hr"></i>FC</span>

                </div>

            ` : ""}

            ${(conclusion || drift || insights.length) ? `

                <div class="pace-chart-summary">

                    ${conclusion ? `<p class="pace-chart-conclusion">${conclusion}</p>` : ""}

                    ${drift ? `<p class="pace-chart-drift">${formatDrift(drift)}</p>` : ""}

                    ${insights.length ? `

                        <ul class="pace-chart-insights">

                            ${insights.map(text => `<li>${text}</li>`).join("")}

                        </ul>

                    ` : ""}

                </div>

            ` : ""}

        </div>

    `;

}

// Retroactivo: entrenamientos guardados antes de que existiera el tipo
// no tienen workout.type — se ve "Sin tipo" en vez de caer por defecto
// en la primera opción real, para no fingir una clasificación que nunca
// se hizo. En cuanto se elige uno, updateWorkoutType() lo persiste sin
// pasar por el wizard de importación (ver initRunningEvents.js).
// Exportada (especificación de cierre): el menú "···" de cada tarjeta de
// la lista (RunningHistoryItem, Running.js) reutiliza este mismo select
// para "Cambiar tipo" -- mismo data-action="set-workout-type" que ya
// maneja initRunningEvents.js, cero wiring nuevo.
export function typeSelector(workout) {

    return `

        <select class="detail-type-select" data-action="set-workout-type" data-workout-id="${workout.id}">

            <option value="" ${!workout.type ? "selected" : ""} disabled hidden>Sin tipo</option>

            ${RUNNING_WORKOUT_TYPES.map(option => `

                <option value="${option.id}" ${workout.type === option.id ? "selected" : ""}>

                    ${option.label}

                </option>

            `).join("")}

        </select>

    `;

}

// Zapatillas retiradas se excluyen de las opciones (no tiene sentido
// reasignar una carrera a una zapatilla que ya no se usa), salvo que sea
// la que este entreno ya tiene asignada — si no, cambiar de pantalla tras
// retirarla haría "desaparecer" en silencio la que de verdad se usó.
// Exportada por el mismo motivo que typeSelector() -- "Cambiar zapatilla"
// en el menú "···" de la lista reutiliza este select tal cual.
export function shoeSelector(workout, shoes) {

    const options = shoes.filter(shoe => shoe.status !== "retired" || shoe.id === workout.shoeId);

    return `

        <select class="detail-shoe-select" data-action="set-workout-shoe" data-workout-id="${workout.id}">

            <option value="" ${!workout.shoeId ? "selected" : ""}>Sin zapatilla</option>

            ${options.map(shoe => `

                <option value="${shoe.id}" ${workout.shoeId === shoe.id ? "selected" : ""}>

                    ${formatShoeName(shoe)}

                </option>

            `).join("")}

        </select>

    `;

}

// badge opcional: { icon, title } -- hoy solo lo usa Temperatura, para
// avisar cuando el valor viene de la estimación climática de Open-Meteo
// (ver weatherEstimate.js) y no de una medición real del reloj. minor:
// true (retoque de cierre) da menos peso visual -- solo lo usa "Hora"
// dentro del grupo Condiciones, frente a Cadencia/Zapatilla.
//
// Sin dato real (value === "—"), especificación de cierre: por defecto la
// tarjeta se OCULTA entera (preferido). showEmpty:true la mantiene visible
// pero con icono/valor en gris en vez de cian (solo Training Effect: es un
// dato nuevo que la mayoría de entrenos ya importados aún no tienen, y que
// la 4ª tarjeta de Rendimiento aparezca/desaparezca según el entreno
// rompería más la consistencia del grid que dejarla ahí, inerte). Zapatilla
// no necesita ninguna de las dos: su "value" es el <select> en sí, nunca el
// placeholder "—", así que siempre se muestra sin pedirlo explícitamente.
// wide:true (retoque de cierre, punto 13) ocupa la fila entera en vez de
// media -- un <select> nativo no puede envolver su valor en dos líneas
// como un <span> normal, así que la única forma real de evitar el corte
// feo ("Asics Nimb...") es darle más ancho horizontal. Solo la usa
// Zapatilla: es la única tarjeta con un valor de longitud impredecible.
function detailStat(icon, label, value, badge, { minor = false, showEmpty = false, wide = false } = {}) {

    const isEmpty = value === "—";
    if (isEmpty && !showEmpty) return "";

    return `

        <div class="detail-stat ${minor ? "detail-stat--minor" : ""} ${isEmpty && showEmpty ? "detail-stat--empty" : ""} ${wide ? "detail-stat--wide" : ""}">

            <iconify-icon icon="${icon}"></iconify-icon>

            <div class="detail-stat-text">

                <span class="detail-stat-value">${value}</span>

                <span class="detail-stat-label">

                    ${label}

                    ${badge ? `<iconify-icon icon="${badge.icon}" class="detail-stat-badge" title="${badge.title}"></iconify-icon>` : ""}

                </span>

            </div>

        </div>

    `;

}

// Grupo de tarjetas con su propio título -- Rendimiento/Condiciones/
// Equipamiento (retoque de cierre), en vez de la rejilla plana de antes.
// Rendimiento y Equipamiento nunca quedan vacíos (Training Effect y
// Zapatilla siempre se muestran), pero Condiciones sí puede hacerlo -- un
// entreno sin temperatura/desnivel/hora capturados dejaría el título
// "CONDICIONES" flotando sobre una rejilla vacía si no se oculta el grupo
// entero cuando ninguno de sus stats sobrevive.
function detailStatGroup(title, statsHtml) {

    if (!statsHtml.replace(/\s/g, "")) return "";

    return `

        <div class="detail-stat-group">

            <h4 class="detail-stat-group-title">${title}</h4>

            <div class="detail-stats">

                ${statsHtml}

            </div>

        </div>

    `;

}

// Acordeón colapsable (retoque de cierre): antes era un banner amarillo
// siempre desplegado (mismo .wizard-banner-warning que usan
// RunningReviewStep.js/RunningShoeStep.js para otros avisos, no tocado
// ahí) -- en el detalle competía visualmente con el resto de la pantalla
// cada vez que se abría un entreno con avisos reales de importación.
// Colapsado por defecto (ver setDetailWorkoutId() en runningStore.js, que
// resetea warningsExpanded a false al cambiar de entreno).
function ImportWarningsBanner(warnings, expanded) {

    if (!warnings.length) return "";

    return `

        <div class="import-warnings ${expanded ? "is-expanded" : ""}">

            <button class="import-warnings-toggle" data-action="toggle-import-warnings">

                <iconify-icon icon="solar:danger-circle-bold-duotone"></iconify-icon>

                <span>Avisos de importación (${warnings.length})</span>

                <iconify-icon icon="solar:alt-arrow-down-bold-duotone" class="import-warnings-chevron"></iconify-icon>

            </button>

            ${expanded ? `

                <ul class="import-warnings-list">

                    ${warnings.map(w => `<li>${w}</li>`).join("")}

                </ul>

            ` : ""}

        </div>

    `;

}

export function RunningDetailView(workout, shoes = [], warningsExpanded = false, chartMetricMode = "both", allWorkouts = []) {

    if (!workout) return "";

    const distance = workout.distanceKm != null ? `${workout.distanceKm} km` : "—";
    const duration = workout.durationSec != null ? formatSecondsAsClock(workout.durationSec) : "—";
    const avgPace = workout.avgPaceSecPerKm != null ? `${formatSecondsAsClock(workout.avgPaceSecPerKm)}/km` : "—";

    const splits = chartSplits(workout);
    const avgPaceRef = averagePace(workout, splits);
    const avgHrRef = averageHr(workout, splits);
    const warnings = workout.importWarnings || [];

    // Comparación histórica de ESTE entreno (retoque de cierre, punto 10)
    // -- independiente del gráfico de arriba (no necesita splits, solo el
    // ritmo/FC medios de siempre), así que se calcula y se pinta aparte,
    // sin depender de si RITMO POR KILÓMETRO llega a mostrarse.
    const workoutComparison = buildWorkoutComparison(workout, allWorkouts);

    const temperature = workout.temperatureC != null ? `${workout.temperatureC}°C` : "—";
    const isEstimatedTemp = workout.temperatureC != null && workout.fieldMeta?.temperatureC?.estimated === true;

    // El stat "FC media" en .detail-stats no es redundante con el chip del
    // gráfico: ese chip vive dentro de RITMO POR KILÓMETRO, que ni se pinta
    // sin datos de ritmo por km (chartSplits() exige paceSecPerKm) — un
    // entreno con FC media conocida pero sin la vista estándar de Vueltas
    // (solo Resumen/Estadísticas + la tabla con FC) se quedaba sin ningún
    // sitio donde mostrar ese dato.
    return `

        <section class="running-detail">

            <header class="wizard-header">

                <button class="wizard-close" data-action="close-detail">

                    <iconify-icon icon="solar:close-circle-bold-duotone"></iconify-icon>

                </button>

                <div class="detail-title">

                    <h2>${capitalize(formatWeekday(workout.date))} · ${formatDayMonth(workout.date)}</h2>

                    ${workout.time ? `<span class="detail-time">${workout.time}</span>` : ""}

                </div>

                ${typeSelector(workout)}

            </header>

            ${ImportWarningsBanner(warnings, warningsExpanded)}

            <div class="detail-summary">

                <div class="detail-summary-item">
                    <span class="detail-summary-value">${distance}</span>
                    <span class="detail-summary-label">Distancia</span>
                </div>

                <div class="detail-summary-item">
                    <span class="detail-summary-value">${duration}</span>
                    <span class="detail-summary-label">Duración</span>
                </div>

                <div class="detail-summary-item">
                    <span class="detail-summary-value">${avgPace}</span>
                    <span class="detail-summary-label">Ritmo medio</span>
                </div>

            </div>

            ${splits.length >= MIN_SPLITS_FOR_CHART ? RunningPaceChart(splits, avgPaceRef, avgHrRef, chartMetricMode, workout) : ""}

            ${workoutComparison ? `

                <p class="workout-comparison">

                    <iconify-icon icon="solar:chart-2-bold-duotone"></iconify-icon>

                    <span>${buildWorkoutComparisonMessage(workoutComparison)}</span>

                </p>

            ` : ""}

            ${detailStatGroup("RENDIMIENTO", `

                ${detailStat("solar:speedometer-bold-duotone", "Ritmo medio", avgPace)}

                ${detailStat("solar:heart-pulse-bold-duotone", "FC media", workout.avgHr != null ? `${Math.round(workout.avgHr)} ppm` : "—")}

                ${detailStat("solar:round-alt-arrow-up-bold-duotone", "Cadencia", workout.avgCadence != null ? `${workout.avgCadence} spm` : "—")}

                ${detailStat("solar:chart-2-bold-duotone", "Training Effect", workout.trainingEffectAerobic != null ? `Aeróbica ${String(workout.trainingEffectAerobic).replace(".", ",")}` : "—", null, { showEmpty: true })}

            `)}

            ${detailStatGroup("CONDICIONES", `

                ${detailStat(
                    "solar:temperature-bold-duotone",
                    "Temperatura",
                    temperature,
                    isEstimatedTemp ? { icon: "solar:cloud-bold-duotone", title: "Estimada por ubicación y fecha — no es una medición real del reloj" } : null
                )}

                ${detailStat("solar:route-bold-duotone", "Desnivel +", workout.elevationGainM != null ? `${workout.elevationGainM} m` : "—")}

                ${detailStat("solar:clock-circle-bold-duotone", "Hora", workout.time || "—", null, { minor: true })}

            `)}

            ${detailStatGroup("EQUIPAMIENTO", `

                ${detailStat("solar:running-round-bold-duotone", "Zapatilla", shoeSelector(workout, shoes), null, { wide: true })}

                ${detailStat("solar:fire-bold-duotone", "Calorías", workout.calories != null ? `${workout.calories} kcal` : "—")}

            `)}

        </section>

    `;

}
