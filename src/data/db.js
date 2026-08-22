import { SEED_RACES } from "./seedRaces.js";

const DB_NAME = "corredor-solido";
const DB_VERSION = 6;

// Bookkeeping en meta (misma store que lastExportAt, ver backup.js) — se
// escribe una sola vez, la primera vez que esta instalación pasa por
// onupgradeneeded con esta lógica ya presente. Deliberadamente NO se
// vuelve a comprobar en cada arranque futuro: así, si un usuario borra a
// mano todas sus plannedRaces más adelante, una subida de DB_VERSION por
// una función totalmente distinta no las vuelve a traer de vuelta.
const SEED_RACES_META_KEY = "plannedRacesSeeded";

// Migración de datos: plannedRaces existentes de antes de que existiera el
// campo "region" (el filtro Andalucía/Murcia de Carreras) se quedaron sin
// él. Todas las carreras importadas hasta ahora (seed de fábrica incluido)
// son de la Región de Murcia y alrededores, así que se etiquetan
// retroactivamente con "Murcia" — una sola vez por instalación, igual que
// el flag de seedPlannedRacesIfNeeded(). Solo toca el campo region, nunca
// pisa ni duplica el resto del registro.
const REGION_MIGRATION_META_KEY = "plannedRacesRegionMigrated";
const LEGACY_PLANNED_RACES_REGION = "Murcia";

export const STORES = {

    workouts: "workouts",
    shoes: "shoes",
    plannedSessions: "plannedSessions",
    meta: "meta",
    gymSessions: "gymSessions",
    gymRoutines: "gymRoutines",
    plannedRaces: "plannedRaces"

};

let dbPromise = null;
let storageAvailable = true;

export function isStorageAvailable() {

    return storageAvailable;

}

// Precarga plannedRaces con el calendario de fábrica (src/data/seedRaces.js)
// SOLO la primera vez que esta instalación pasa por aquí, y SOLO si
// plannedRaces está vacío en ese momento — un usuario que ya tenía sus
// propias carreras importadas (o que ya recibió el seed antes) no se
// toca. Usa la misma transacción de versionchange que el resto de
// upgrade(): en onupgradeneeded esa transacción da acceso a CUALQUIER
// store ya existente, no solo a las que se crean en esta pasada — no
// hace falta abrir una transacción aparte.
//
// CRÍTICO: esto no lee ni escribe workouts (entrenos reales) en ningún
// caso — solo toca meta (el flag de "ya se decidió") y plannedRaces.
//
// migrateMissingRegionToMurcia() se llama siempre desde dentro de esta
// misma cadena, nunca en paralelo desde upgrade() — una transacción de
// IndexedDB procesa las peticiones en el orden en que se encolan, así que
// si la migración abriera su propio cursor por su cuenta podría
// procesarse ANTES de que las filas recién sembradas lleguen a existir,
// dejándolas sin region para siempre (su propio flag ya habría quedado
// marcado como hecho). Encolarla aquí, después del seed en las dos ramas
// (ya sembrado antes / sembrando ahora mismo), garantiza que siempre ve
// el estado ya sembrado de plannedRaces.
function seedPlannedRacesIfNeeded(transaction) {

    const metaStore = transaction.objectStore(STORES.meta);
    const getRequest = metaStore.get(SEED_RACES_META_KEY);

    getRequest.onsuccess = () => {

        if (getRequest.result) {
            migrateMissingRegionToMurcia(transaction);
            return;
        }

        const racesStore = transaction.objectStore(STORES.plannedRaces);
        const countRequest = racesStore.count();

        countRequest.onsuccess = () => {

            if (countRequest.result === 0) {
                SEED_RACES.forEach(race => racesStore.put(race));
            }

            metaStore.put({ key: SEED_RACES_META_KEY, value: true });

            migrateMissingRegionToMurcia(transaction);

        };

    };

}

