import "./RunningProgressCard.css";

import { RUNNING_WORKOUT_TYPES } from "../../../data/runningWorkoutTypes.js";

function typeLabel(type) {

    return RUNNING_WORKOUT_TYPES.find(t => t.id === type)?.label || type;

}

// La FC actúa como control: si el ritmo mejora pero la FC sube en
// proporción parecida o mayor (ver runningProgress.js), no es una mejora
// real y el verbo cambia — nunca se dice "has mejorado" sin que la FC lo
// respalde.
function hrClause(hrTrend) {

    if (hrTrend === "stable") return " con una FC media estable";
    if (hrTrend === "lower") return " con la FC media más baja";
    if (hrTrend === "higher-partial") return ", aunque con la FC media algo más alta";
    return "";

}

function buildMessage(insight) {

    const label = typeLabel(insight.type);

    if (insight.status === "insufficient-data") {
        return {
            icon: "solar:chart-2-bold-duotone",
            trend: "flat",
            html: `Necesitas más entrenos de ${label} para ver tu progreso.`
        };
    }

    if (insight.status === "pace-stable") {
        return {
            icon: "solar:chart-2-bold-duotone",
            trend: "flat",
            html: `Tu ritmo se mantiene estable en tus últimos ${insight.groupSize} entrenos de ${label}${hrClause(insight.hrTrend)}.`
        };
    }

    if (insight.status === "worse") {
        const value = Math.abs(insight.paceDeltaSecPerKm);
        return {
            icon: "solar:graph-down-bold-duotone",
            trend: "down",
            html: `Tu ritmo medio ha subido <span class="progress-card-value">${value} s/km</span> en tus últimos ${insight.groupSize} entrenos de ${label}${hrClause(insight.hrTrend)}.`
        };
    }

    // "improved" — pero si la FC subió en proporción igual o mayor que lo
    // que bajó el ritmo, no se reclama mejora real (ver runningProgress.js).
    const value = insight.paceDeltaSecPerKm;

    if (insight.hrTrend === "higher-proportional") {
        return {
            icon: "solar:chart-2-bold-duotone",
            trend: "flat",
            html: `Corres <span class="progress-card-value">${value} s/km</span> más rápido en tus últimos ${insight.groupSize} entrenos de ${label}, pero con la FC media también más alta — no parece una mejora real de forma física.`
        };
    }

    return {
        icon: "solar:graph-up-bold-duotone",
        trend: "up",
        html: `Has mejorado <span class="progress-card-value">${value} s/km</span> en tus últimos ${insight.groupSize} entrenos de ${label}${hrClause(insight.hrTrend)}.`
    };

}

export function RunningProgressCard(insight) {

    if (!insight) return "";

    const { icon, trend, html } = buildMessage(insight);

    return `

        <div class="progress-card progress-card--${trend}">

            <iconify-icon icon="${icon}" class="progress-card-icon"></iconify-icon>

            <p class="progress-card-text">${html}</p>

        </div>

    `;

}
