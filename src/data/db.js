const DB_NAME = "corredor-solido";
const DB_VERSION = 4;

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

// Cada store se crea solo si no existe ya — onupgradeneeded se dispara con
// TODAS las stores anteriores ya presentes en una DB real (no solo en una
// nueva), así que crear sin comprobar revienta con "store already exists"
// en cuanto se sube DB_VERSION para añadir una store nueva.
function upgrade(db) {

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

}

export function openDB() {

    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => upgrade(request.result);
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
