// feedback: { type: "success" | "error", text } | null — resultado de la
// última exportación/importación, se limpia al iniciar una acción nueva.
let feedback = null;

export function getFeedback() {

    return feedback;

}

export function setFeedback(next) {

    feedback = next;

}
