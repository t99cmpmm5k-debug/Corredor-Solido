import { setState } from "./state";
import { render } from "./render";

export function start(page) {

    setState("currentPage", page);

    render();

}

export function navigate(page) {

    setState("currentPage", page);

    render();

}

export function rerender() {

    render();

}