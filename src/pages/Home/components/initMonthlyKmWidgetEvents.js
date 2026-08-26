import { getState, setState } from "../../../core/state.js";
import { rerender } from "../../../core/router.js";

// Tocar una barra del gráfico mensual (ver MonthlyKmWidget.js) muestra
// el detalle real de ese mes; tocar la MISMA barra otra vez lo quita
// (toggle) -- selectedMonthKey vive en core/state.js, propio de este
// widget.
export function initMonthlyKmWidgetEvents() {

    document.querySelectorAll('.monthly-km-bar[data-action="select-month"]').forEach(bar => {

        bar.addEventListener("click", () => {

            const monthKey = bar.dataset.monthKey;
            const current = getState().selectedMonthKey;

            setState("selectedMonthKey", current === monthKey ? null : monthKey);
            rerender();

        });

    });

}
