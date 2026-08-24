import { SEED_RACES } from "./seedRaces.js";
import { gymDays as DEFAULT_GYM_DAYS } from "./gymData.js";

const DB_NAME = "corredor-solido";
const DB_VERSION = 9;

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

// Reparación de una regresión real (no una migración nueva): reimportar un
// calendario de Murcia con el wizard pisaba el region ya migrado con null,
// porque importPlannedRaces() sobrescribía el registro entero con lo que
// trajera el archivo — y esos dos primeros archivos de Murcia no llevan
// "region" (se etiquetaron aquí, retroactivamente). Ya arreglado en
// importPlannedRaces() (conserva el region existente si la carrera entrante
// no trae uno), pero las instalaciones que reimportaron antes del fix se
// quedaron con esas carreras en null para siempre — REGION_MIGRATION_META_KEY
// ya está marcada como hecha y no se repite sola. Este segundo pase, bajo su
// propia clave de una sola vez, aplica el mismo criterio de la migración
// original (toda plannedRace sin region a estas alturas es de Murcia) para
// sanarlas sin que el usuario tenga que borrar y reimportar nada.
const REGION_REPAIR_META_KEY = "plannedRacesRegionRepairedV2";

// Migración incremental (no un seed): instalaciones YA EXISTENTES -- con
// datos previos del usuario, sean pocas plannedRaces o ninguna en
// absoluto -- reciben las carreras nuevas que seedRaces.js fue ganando
// desde que se sembraron por primera vez (Andalucía RU, trail Murcia,
// trail Andalucía). A diferencia de seedPlannedRacesIfNeeded(), que solo
// actúa si plannedRaces está vacío, esta se ejecuta SIEMPRE, tenga
// plannedRaces lo que tenga -- por eso vive fuera de esa función, como su
// propio paso en la cadena. Dedupe por fecha+nombre (mismo criterio que
// importPlannedRaces()) para no duplicar en quien ya las importó a mano
// con el wizard. Una sola vez por instalación, bajo su propia clave.
//
// CRÍTICO: solo toca plannedRaces y meta -- igual que el resto de
// migraciones de este archivo, nunca lee ni escribe workouts (entrenos
// reales) bajo ningún caso.
const INCREMENTAL_SEED_META_KEY = "plannedRacesIncrementalSeedV1";

// Las 44 de Murcia RU son las que ya recibían las instalaciones antiguas
// (el seed original, antes de que existiera nada más) -- todo lo demás en
// SEED_RACES es "nuevo" desde el punto de vista de esas instalaciones.
function isIncrementalSeedRace(race) {

    return !(race.region === "Murcia" && race.type === "RU");

}

function addMissingSeedRaces(transaction) {

    const metaStore = transaction.objectStore(STORES.meta);
    const getRequest = metaStore.get(INCREMENTAL_SEED_META_KEY);

    getRequest.onsuccess = () => {

        if (getRequest.result) return;

        const racesStore = transaction.objectStore(STORES.plannedRaces);
        const getAllRequest = racesStore.getAll();

        getAllRequest.onsuccess = () => {

            const existingKeys = new Set(
                getAllRequest.result.map(r => `${r.date}__${r.name}`)
            );

            SEED_RACES.filter(isIncrementalSeedRace).forEach(race => {

                const key = `${race.date}__${race.name}`;
                if (!existingKeys.has(key)) {
                    racesStore.put(race);
                }

            });

            metaStore.put({ key: INCREMENTAL_SEED_META_KEY, value: true });

        };

    };

}

export const STORES = {

    workouts: "workouts",
    shoes: "shoes",
    plannedSessions: "plannedSessions",
    meta: "meta",
    gymSessions: "gymSessions",
    gymRoutines: "gymRoutines",
    plannedRaces: "plannedRaces",
    customExercises: "customExercises"

};

// Rediseño de Gimnasio (constructor manual + gestión de rutinas): las 3
// rutinas que hasta ahora eran un fallback hardcodeado en gymData.js (sin
// registro real en gymRoutines, sin editar/borrar posible) pasan a ser
// registros reales y gestionables -- una rutina por día por defecto, mismo
// id de día/ejercicio que ya tenían (day1/day2/day3, press-banca...) para
// que el histórico de sesiones ya guardado (gymSessionStore, indexado por
// esos mismos ids) las siga encontrando sin romperse. Solo si gymRoutines
// está vacía en este momento -- un usuario que ya importó algo por PDF no
// recibe estas 3 de más.
const GYM_DEFAULT_ROUTINES_SEEDED_KEY = "gymDefaultRoutinesSeeded";

function seedDefaultGymRoutinesIfNeeded(transaction) {

    const metaStore = transaction.objectStore(STORES.meta);
    const getRequest = metaStore.get(GYM_DEFAULT_ROUTINES_SEEDED_KEY);

    getRequest.onsuccess = () => {

        if (getRequest.result) return;

        const routinesStore = transaction.objectStore(STORES.gymRoutines);
        const countRequest = routinesStore.count();

        countRequest.onsuccess = () => {

            if (countRequest.result === 0) {

                const now = new Date().toISOString();

                DEFAULT_GYM_DAYS.forEach(day => {

                    routinesStore.put({
                        id: `default-${day.id}`,
                        name: day.title,
                        days: [day],
                        progressionNote: "",
                        createdAt: now,
                        updatedAt: now
                    });

                });

            }

            metaStore.put({ key: GYM_DEFAULT_ROUTINES_SEEDED_KEY, value: true });

        };

    };

}

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
function fillMissingRegionWithMurcia(transaction, metaKey, onDone) {

    const metaStore = transaction.objectStore(STORES.meta);
    const getRequest = metaStore.get(metaKey);

    getRequest.onsuccess = () => {

        if (getRequest.result) {
            onDone?.();
            return;
        }

        const racesStore = transaction.objectStore(STORES.plannedRaces);
        const cursorRequest = racesStore.openCursor();

        cursorRequest.onsuccess = () => {

            const cursor = cursorRequest.result;

            if (!cursor) {
                metaStore.put({ key: metaKey, value: true });
                onDone?.();
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

function migrateMissingRegionToMurcia(transaction) {

    fillMissingRegionWithMurcia(transaction, REGION_MIGRATION_META_KEY, () => {
        fillMissingRegionWithMurcia(transaction, REGION_REPAIR_META_KEY, () => {
            addMissingSeedRaces(transaction);
        });
    });

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

    if (!db.objectStoreNames.contains(STORES.customExercises)) {

        db.createObjectStore(STORES.customExercises, { keyPath: "id" });

    }

    seedPlannedRacesIfNeeded(transaction);
    seedDefaultGymRoutinesIfNeeded(transaction);

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