// Ver el comentario junto a REGION_MIGRATION_META_KEY. Recorre plannedRaces
// con un cursor de escritura (no getAll + put suelto) para poder actualizar
// cada registro completo tal cual está, tocando solo "region" — igual de
// seguro dentro de la misma transacción de versionchange que
// seedPlannedRacesIfNeeded().
function migrateMissingRegionToMurcia(transaction) {

    const metaStore = transaction.objectStore(STORES.meta);
    const getRequest = metaStore.get(REGION_MIGRATION_META_KEY);

    getRequest.onsuccess = () => {

        if (getRequest.result) return;

        const racesStore = transaction.objectStore(STORES.plannedRaces);
        const cursorRequest = racesStore.openCursor();

        cursorRequest.onsuccess = () => {

            const cursor = cursorRequest.result;

            if (!cursor) {
                metaStore.put({ key: REGION_MIGRATION_META_KEY, value: true });
                return;
            }

            const race = cursor.value;

            if (race.region == null) {
                cursor.update({ ...race, region: LEGACY_PLANNED_RACES_REGION });
            }

            cursor.continue();

        };

    };

}

// Cada store se crea solo si no existe ya — onupgradeneeded se dispara con
// TODAS las stores anteriores ya presentes en una DB real (no solo en una
// nueva), así que crear sin comprobar revienta con "store already exists"
// en cuanto se sube DB_VERSION para añadir una store nueva.
function upgrade(db, transaction) {

    if (!db.objectStoreNames.contains(STORES.workouts)) {

        const workouts = db.createObjectStore(STORES.workouts, { keyPath: "id" });
        workouts.createIndex("date", "date", { unique: false });
        workouts.createIndex("shoeId", "shoeId", { unique: false });
        workouts.createIndex("linkedSessionId", "linkedSessionId", { unique: false });

    }

    if (!db.objectStoreNames.contains(STORES.shoes)) {

        const shoes = db.createObjectStore(STORES.shoes, { keyPath: "id" });
        shoes.createIndex("status", "status", { unique: false });

    }

    if (!db.objectStoreNames.contains(STORES.plannedSessions)) {

        const plannedSessions = db.createObjectStore(STORES.plannedSessions, { keyPath: "id" });
        plannedSessions.createIndex("date", "date", { unique: false });
        plannedSessions.createIndex("weekStartDate", "weekStartDate", { unique: false });

    }

    if (!db.objectStoreNames.contains(STORES.meta)) {

        db.createObjectStore(STORES.meta, { keyPath: "key" });

    }

    if (!db.objectStoreNames.contains(STORES.gymSessions)) {

        const gymSessions = db.createObjectStore(STORES.gymSessions, { keyPath: "id" });
        gymSessions.createIndex("date", "date", { unique: false });
        gymSessions.createIndex("dayId", "dayId", { unique: false });

    }

    if (!db.objectStoreNames.contains(STORES.gymRoutines)) {

        db.createObjectStore(STORES.gymRoutines, { keyPath: "id" });

    }

    if (!db.objectStoreNames.contains(STORES.plannedRaces)) {

        const plannedRaces = db.createObjectStore(STORES.plannedRaces, { keyPath: "id" });
        plannedRaces.createIndex("date", "date", { unique: false });

    }

    seedPlannedRacesIfNeeded(transaction);

}

export function openDB() {

    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => upgrade(request.result, request.transaction);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);

    }).catch(err => {

        storageAvailable = false;
        throw err;

    });

    return dbPromise;

}

function withStore(storeName, mode, run) {

    return openDB().then(db => new Promise((resolve, reject) => {

        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const request = run(store);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);

    }));

}

export function getAll(storeName) {

    return withStore(storeName, "readonly", store => store.getAll());

}

export function get(storeName, key) {

    return withStore(storeName, "readonly", store => store.get(key));

}

export function getAllByIndex(storeName, indexName, value) {

    return openDB().then(db => new Promise((resolve, reject) => {

        const tx = db.transaction(storeName, "readonly");
        const request = tx.objectStore(storeName).index(indexName).getAll(value);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);

    }));

}

export function put(storeName, record) {

    return withStore(storeName, "readwrite", store => store.put(record));

}

export function remove(storeName, key) {

    return withStore(storeName, "readwrite", store => store.delete(key));

}
