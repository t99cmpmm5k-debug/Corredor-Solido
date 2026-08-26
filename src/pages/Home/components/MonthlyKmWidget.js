import "./MonthlyKmWidget.css";

import { formatKm } from "../../../utils/format.js";

const MAX_BAR_HEIGHT = 22;
const MIN_BAR_HEIGHT = 3;

// "AAAA-MM" -> "Agosto" (capitalizado, sin año -- el año no aporta nada
// aquí, todo el widget vive en el mismo año la inmensa mayoría de veces
// y cuando no, sigue siendo top de mind por el propio número grande).
function monthName(monthKey) {

    const [year, month] = monthKey.split("-").map(Number);
    const label = new Intl.DateTimeFormat("es-ES", { month: "long" }).format(new Date(year, month - 1, 1));

    return label.charAt(0).toUpperCase() + label.slice(1);

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
export function MonthlyKmWidget(stats) {

    const { currentMonthKey, currentMonthKm, previousMonthKey, comparisonPercent, chartMonths } = stats;

    const isUp = comparisonPercent != null && comparisonPercent >= 0;

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

                        <div
                            class="monthly-km-bar ${m.isCurrent ? "is-current" : ""}"
                            style="height:${barHeight(m.km, chartMonths)}px"
                        ></div>

                    `).join("")}

                </div>

            ` : ""}

        </section>

    `;

}
