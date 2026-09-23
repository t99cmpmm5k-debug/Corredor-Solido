import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { SYNC_TABLES, SYNC_KEYS } from "../syncTables.js";

export const syncRouter = Router();

syncRouter.use(requireAuth);

// Una tabla de SYNC_TABLES cuya migración aún no se ha aplicado en este
// servidor (p. ej. gym_routines, migrations/007, si el código se despliega
// antes que el SQL) se salta con un aviso en el log en vez de tumbar TODO
// el sync con un 500 -- el resto de tablas de todos los usuarios sigue
// sincronizando igual, y en cuanto exista la tabla esos registros entran
// en el siguiente push (el cliente siempre manda su foto completa).
function isMissingTable(err) {

    return err?.code === "ER_NO_SUCH_TABLE";

}

function warnMissingTable(table) {

    console.warn(`[sync] La tabla ${table} no existe todavía -- falta aplicar su migración. Se omite.`);

}

// Devuelve TODO lo que el servidor tiene guardado para este usuario, en el
// mismo formato que exportData()/importData() del cliente (backup.js) --
// así el cliente lo fusiona con lo local usando su propio mecanismo de
// "por id" ya existente, sin inventar un formato de respuesta distinto.
export async function getSync(req, res) {

    const result = {};

    for (const [key, table] of Object.entries(SYNC_TABLES)) {

        try {

            const [rows] = await pool.execute(
                `SELECT data FROM ${table} WHERE user_id = ?`,
                [req.userId]
            );

            result[key] = rows.map(row => row.data);

        } catch (err) {

            if (!isMissingTable(err)) throw err;
            warnMissingTable(table);
            result[key] = [];

        }

    }

    res.json(result);

}

// Recibe el mismo JSON que ya produce "Exportar mis datos" (workouts,
// shoes, plannedSessions, gymSessions, referenceRoutes, gymRoutines) y
// guarda cada registro POR ID. También es el camino de la migración
// inicial: la primera vez que un usuario sincroniza, el servidor está
// vacío para él, así que este mismo endpoint con todo el histórico local
// ES la migración -- no hay un endpoint aparte para eso (confirmado con el
// usuario). Lo mismo vale para un store que se incorpora después al sync
// (gymRoutines): el primer push tras el cambio sube lo que ya había en
// local, y los siguientes actualizan esas mismas filas por id, sin duplicar.
//
// Conflicto: last-write-wins con el reloj del SERVIDOR (NOW()), nunca con
// un timestamp que venga del dispositivo -- regla confirmada, ver
// migrations/001_init.sql para el razonamiento completo.
export async function postSync(req, res) {

    const body = req.body ?? {};
    const savedCounts = {};

    for (const key of SYNC_KEYS) {

        const records = body[key];
        if (!Array.isArray(records)) continue;

        const table = SYNC_TABLES[key];
        let saved = 0;

        try {

            for (const record of records) {

                if (!record || typeof record.id !== "string") continue;

                await pool.execute(
                    `INSERT INTO ${table} (user_id, id, data, updated_at) VALUES (?, ?, ?, NOW())
                     ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = NOW()`,
                    [req.userId, record.id, JSON.stringify(record)]
                );

                saved++;

            }

        } catch (err) {

            if (!isMissingTable(err)) throw err;
            warnMissingTable(table);

        }

        savedCounts[key] = saved;

    }

    // Las tombstones no solo se guardan como un registro más (bucle
    // genérico de arriba, tabla deleted_records) -- disparan además el
    // borrado REAL de la fila referenciada en su tabla de origen. Sin este
    // paso el push seguiría siendo puramente aditivo y el borrado nunca se
    // propagaría (ver migrations/003_tombstones.sql para el porqué).
    const tombstones = Array.isArray(body.tombstones) ? body.tombstones : [];

    for (const tombstone of tombstones) {

        if (!tombstone || typeof tombstone.recordId !== "string") continue;

        const targetTable = SYNC_TABLES[tombstone.storeKey];
        if (!targetTable) continue;

        try {

            await pool.execute(
                `DELETE FROM ${targetTable} WHERE user_id = ? AND id = ?`,
                [req.userId, tombstone.recordId]
            );

        } catch (err) {

            if (!isMissingTable(err)) throw err;
            warnMissingTable(targetTable);

        }

    }

    res.json({ saved: savedCounts });

}

syncRouter.get("/", getSync);
syncRouter.post("/", postSync);
