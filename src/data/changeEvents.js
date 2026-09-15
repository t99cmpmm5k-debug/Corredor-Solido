// Pub-sub minúsculo para desacoplar los stores (workoutStore.js,
// gymSessionStore.js, referenceRouteStore.js) de syncManager.js -- los
// stores no saben que existe sincronización, solo avisan de "algo
// cambió". Si syncManager.js importara directamente el store para
// suscribirse, y el store importara syncManager.js para notificar,
// tendríamos un ciclo de imports; este módulo hoja (sin dependencias)
// rompe ese ciclo.
const listeners = new Set();

export function notifyDataChanged() {
    listeners.forEach(fn => fn());
}

export function onDataChanged(fn) {

    listeners.add(fn);
    return () => listeners.delete(fn);

}
