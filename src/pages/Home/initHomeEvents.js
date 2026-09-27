import { navigate } from "../../core/router.js";
import { Carreras } from "../Carreras/Carreras.js";
import { openPlannedRaceDetail } from "../Carreras/initCarrerasEvents.js";
import { Plan } from "../Plan/Plan.js";
import { openPlanImport } from "../Plan/initPlanEvents.js";

// "Tu próximo objetivo" (NextGoalWidget, rediseño de Inicio 2026-09-25) --
// toda la tarjeta abre el detalle real de esa carrera: salta a Carreras y
// abre directamente su overlay de detalle (openPlannedRaceDetail(),
// exportada de initCarrerasEvents.js) -- mismo patrón que
// viewSessionWorkout()/openRaceEntry() ya usan en otros sitios del
// proyecto (navigate(Página) + abrir directamente el paso concreto).
export function initHomeEvents() {

    document.querySelector('[data-action="open-goal-race"]')?.addEventListener("click", event => {

        const raceId = event.currentTarget.dataset.raceId;
        if (!raceId) return;

        navigate(Carreras);
        openPlannedRaceDetail(raceId);

    });

    // "Importar plan ›" del estado vacío de "Plan de esta semana" (ajuste
    // final de Inicio 2026-09-28) -- mismo patrón que arriba: salta a Plan
    // y abre directamente su importador ya existente (openPlanImport(),
    // exportada de Plan/initPlanEvents.js), nunca una pantalla nueva.
    document.querySelector('[data-action="import-plan"]')?.addEventListener("click", () => {

        navigate(Plan);
        openPlanImport();

    });

}
