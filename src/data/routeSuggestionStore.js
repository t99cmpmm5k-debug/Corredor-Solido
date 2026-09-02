// Descartes de sugerencias de agrupación automática de recorridos
// (Running / Recorridos de referencia) -- cuando el usuario descarta la
// sugerencia para un par concreto de entrenos, se recuerda para no
// volver a sugerírsela. Store propia en IndexedDB (STORES.routeSuggestionDismissals,
// ver db.js), mismo patrón que referenceRouteStore.js: id = par de
// workoutIds ordenado y unido, para no depender de en qué orden se
// generó la sugerencia.
import { STORES, getAll, put } from "./db.js";

const dismissals = [];

let hydrated = null;

export function hydrate() {

    if (hydrated) return hydrated;

    hydrated = getAll(STORES.routeSuggestionDismissals).then(loaded => {

        dismissals.push(...loaded);

    }).catch(err => {

        console.warn("No se pudieron cargar los descartes de sugerencias de recorrido — la app sigue sin persistencia.", err);

    });

    return hydrated;

}

// Orden estable independiente de en qué orden se pasen los dos ids -- así
// da igual si la sugerencia se generó como (A, B) o (B, A).
export function routeSuggestionPairKey(workoutIdA, workoutIdB) {

    return [workoutIdA, workoutIdB].sort().join("::");

}

export function getDismissedPairKeys() {

    return new Set(dismissals.map(d => d.id));

}

export function isSuggestionDismissed(workoutIdA, workoutIdB) {

    const key = routeSuggestionPairKey(workoutIdA, workoutIdB);
    return dismissals.some(d => d.id === key);

}

export function dismissRouteSuggestion(workoutIdA, workoutIdB) {

    const key = routeSuggestionPairKey(workoutIdA, workoutIdB);
    if (dismissals.some(d => d.id === key)) return;

    const record = {
        id: key,
        workoutIdA,
        workoutIdB,
        dismissedAt: new Date().toISOString()
    };

    dismissals.push(record);
    put(STORES.routeSuggestionDismissals, record).catch(() => {});

}
