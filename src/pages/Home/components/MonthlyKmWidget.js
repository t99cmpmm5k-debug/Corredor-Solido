import "./MonthlyKmWidget.css";

import { formatKm } from "../../../utils/format.js";

// Barras grandes (ronda final del rediseño, 2026-08-26): el gráfico pasa
// de "refuerzo visual discreto" a ocupar de verdad la mitad inferior de
// la tarjeta, con la etiqueta de cada mes debajo -- antes solo llevaba
// aria-label, sin texto visible.
const MAX_BAR_HEIGHT = 64;

// Ajuste de los ajustes finales (B3): 18px (ronda de cierre anterior)
// resultaba demasiado alto como suelo -- cualquier mes por debajo de
// ~28% del máximo quedaba igualado a esos mismos 18px, así que dos meses
// claramente distintos (p. ej. 5 km y 15 km, con un máximo de 52,7 km)
// se veían como la MISMA barra. 8px es lo bastante pequeño como para que
// el suelo solo entre en juego con meses realmente cercanos a 0 -- por
// encima de eso, barHeight() ya deja la proporción real intacta sin
// tocarla.
const MIN_BAR_HEIGHT = 8;

// "AAAA-MM" -> "Agosto" (capitalizado, sin año -- el año no aporta nada
// aquí, todo el widget vive en el mismo año la inmensa mayoría de veces
// y cuando no, sigue siendo top de mind por el propio número grande).
function monthName(monthKey) {

    const [year, month] = monthKey.split("-").map(Number);
    const label = new Intl.DateTimeFormat("es-ES", { month: "long" }).format(new Date(year, month - 1, 1));

    return label.charAt(0).toUpperCase() + label.slice(1);

}

// "AAAA-MM" -> "AGO" -- misma convención de abreviatura que
// raceFormat.js/date.js (Intl short + mayúsculas, sin forzar 3 letras a
// la fuerza: "sept" de septiembre se queda tal cual, no se trunca).
function monthAbbrev(monthKey) {

    const [year, month] = monthKey.split("-").map(Number);

    return new Intl.DateTimeFormat("es-ES", { month: "short" })
        .format(new Date(year, month - 1, 1))
        .toUpperCase()
        .replace(".", "");

}

// Altura proporcional al mes más alto de la ventana, con un mínimo
// visible para que un mes en 0 km siga dibujando una barra (no un hueco
// que parezca un fallo de render) -- mismo criterio que WeekChart.js.
function barHeight(km, months) {

    const max = Math.max(...months.map(m => m.km), 0);
    if (max <= 0) return MIN_BAR_HEIGHT;

    return Math.max(Math.round((km / max) * MAX_BAR_HEIGHT), MIN_BAR_HEIGHT);

}

// Widget "hero number" de Inicio, inspirado en las estadísticas
// mensuales de Strava en modo oscuro: cifra grande y protagonista, no un
// gráfico plano. `stats` viene ya calculado y solo con datos reales (ver
// buildMonthlyKmStats() en utils/monthlyKm.js) -- este componente es puro
// renderizado, no decide qué mostrar a partir de los workouts.
//
// Compactado 2026-08-26 (fase 3 del pulido de densidad): la cabecera
// (mes) y la cifra+comparación ya no van en 3 bloques apilados
// (etiqueta / número enorme en su propia fila / chip de comparación
// debajo) sino en 2 líneas cortas -- "AGOSTO" y "52,7 km · +50% vs
// julio" en la misma línea, número seguido de la unidad y la
// comparación como texto, no como badge aparte. Sigue siendo el
// elemento más grande de su línea (font-size mayor que el resto), solo
// que ya no ocupa una fila entera para sí solo.
//
// Interactivo desde 2026-08-26: tocar una barra muestra el detalle real
// de ESE mes (km + nº de entrenos, ver count en monthlyKm.js) sin salir
// de Inicio -- selectedMonthKey vive en core/state.js (propio de este
// widget), lo lee y lo pasa Home.js igual que homeSelectedWorkout. La
// línea inferior nunca queda vacía sin selección: por defecto muestra el
// resumen del propio mes en curso ("9 entrenamientos · 5,8 km/sesión",
// ver summaryLine), así que tocar la barra del mes actual no cambia
// nada (ya es lo que se ve por defecto).
export function MonthlyKmWidget(stats, selectedMonthKey = null) {

    const { currentMonthKey, currentMonthKm, currentMonthCount, previousMonthKey, comparisonPercent, chartMonths } = stats;

    const isUp = comparisonPercent != null && comparisonPercent >= 0;

    const selected = (chartMonths && selectedMonthKey && selectedMonthKey !== currentMonthKey)
        ? chartMonths.find(m => m.key === selectedMonthKey) ?? null
        : null;

    // Línea de resumen inferior: el detalle de un mes tocado (si lo hay)
    // o, por defecto, el propio mes en curso -- "9 entrenamientos · 5,8
    // km/sesión", siempre con datos reales (nunca al dividir entre 0
    // entrenos, ver guarda de abajo).
    const summaryLine = selected
        ? `${monthName(selected.key)} · ${formatKm(selected.km)} km · ${selected.count} entrenamiento${selected.count === 1 ? "" : "s"}`
        : (currentMonthCount > 0
            ? `${currentMonthCount} entrenamiento${currentMonthCount === 1 ? "" : "s"} · ${formatKm(currentMonthKm / currentMonthCount)} km/sesión`
            : null);

    return `

        <section class="monthly-km-widget">

            <div class="monthly-km-glow"></div>

            <span class="monthly-km-label">

                ${monthName(currentMonthKey).toUpperCase()}

            </span>

            <div class="monthly-km-line">

                <span class="monthly-km-number">${formatKm(currentMonthKm)}</span>

                <span class="monthly-km-unit">km</span>

                ${comparisonPercent != null ? `

                    <span class="monthly-km-comparison ${isUp ? "is-up" : "is-down"}">

                        · ${isUp ? "+" : ""}${comparisonPercent}% vs ${monthName(previousMonthKey)}

                    </span>

                ` : ""}

            </div>

            ${chartMonths ? `

                <div class="monthly-km-chart">

                    ${chartMonths.map(m => `

                        <div class="monthly-km-col">

                            <div class="monthly-km-bar-track">

                                <button
                                    type="button"
                                    class="monthly-km-bar ${m.isCurrent ? "is-current" : ""} ${m.key === selectedMonthKey ? "is-selected" : ""}"
                                    style="height:${barHeight(m.km, chartMonths)}px"
                                    data-action="select-month"
                                    data-month-key="${m.key}"
                                    aria-label="${monthName(m.key)}"
                                ></button>

                            </div>

                            <span class="monthly-km-bar-label ${m.isCurrent ? "is-current" : ""}">${monthAbbrev(m.key)}</span>

                        </div>

                    `).join("")}

                </div>

            ` : ""}

            ${summaryLine ? `

                <p class="monthly-km-detail">${summaryLine}</p>

            ` : ""}

        </section>

    `;

}
