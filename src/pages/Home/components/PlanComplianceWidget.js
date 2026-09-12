import "./PlanComplianceWidget.css";

import { formatKm } from "../../../utils/format.js";

// "Cumplimiento del plan" (Inicio, Capa 2 -- inteligencia deportiva):
// planificado vs. realizado esta semana, solo running. `compliance` ya
// viene calculado (ver buildPlanCompliance() en utils/planCompliance.js)
// -- este componente es puro renderizado, igual que MonthlyKmWidget.js.
//
// Sin plan de running esta semana (hasPlan:false -- semana de descanso o
// nada importado todavía), el widget no pinta nada, ni siquiera un
// hueco vacío -- mismo criterio que NextGoalWidget.js sin carrera
// próxima.
export function PlanComplianceWidget(compliance) {

    if (!compliance.hasPlan) return "";

    const { plannedKm, actualKm, kmPercent, sessionsCompleted, sessionsPlanned } = compliance;

    return `

        <section class="plan-compliance-widget">

            <span class="plan-compliance-label">CUMPLIMIENTO DEL PLAN</span>

            <p class="plan-compliance-km">

                Planificado: <strong>${formatKm(plannedKm)} km</strong> · Realizado: <strong>${formatKm(actualKm)} km</strong>

                ${kmPercent != null ? `<span class="plan-compliance-percent">${kmPercent}%</span>` : ""}

            </p>

            <p class="plan-compliance-sessions">

                ${sessionsCompleted}/${sessionsPlanned} sesiones

            </p>

        </section>

    `;

}
