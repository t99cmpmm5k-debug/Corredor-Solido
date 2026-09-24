// Mapa clave-del-JSON -> tabla SQL -- una entrada por cada store real del
// cliente (ver src/utils/backup.js del frontend, exportData()/importData()).
// Única fuente de verdad para qué tablas participan en el sync: añadir un
// store nuevo en el cliente algún día significa añadir una línea aquí Y su
// CREATE TABLE en migrations/, nunca solo uno de los dos (mismo aviso que
// ya existe en el propio backup.js del frontend).
export const SYNC_TABLES = {
    workouts: "workouts",
    shoes: "shoes",
    plannedSessions: "planned_sessions",
    gymSessions: "gym_sessions",
    referenceRoutes: "reference_routes",
    gymRoutines: "gym_routines",
    bodyComposition: "body_composition",
    nutritionEntries: "nutrition_entries",
    dietPlans: "diet_plans",
    dietChecks: "diet_checks",
    dietWeekends: "diet_weekends",
    // No es un store de datos reales -- son los borrados pendientes de
    // propagar (ver src/data/tombstoneStore.js del cliente). Se guarda con
    // el mismo pipeline genérico de arriba, pero además dispara un DELETE
    // real sobre su tabla de origen (ver routes/sync.js POST) -- sin eso,
    // el push seguiría siendo puramente aditivo y un borrado ya
    // sincronizado antes resucitaría en el próximo pull.
    tombstones: "deleted_records"
};

export const SYNC_KEYS = Object.keys(SYNC_TABLES);
