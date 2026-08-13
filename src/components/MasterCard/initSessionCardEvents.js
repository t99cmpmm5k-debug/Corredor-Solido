import { getState, setState } from "../../core/state.js";
import { rerender } from "../../core/router.js";

export function initSessionCardEvents() {

    const toggle = document.querySelector('[data-action="toggle-session-detail"]');
    if (!toggle) return;

    toggle.addEventListener("click", () => {
        setState("sessionDetailExpanded", !getState().sessionDetailExpanded);
        rerender();
    });

}
