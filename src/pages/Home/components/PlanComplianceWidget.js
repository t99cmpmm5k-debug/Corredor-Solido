import "./PlanComplianceWidget.css";

import { formatKm } from "../../../utils/format.js";
import { classifyPlanOverage } from "../../../utils/planCompliance.js";

// "Cumplimiento del plan" (Inicio, Capa 2 -- inteligencia deportiva):
// planificado vs. realizado esta semana, solo running. `compliance` ya
// viene calculado (ver buildPlanCompliance() en utils/planCompliance.js)
// -- este componente es puro renderizado, igual que MonthlyKmWidget.js.
//
// Sin plan de running esta semana (hasPlan:false -- semana de descanso o
// nada importado todavía), el widget no pinta nada, ni siquiera un
// hueco vacío -- mismo criterio que NextGoalWidget.js sin carrera
// próxima.
//
// Distinguir cumplimiento de carga (Capa 3, punto 4 del documento de
// mejoras): un kmPercent por encima del 100% ya se lee aquí siempre con
// el desglose real (planificado/realizado, ver abajo) -- lo que faltaba
// era decirlo con palabras en vez de dejar que un "114%" en grande se
// interprete implícitamente como "mejor cuanto más alto", igual que ya
// se evita ese mismo veredicto simplista en ACWR. classifyPlanOverage()
// (utils/planCompliance.js) decide "moderado"/"alto", nunca "bueno"/
// "malo" -- el texto de aquí tampoco lo hace.
const OVERAGE_NOTE_BY_TIER = {
    moderate: "Dentro de un margen razonable.",
    high: "Volumen por encima de lo previsto."
};

export function PlanComplianceWidget(compliance) {

    if (!compliance.hasPlan) return "";

    const { plannedKm, actualKm, kmPercent, sessionsCompleted, sessionsPlanned } = compliance;
    const overageTier = classifyPlanOverage(kmPercent);

    return `

        <section class="plan-compliance-widget">

            <span class="plan-compliance-label">CUMPLIMIENTO DEL PLAN</span>

            <p class="plan-compliance-km">

                Planificado: <strong>${formatKm(plannedKm)} km</strong> · Realizado: <strong>${formatKm(actualKm)} km</strong>

                ${kmPercent != null ? `<span class="plan-compliance-percent">${kmPercent}%</span>` : ""}

            </p>

            ${overageTier ? `<p class="plan-compliance-overage-note">${OVERAGE_NOTE_BY_TIER[overageTier]}</p>` : ""}

            <p class="plan-compliance-sessions">

                ${sessionsCompleted}/${sessionsPlanned} sesiones

            </p>

        </section>

    `;

}
