import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const communityRouter = Router();

communityRouter.use(requireAuth);

// Solo el tipo "easy" (Rodaje/Z2, ver src/data/runningWorkoutTypes.js del
// frontend -- "Z2" es la etiqueta visible, "easy" es el id real que
// guardan los entrenos) trae FC media en esta respuesta -- es el único
// dato adicional que de verdad usa "Evolución Z2" en el cliente
// (buildTypeEvolution() en runningEvolution.js: date + avgPaceSecPerKm,
// que ya van en todos, + avgHr). Nunca se manda FC de otros tipos aquí --
// no la pide esta fase, y cuanta menos fisiología de más gente circule,
// mejor.
const Z2_TYPE = "easy";

// Reduce el JSON completo de un entreno (columna `data`, ver migrations/
// 001_init.sql) a SOLO los campos que esta fase necesita exponer --
// lista blanca explícita, nunca una resta ("todo menos email/password").
// Cualquier campo nuevo que se añada a Workout en el futuro (dayState,
// importWarnings, fieldMeta, calorías, ubicación de texto...) queda
// excluido por defecto sin tener que acordarse de excluirlo aquí -- solo
// sale lo que se copia a mano.
function toPublicEntreno(alias, workout) {

    const entreno = {

        alias,
        id: workout.id ?? null,
        type: workout.type ?? null,
        date: workout.date ?? null,
        distanceKm: workout.distanceKm ?? null,
        avgPaceSecPerKm: workout.avgPaceSecPerKm ?? null,
        durationSec: workout.durationSec ?? null

    };

    // Mismo umbral que hasRouteTrace() en el frontend (components/RouteMap/
    // RouteMap.js) -- un único punto no es un recorrido real que dibujar en
    // el mapa agregado.
    if (Array.isArray(workout.routeTrace) && workout.routeTrace.length >= 2) {
        entreno.routeTrace = workout.routeTrace;
    }

    if (workout.type === Z2_TYPE && workout.avgHr != null) {
        entreno.avgHr = workout.avgHr;
    }

    return entreno;

}

// alias público a partir del email -- el esquema actual (migrations/
// 001_init.sql) no tiene ningún campo de nombre/alias propio, solo email.
// Exponer el email completo violaría el requisito explícito de esta fase
// ("excluir... email"), así que se usa la parte local (antes de la @) como
// alias de andar por casa -- decisión de diseño dada la falta de un campo
// mejor, no un dato ya pensado para mostrarse en público. Si esto pasa de
// dos usuarios (Fase 2, ranking con más gente), probablemente merezca su
// propio campo real en la tabla users.
function aliasFromEmail(email) {
    return email.split("@")[0];
}

// Exportado aparte del wiring de la ruta (communityRouter.get de más abajo)
// para poder testear la lógica real (whitelist de campos, filtrado de
// FC/routeTrace, usuario sin entrenos) con un pool mockeado, sin montar un
// servidor Express de verdad -- mismo patrón que routes/tiles.js.
//
// Sin filtro de fecha a propósito (pedido explícito de esta fase) -- cada
// pantalla que consuma esto (Fase 1 Mapas, Fase 2 Ranking) decide su
// propia ventana de tiempo en el cliente.
export async function getCommunityEntrenos(req, res) {

    const [rows] = await pool.execute(
        `SELECT u.email AS email, w.data AS data
         FROM workouts w
         JOIN users u ON u.id = w.user_id`
    );

    const entrenos = rows.map(row => toPublicEntreno(aliasFromEmail(row.email), row.data));

    res.json({ entrenos });

}

communityRouter.get("/entrenos", getCommunityEntrenos);
