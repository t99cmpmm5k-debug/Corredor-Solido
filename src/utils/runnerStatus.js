import { parseISODate, formatISODate } from "./date.js";

// Mismo cálculo que daysUntil() en NextGoalWidget.js (diff de fecha real,
// nunca estimado) -- se duplica aquí a propósito en vez de compartirse
// (las páginas no comparten módulos de UI entre sí, ver CLAUDE.md "known
// duplication"), es aritmética trivial, no un cálculo nuevo.
function daysUntil(dateISO, referenceDate) {

    const target = parseISODate(dateISO);
    const today = parseISODate(formatISODate(referenceDate));

    return Math.round((target - today) / 86400000);

}

function raceDaysLabel(days) {

    if (days <= 0) return "Hoy";
    if (days === 1) return "Mañana";

    return `${days} días`;

}

// Cambio real de ritmo (no el paceDeltaSecPerKm crudo de
// buildZ2Evolution(), que va en sentido contrario -- positivo ahí
// significa "más rápido") -- aquí se expresa como el propio ritmo
// subiendo o bajando, con signo, para que "-11s/km" se lea igual que en
// el resto de la app (menos segundos por km = más rápido).
function paceTrendLabel(evolution) {

    const change = evolution.last.avgPaceSecPerKm - evolution.first.avgPaceSecPerKm;
    if (change === 0) return "Sin cambios";

    return `${change > 0 ? "+" : "-"}${Math.abs(change)}s/km`;

}

// "Estado del corredor" (Inicio, Capa 2) -- 4 indicadores compactos, cada
// uno leyendo un cálculo que YA EXISTE en otra pantalla, nunca uno nuevo:
//
// - Carga: buildAcwrInsight() (ver utils/acwr.js, ya usado en Running).
// - Z2: buildZ2Evolution() (ver pages/Running/runningEvolution.js).
// - Semana: buildPlanCompliance() (ver utils/planCompliance.js, Inicio).
// - Próxima carrera: getUpcomingPlannedRaces(), misma prioridad
//   "marcada como objetivo, si no la más próxima" que ya usa
//   NextGoalWidget.js -- mismo dato, mismo criterio de selección.
//
// Cualquier pieza sin dato disponible se omite del array por completo
// (nunca un placeholder "sin datos") -- RunnerStatusWidget.js oculta la
// tarjeta entera si el array queda vacío. referenceDate solo se pasa
// distinto de new Date() en tests.
export function buildRunnerStatusIndicators({ acwrInsight, z2Evolution, planCompliance, upcomingRaces }, referenceDate = new Date()) {

    const indicators = [];

    if (acwrInsight.available) {

        indicators.push({
            key: "acwr",
            icon: "solar:chart-2-bold-duotone",
            label: "Carga",
            value: acwrInsight.zone.barLabel
        });

    }

    if (z2Evolution.available) {

        indicators.push({
            key: "z2",
            icon: "solar:graph-new-up-bold-duotone",
            label: "Z2",
            value: paceTrendLabel(z2Evolution)
        });

    }

    if (planCompliance.hasPlan && planCompliance.kmPercent != null) {

        indicators.push({
            key: "week",
            icon: "solar:calendar-mark-bold-duotone",
            label: "Semana",
            value: `${planCompliance.kmPercent}%`
        });

    }

    const race = (upcomingRaces ?? []).find(r => r.isGoal) ?? (upcomingRaces ?? [])[0] ?? null;

    if (race) {

        indicators.push({
            key: "race",
            icon: "solar:flag-2-bold-duotone",
            label: "Próx. carrera",
            value: raceDaysLabel(daysUntil(race.date, referenceDate))
        });

    }

    return indicators;

}
