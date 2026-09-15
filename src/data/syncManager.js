// Orquestador de sincronización continua (Fase 4) -- runSync() es el
// único punto real de sincronización, usado por los tres disparadores del
// plan (boot/primer plano, debounce tras escritura local, botón manual en
// Perfil) y también por el login normal y la verificación de cuenta (ver
// initAuthEvents.js), que antes tenían cada uno su propia lógica de push
// suelta.
import { STORES, get, put } from "./db.js";
import { getSyncableData, applyRestoreBatch } from "../utils/backup.js";
import { pushSync, pullSync } from "./syncApi.js";
import { getToken, clearToken, isLoggedIn } from "./authStore.js";
import { onDataChanged } from "./changeEvents.js";
import { navigate } from "../core/router.js";
import { Login } from "../pages/Auth/Auth.js";

const LAST_SYNC_KEY = "lastSyncAt";
const DEBOUNCE_MS = 4000;

let lastSyncAt = null;
let offline = false;
let syncing = false;
let rerunRequested = false;
let debounceTimer = null;

export function hydrateSyncMeta() {

    return get(STORES.meta, LAST_SYNC_KEY).then(record => {
        lastSyncAt = record ? record.value : null;
    }).catch(() => {});

}

function setLastSyncAt(iso) {

    lastSyncAt = iso;
    return put(STORES.meta, { key: LAST_SYNC_KEY, value: iso }).catch(() => {});

}

export function getLastSyncAt() {

    return lastSyncAt;

}

export function isSyncOffline() {

    return offline;

}

// push-antes-de-pull, siempre en ese orden -- nunca al revés. Los
// restoreX() de applyRestoreBatch() hacen upsert ciego por id (sin
// comparar fechas), así que un pull que llegara ANTES de subir una
// edición local reciente podría pisarla con una versión más vieja del
// servidor sin avisar. Subiendo primero, el propio servidor ya tiene nuestra
// versión más fresca (su NOW(), ver server/src/routes/sync.js) antes de
// pedir nada de vuelta -- el pull nunca puede traer algo más viejo que lo
// que ya tenemos.
// Devuelve un status ("ok"/"offline"/"unauthorized"/"error"/"busy"/
// "skipped") -- los disparadores de fondo (boot, foreground, debounce) lo
// ignoran, pero el botón manual de Perfil lo usa para dar feedback preciso
// en vez de asumir éxito solo porque la promesa no rechazó (runSync() nunca
// rechaza, se traga sus propios errores a propósito, ver más abajo).
export async function runSync(trigger) {

    if (!isLoggedIn()) return "skipped";

    if (syncing) {
        rerunRequested = true;
        return "busy";
    }

    syncing = true;
    let status = "ok";

    try {

        const token = getToken();

        await pushSync(getSyncableData(), token);
        const remote = await pullSync(token);

        applyRestoreBatch(remote);

        offline = false;
        await setLastSyncAt(new Date().toISOString());

    } catch (err) {

        if (err.code === "UNAUTHORIZED") {

            status = "unauthorized";
            clearToken();
            navigate(Login);

        } else if (err.code === "OFFLINE") {

            // Sin navigator.onLine (no es fiable) -- cualquier fallo real
            // de fetch/timeout ya viene marcado como OFFLINE desde
            // syncApi.js. No hay bucle de reintento activo: se reintenta
            // solo en el próximo disparador natural (próxima escritura,
            // próximo primer plano, próximo toque del botón manual).
            status = "offline";
            offline = true;

        } else {

            status = "error";
            console.warn(`No se pudo sincronizar (${trigger}) -- se reintentará en el próximo disparador.`, err);

        }

    } finally {

        syncing = false;

        if (rerunRequested) {
            rerunRequested = false;
            runSync("rerun");
        }

    }

    return status;

}

function scheduleDebouncedSync() {

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => runSync("debounced-write"), DEBOUNCE_MS);

}

// Se llama una sola vez desde main.js, sin condicionar a si hay sesión --
// la comprobación isLoggedIn() vive dentro de runSync(), así que esto
// sigue siendo correcto aunque el login llegue más tarde en la misma
// sesión (initAuthEvents.js ya llama a runSync() explícitamente justo tras
// un login/verificación, no hace falta reinicializar nada aquí).
export function initContinuousSync() {

    onDataChanged(scheduleDebouncedSync);

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") runSync("foreground");
    });

    if (isLoggedIn()) runSync("boot");

}
