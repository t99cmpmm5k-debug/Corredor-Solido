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

// Días de margen para que una carrera marcada se considere "inminente" en
// la frase-resumen -- 3 porque a partir de ahí el consejo real ya no es
// "ojo, se acerca" sino "descansa para llegar bien", igual que hace
// cualquier entrenador real en la semana previa a una carrera.
export const RACE_URGENT_DAYS_THRESHOLD = 3;

// "Cerca del 100%" para reforzar positivamente el cumplimiento del plan --
// no hace falta llegar exacto al 100% para que la semana ya merezca un
// "vas bien" (planCompliance.kmPercent puede quedarse en 92-98% por un
// entreno algo corto y aun así ser una semana completada en la práctica).
export const PLAN_NEAR_COMPLETE_THRESHOLD_PERCENT = 90;

function raceSummarySentence(days) {

    if (days === 0) return "Carrera hoy — llega descansado.";
    if (days === 1) return "Carrera mañana — llega descansado.";

    return `Carrera en ${days} días — llega descansado.`;

}

// Mismo vocabulario que buildAcwrRecommendation() (utils/acwr.js): "carga
// alta/muy alta", nunca "riesgo" ni lenguaje de diagnóstico médico -- una
// sola frase corta, no la recomendación larga que ya se ve en la propia
// tarjeta ACWR (esto es un resumen de fondo, no quiere repetirla).
function acwrSummarySentence(zoneId) {

    return zoneId === "highRisk"
        ? "Carga muy alta esta semana — prioriza el descanso."
        : "Carga alta esta semana — no fuerces más de la cuenta.";

}

function planSummarySentence(kmPercent) {

    return kmPercent >= 100
        ? "Semana completada. Buen ritmo de trabajo."
        : "Casi completas la semana — buen ritmo de trabajo.";

}

// Mismo signo que paceTrendLabel() de arriba (positivo = más lento ahora),
// pero en frase natural en vez de "+Ns/km" -- esto es la variante de
// "fondo" cuando no hay nada más urgente que contar, así que el tono es
// deliberadamente neutro incluso si el ritmo ha empeorado un poco.
function z2SummarySentence(evolution) {

    const change = evolution.last.avgPaceSecPerKm - evolution.first.avgPaceSecPerKm;

    if (change === 0) return "Tu Z2 se mantiene estable últimamente.";

    return change < 0
        ? "Tu Z2 mejora poco a poco últimamente."
        : "Tu Z2 va algo más lento últimamente, nada que preocupe.";

}

// Frase-resumen bajo "Estado del corredor" (Inicio, Capa 3, primer punto
// del documento de 35 propuestas) -- elige UNA sola interpretación, nunca
// intenta combinar los 4 indicadores en una frase. Prioridad fija (usa la
// primera que aplique, en este orden):
//
//   a) Carrera marcada a <= RACE_URGENT_DAYS_THRESHOLD días -- lo más
//      accionable/urgente siempre gana, sea cual sea el resto de datos.
//   b) Carga (ACWR) en zona alta/muy alta -- aviso suave, mismo
//      vocabulario que la propia tarjeta ACWR (nunca "riesgo").
//   c) Cumplimiento del plan completado o cerca -- refuerzo positivo.
//   d) Evolución Z2 -- dato de fondo si no hay nada más relevante que
//      contar esta semana.
//
// null si ninguna regla aplica (mismos datos "no disponibles" que ya usa
// buildRunnerStatusIndicators() -- por construcción, si las 4 fuentes
// están vacías esto también devuelve null, sin necesidad de comprobarlo
// aparte: no hay indicadores == ninguna condición de arriba puede ser
// cierta). Nunca inventa ni calcula nada que esas 4 fuentes no traigan ya.
export function buildRunnerStatusSummary({ acwrInsight, z2Evolution, planCompliance, upcomingRaces }, referenceDate = new Date()) {

    const race = (upcomingRaces ?? []).find(r => r.isGoal) ?? (upcomingRaces ?? [])[0] ?? null;

    if (race) {

        const days = daysUntil(race.date, referenceDate);
        if (days >= 0 && days <= RACE_URGENT_DAYS_THRESHOLD) return raceSummarySentence(days);

    }

    if (acwrInsight.available && (acwrInsight.zone.id === "moderateRisk" || acwrInsight.zone.id === "highRisk")) {
        return acwrSummarySentence(acwrInsight.zone.id);
    }

    if (planCompliance.hasPlan && planCompliance.kmPercent != null && planCompliance.kmPercent >= PLAN_NEAR_COMPLETE_THRESHOLD_PERCENT) {
        return planSummarySentence(planCompliance.kmPercent);
    }

    if (z2Evolution.available) return z2SummarySentence(z2Evolution);

    return null;

}
