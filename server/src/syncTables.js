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
    referenceRoutes: "reference_routes"
};

export const SYNC_KEYS = Object.keys(SYNC_TABLES);
