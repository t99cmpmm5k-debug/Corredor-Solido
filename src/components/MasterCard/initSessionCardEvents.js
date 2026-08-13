import { getState, setState } from "../../core/state.js";
import { rerender } from "../../core/router.js";

export function initSessionCardEvents() {

    // Cada botón se cablea por separado -- un early return compartido
    // dejaba el de "Cambiar" sin cablear en cualquier sesión sin
    // description (sin botón "Ver entrenamiento" que buscar primero).
    const detailToggle = document.querySelector('[data-action="toggle-session-detail"]');
    if (detailToggle) {
        detailToggle.addEventListener("click", () => {
            setState("sessionDetailExpanded", !getState().sessionDetailExpanded);
            rerender();
        });
    }

    const weekPickerToggle = document.querySelector('[data-action="toggle-week-picker"]');
    if (weekPickerToggle) {
        weekPickerToggle.addEventListener("click", () => {
            setState("weekPickerExpanded", !getState().weekPickerExpanded);
            rerender();
        });
    }

}
