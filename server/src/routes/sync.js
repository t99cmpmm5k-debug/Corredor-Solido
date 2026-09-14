import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { SYNC_TABLES, SYNC_KEYS } from "../syncTables.js";

export const syncRouter = Router();

syncRouter.use(requireAuth);

// Devuelve TODO lo que el servidor tiene guardado para este usuario, en el
// mismo formato que exportData()/importData() del cliente (backup.js) --
// así el cliente lo fusiona con lo local usando su propio mecanismo de
// "por id" ya existente, sin inventar un formato de respuesta distinto.
syncRouter.get("/", async (req, res) => {

    const result = {};

    for (const [key, table] of Object.entries(SYNC_TABLES)) {

        const [rows] = await pool.execute(
            `SELECT data FROM ${table} WHERE user_id = ?`,
            [req.userId]
        );

        result[key] = rows.map(row => row.data);

    }

    res.json(result);

});

// Recibe el mismo JSON que ya produce "Exportar mis datos" (workouts,
// shoes, plannedSessions, gymSessions, referenceRoutes) y guarda cada
// registro POR ID. También es el camino de la migración inicial: la
// primera vez que un usuario sincroniza, el servidor está vacío para él,
// así que este mismo endpoint con todo el histórico local ES la migración
// -- no hay un endpoint aparte para eso (confirmado con el usuario).
//
// Conflicto: last-write-wins con el reloj del SERVIDOR (NOW()), nunca con
// un timestamp que venga del dispositivo -- regla confirmada, ver
// migrations/001_init.sql para el razonamiento completo.
syncRouter.post("/", async (req, res) => {

    const body = req.body ?? {};
    const savedCounts = {};

    for (const key of SYNC_KEYS) {

        const records = body[key];
        if (!Array.isArray(records)) continue;

        const table = SYNC_TABLES[key];
        let saved = 0;

        for (const record of records) {

            if (!record || typeof record.id !== "string") continue;

            await pool.execute(
                `INSERT INTO ${table} (user_id, id, data, updated_at) VALUES (?, ?, ?, NOW())
                 ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = NOW()`,
                [req.userId, record.id, JSON.stringify(record)]
            );

            saved++;

        }

        savedCounts[key] = saved;

    }

    res.json({ saved: savedCounts });

});
