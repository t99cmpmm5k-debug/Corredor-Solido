// Recorridos de referencia (Running, V1) -- agrupan entrenos YA
// IMPORTADOS (por id) hechos en el mismo recorrido, para comparar
// eficiencia aeróbica entre ellos (ver runningEfficiency.js). Store propia
// en IndexedDB (STORES.referenceRoutes, ver db.js) en vez de un campo en
// `workouts` -- así un entreno que nunca se asigna a ningún recorrido no
// cambia de forma, y la relación vive en un solo sitio (workoutIds en el
// recorrido) en vez de tener que mantener sincronizados dos lados.
//
// Un entreno pertenece como mucho a UN recorrido a la vez (v1, decisión
// explícita: "asignar entrenamientos ya existentes... el usuario elige
// cuáles" no pide pertenencia múltiple) -- assignWorkoutToRoute() se
// encarga de quitarlo de cualquier otro recorrido antes de meterlo en el
// nuevo, para que esa regla no dependa de que quien llame se acuerde de
// desasignar primero.
import { STORES, getAll, put, remove } from "./db.js";
import { generateId } from "../utils/id.js";

const routes = [];

let hydrated = null;

export function hydrate() {

    if (hydrated) return hydrated;

    hydrated = getAll(STORES.referenceRoutes).then(loaded => {

        routes.push(...loaded);

    }).catch(err => {

        console.warn("No se pudieron cargar los recorridos de referencia — la app sigue sin persistencia.", err);

    });

    return hydrated;

}

export function getReferenceRoutes() {

    return routes;

}

export function getReferenceRouteById(id) {

    return routes.find(r => r.id === id) || null;

}

// Cuál recorrido (si alguno) ya tiene este entreno -- O(recorridos), en la
// práctica un puñado, nunca miles: barato de sobra para no necesitar un
// índice inverso.
export function getReferenceRouteForWorkout(workoutId) {

    return routes.find(r => r.workoutIds.includes(workoutId)) || null;

}

function upsertInto(route) {

    const index = routes.findIndex(r => r.id === route.id);
    if (index === -1) routes.push(route);
    else routes[index] = route;

    return put(STORES.referenceRoutes, route).catch(() => {});

}

export function createReferenceRoute(name) {

    const now = new Date().toISOString();

    const route = {
        id: generateId(),
        name,
        workoutIds: [],
        createdAt: now,
        updatedAt: now
    };

    routes.push(route);

    return put(STORES.referenceRoutes, route).then(() => route);

}

export function renameReferenceRoute(id, name) {

    const route = getReferenceRouteById(id);
    if (!route) return null;

    route.name = name;
    route.updatedAt = new Date().toISOString();

    upsertInto(route);

    return route;

}

export function deleteReferenceRoute(id) {

    const index = routes.findIndex(r => r.id === id);
    if (index === -1) return;

    routes.splice(index, 1);
    remove(STORES.referenceRoutes, id).catch(() => {});

}

// Saca `workoutId` de cualquier recorrido que lo tuviera -- paso previo de
// assignWorkoutToRoute() (regla de "un recorrido como mucho") y también la
// operación real de "Sin recorrido" en el selector (ver initRunningEvents.js).
export function unassignWorkoutFromReferenceRoutes(workoutId) {

    const current = getReferenceRouteForWorkout(workoutId);
    if (!current) return;

    current.workoutIds = current.workoutIds.filter(id => id !== workoutId);
    current.updatedAt = new Date().toISOString();

    upsertInto(current);

}

// null routeId == "quitar de cualquier recorrido, sin asignar a ninguno"
// (equivalente a llamar solo a unassignWorkoutFromReferenceRoutes) -- un
// único punto de entrada para el <select> del menú "···", que solo conoce
// "qué recorrido se eligió" (o "" para ninguno), no si hace falta
// desasignar primero.
export function assignWorkoutToRoute(routeId, workoutId) {

    unassignWorkoutFromReferenceRoutes(workoutId);

    if (!routeId) return null;

    const route = getReferenceRouteById(routeId);
    if (!route) return null;

    route.workoutIds = [...route.workoutIds, workoutId];
    route.updatedAt = new Date().toISOString();

    upsertInto(route);

    return route;

}
