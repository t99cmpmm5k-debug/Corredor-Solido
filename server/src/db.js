import mysql from "mysql2/promise";

// Pool de conexiones (no una conexión suelta) -- reutiliza conexiones
// entre peticiones en vez de abrir una nueva por cada request.
export const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 10
});
