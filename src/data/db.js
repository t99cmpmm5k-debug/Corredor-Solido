const DB_NAME = "corredor-solido";
const DB_VERSION = 1;

export const STORES = {

    workouts: "workouts",
    shoes: "shoes",
    plannedSessions: "plannedSessions",
    meta: "meta"

};

let dbPromise = null;
let storageAvailable = true;

export function isStorageAvailable() {

    return storageAvailable;

}

function upgrade(db) {

    const workouts = db.createObjectStore(STORES.workouts, { keyPath: "id" });
    workouts.createIndex("date", "date", { unique: false });
    workouts.createIndex("shoeId", "shoeId", { unique: false });
    workouts.createIndex("linkedSessionId", "linkedSessionId", { unique: false });

    const shoes = db.createObjectStore(STORES.shoes, { keyPath: "id" });
    shoes.createIndex("status", "status", { unique: false });

    const plannedSessions = db.createObjectStore(STORES.plannedSessions, { keyPath: "id" });
    plannedSessions.createIndex("date", "date", { unique: false });
    plannedSessions.createIndex("weekStartDate", "weekStartDate", { unique: false });

    db.createObjectStore(STORES.meta, { keyPath: "key" });

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
