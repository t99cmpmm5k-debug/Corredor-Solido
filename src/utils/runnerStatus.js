import { parseISODate, formatISODate } from "./date.js";
import { classifyPlanOverage } from "./planCompliance.js";

// Mismo cálculo que daysUntil() en NextGoalWidget.js (diff de fecha real,
// nunca estimado) -- se duplica aquí a propósito en vez de compartirse
// (las páginas no comparten módulos de UI entre sí, ver CLAUDE.md "known
// duplication"), es aritmética trivial, no un cálculo nuevo.
function daysUntil(dateISO, referenceDate) {

    const target = parseISODate(dateISO);
    const today = parseISODate(formatISODate(referenceDate));

    return Math.round((target - today) / 86400000);

}

// Misma prioridad Inscrito > Objetivo que "Tu próximo objetivo"
// (NextGoalWidget.js, rediseño de Inicio 2026-09-25) -- ANTES esto y el
// indicador "Próx. carrera" de abajo caían a upcoming[0] (la más
// próxima del calendario general) si no había ninguna marcada, mismo
// fallback ya quitado de NextGoalWidget.js por el mismo motivo: una
// carrera solo "Siguiendo" no debe influir en Inicio. Se comparte aquí
// para que la frase-resumen de más abajo nunca hable de una carrera que
// la propia tarjeta de "Tu próximo objetivo" no mostraría.
function priorityRace(upcomingRaces) {

    return (upcomingRaces ?? []).find(r => r.isRegistered) ?? (upcomingRaces ?? []).find(r => r.isGoal) ?? null;

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

// "Estado del corredor" (Inicio) -- 3 indicadores compactos (simplificado
// de 4 a 3 en el rediseño de Inicio, 2026-09-25: "Próx. carrera" se quita
// de aquí, ya la cubre "Tu próximo objetivo" -- NextGoalWidget.js -- si
// hay una carrera real marcada), cada uno leyendo un cálculo que YA
// EXISTE en otra pantalla, nunca uno nuevo:
//
// - Carga: buildAcwrInsight() (ver utils/acwr.js, ya usado en Running).
// - Z2: buildZ2Evolution() (ver pages/Running/runningEvolution.js).
// - Semana: buildPlanCompliance() (ver utils/planCompliance.js, Inicio).
//
// Cualquier pieza sin dato disponible se omite del array por completo
// (nunca un placeholder "sin datos") -- RunnerStatusWidget.js oculta la
// tarjeta entera si el array queda vacío. Recibe el mismo objeto
// `runnerStatusInputs` que buildRunnerStatusSummary() de abajo (que sí
// necesita upcomingRaces/referenceDate) -- Home.js arma uno solo, esta
// función simplemente ignora los campos que no le hacen falta.
export function buildRunnerStatusIndicators({ acwrInsight, z2Evolution, planCompliance }) {

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

    // Revisado (Capa 3, punto 4): a diferencia de la frase-resumen
    // (planSummarySentence más abajo), este indicador se queda
    // deliberadamente como número simple aunque supere el 100% -- es una
    // celda compacta de icono+valor+etiqueta en una fila junto a otras 2,
    // sin sitio para una nota de contexto sin romper el formato. El matiz
    // de "cumplir de más no es automáticamente mejor" sigue presente en
    // la propia frase-resumen, solo no aquí.
    if (planCompliance.hasPlan && planCompliance.kmPercent != null) {

        indicators.push({
            key: "week",
            icon: "solar:calendar-mark-bold-duotone",
            label: "Semana",
            value: `${planCompliance.kmPercent}%`
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

// Distinguir cumplimiento de carga (Capa 3, punto 4): cumplir de más no es
// automáticamente "mejor" cuanto más alto sea el %, mismo criterio que ya
// se aplica en ACWR -- classifyPlanOverage() (utils/planCompliance.js,
// misma clasificación y mismo umbral que ya usa classifyPlanOverage() (planCompliance.js),
// no uno nuevo) decide si el exceso es "alto"; solo entonces se cambia el
// refuerzo incondicional por una frase informativa sin veredicto.
function planSummarySentence(kmPercent) {

    if (kmPercent < 100) return "Casi completas la semana — buen ritmo de trabajo.";

    return classifyPlanOverage(kmPercent) === "high"
        ? "Volumen por encima de lo previsto esta semana."
        : "Semana completada. Buen ritmo de trabajo.";

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
// intenta combinarlas todas en una frase. Prioridad fija (usa la primera
// que aplique, en este orden):
//
//   a) Carrera Inscrita/Objetivo (mismo criterio que "Tu próximo
//      objetivo", priorityRace() más arriba -- desde el rediseño de
//      Inicio 2026-09-25 ya no cualquier carrera próxima) a
//      <= RACE_URGENT_DAYS_THRESHOLD días -- lo más accionable/urgente
//      siempre gana, sea cual sea el resto de datos.
//   b) Carga (ACWR) en zona alta/muy alta -- aviso suave, mismo
//      vocabulario que la propia tarjeta ACWR (nunca "riesgo").
//   c) Cumplimiento del plan completado o cerca -- refuerzo positivo.
//   d) Evolución Z2 -- dato de fondo si no hay nada más relevante que
//      contar esta semana.
//
// null si ninguna regla aplica. Nunca inventa ni calcula nada que esas
// fuentes no traigan ya.
export function buildRunnerStatusSummary({ acwrInsight, z2Evolution, planCompliance, upcomingRaces }, referenceDate = new Date()) {

    const race = priorityRace(upcomingRaces);

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
