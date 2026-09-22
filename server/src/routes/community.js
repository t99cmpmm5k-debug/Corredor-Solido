import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const communityRouter = Router();

communityRouter.use(requireAuth);

// Solo el tipo "easy" (Rodaje/Z2, ver src/data/runningWorkoutTypes.js del
// frontend -- "Z2" es la etiqueta visible, "easy" es el id real que
// guardan los entrenos) trae FC media y % en zona en esta respuesta --
// nunca se manda ninguna de las dos de otro tipo: no la pide ninguna
// pantalla que consuma esto (Evolución Z2 en Home/Running, Ranking Fase 2
// en Comunidad), y cuanta menos fisiología de más gente circule, mejor.
const Z2_TYPE = "easy";

// Rango fijo de pulsaciones tratado como "Zona 2" para TODA la comunidad --
// confirmado con el usuario. No hay ningún perfil de FC máxima/reposo real
// por usuario en la app (ni Karvonen ni %FCmax), así que un rango fijo es
// una aproximación deliberada, igual para todos, no un cálculo personalizado
// por corredor.
const Z2_MIN_HR_BPM = 130;
const Z2_MAX_HR_BPM = 150;

// % de tiempo dentro de Zona 2 de un entreno -- aproximado a partir de los
// splits ya guardados (avgHr/paceSecPerKm/distanceKm por km), no hay ningún
// cálculo real de esto en el frontend que reutilizar ("Evolución Z2",
// runningEvolution.js, compara ritmo/FC entre el PRIMER y el ÚLTIMO entreno
// de una tanda, nunca un porcentaje dentro de un entreno) ni muestreo de FC
// segundo a segundo en ningún entreno de la app (Garmin OCR/GPX/TCX nunca lo
// capturan) del que derivar un tiempo-en-zona real. Cada split pesa por su
// duración estimada (distanceKm * paceSecPerKm), no como split suelto -- un
// km más lento representa más tiempo real dentro del entreno que uno rápido,
// y contar splits a secas los trataría como si pesaran igual.
function computeZ2TimeInZonePercent(splits) {

    const valid = (splits || []).filter(s => s.avgHr != null && s.paceSecPerKm != null && s.distanceKm != null);
    if (!valid.length) return null;

    let totalSec = 0, inZoneSec = 0;

    valid.forEach(s => {

        const durationSec = s.distanceKm * s.paceSecPerKm;
        totalSec += durationSec;

        if (s.avgHr >= Z2_MIN_HR_BPM && s.avgHr <= Z2_MAX_HR_BPM) {
            inZoneSec += durationSec;
        }

    });

    if (totalSec <= 0) return null;

    // Un decimal -- suficiente para distinguir puestos en el Ranking sin
    // aparentar una precisión que la propia aproximación (rango fijo, splits
    // por km en vez de muestreo real) no tiene.
    return Math.round((inZoneSec / totalSec) * 1000) / 10;

}

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

    if (workout.type === Z2_TYPE) {

        if (workout.avgHr != null) {
            entreno.avgHr = workout.avgHr;
        }

        // Sin datos suficientes (sin splits, o splits sin FC real) --
        // simplemente no se incluye, nunca un 0 o un valor inventado.
        const z2TimeInZonePercent = computeZ2TimeInZonePercent(workout.splits);

        if (z2TimeInZonePercent != null) {
            entreno.z2TimeInZonePercent = z2TimeInZonePercent;
        }

    }

    return entreno;

}

// Campos de un split/tramo por km -- unión de todo lo que ya producen los
// distintos importadores (lap/distanceKm/paceSecPerKm/avgHr siempre;
// maxHr/segmentType solo Garmin, ver garmin.js) -- lista blanca explícita
// igual que toPublicEntreno, nunca copiar el array de splits tal cual
// aunque hoy no lleve nada personal: mismo criterio de esta ruta completa.
function toPublicSplit(split) {

    return {
        lap: split.lap ?? null,
        distanceKm: split.distanceKm ?? null,
        paceSecPerKm: split.paceSecPerKm ?? null,
        avgHr: split.avgHr ?? null,
        maxHr: split.maxHr ?? null,
        segmentType: split.segmentType ?? null
    };

}

// Detalle completo de UN entreno (GET /entrenos/:id) -- mismos campos que
// toPublicEntreno() más `splits`, el dato que le falta a la lista para
// poder colorear el mapa por ritmo real y mostrar marcadores de km con
// popup, exactamente igual que ya hace el mapa fullscreen de un entreno
// PROPIO (chartSplits()/buildKmMarkers() en RunningDetailView.js/
// routeMapPaceColoring.js, frontend). Reutiliza el mismo `workout.splits`
// ya guardado en el JSON del entreno -- ningún formato nuevo.
function toPublicEntrenoDetail(alias, workout) {

    const entreno = toPublicEntreno(alias, workout);
    entreno.splits = (workout.splits || []).map(toPublicSplit);

    return entreno;

}

// alias público real (migrations/004_alias_publico.sql) si el usuario ya
// lo rellenó en Perfil -- si no (NULL, todavía sin configurar), cae a la
// parte local del email (antes de la @) como alias provisional de andar
// por casa, para que nadie se quede sin ningún nombre visible mientras no
// lo configura. Exponer el email completo violaría el requisito explícito
// de esta fase ("excluir... email"), así que ni en el fallback se manda
// nunca el email entero, solo su parte local.
function resolveAlias(row) {
    return row.alias_publico || row.email.split("@")[0];
}

// Exportado aparte del wiring de la ruta (communityRouter.get de más abajo)
// para poder testear la lógica real (whitelist de campos, filtrado de
// FC/routeTrace, usuario sin entrenos) con un pool mockeado, sin montar un
// servidor Express de verdad -- mismo patrón que routes/tiles.js.
//
// Sin filtro de fecha a propósito (pedido explícito de esta fase) -- cada
// pantalla que consuma esto (Actividad, Ranking) decide su propia ventana
// de tiempo en el cliente.
//
// likesCount/likedByMe (Fase 3b) -- únicos 2 campos que SIEMPRE van en la
// respuesta (a diferencia de avgHr/z2TimeInZonePercent/routeTrace, que solo
// aparecen si hay dato real): 0 likes y "no le he dado like" son estados
// reales y válidos de cualquier entreno, no una ausencia de dato que
// esconder -- omitirlos obligaría al frontend a tratar "sin campo" como
// "cero likes", una inferencia frágil que esta ruta puede evitar sin más
// coste. LEFT JOIN + GROUP BY en vez de una subconsulta por entreno -- una
// sola pasada por toda la lista, sin N+1 consultas.
export async function getCommunityEntrenos(req, res) {

    const [rows] = await pool.execute(
        `SELECT u.email AS email, u.alias_publico AS alias_publico, w.data AS data,
                COUNT(wl.id) AS likes_count,
                MAX(CASE WHEN wl.user_id = ? THEN 1 ELSE 0 END) AS liked_by_me
         FROM workouts w
         JOIN users u ON u.id = w.user_id
         LEFT JOIN workout_likes wl ON wl.workout_id = w.id
         GROUP BY w.user_id, w.id, u.email, u.alias_publico, w.data`,
        [req.userId]
    );

    const entrenos = rows.map(row => ({
        ...toPublicEntreno(resolveAlias(row), row.data),
        likesCount: row.likes_count,
        likedByMe: !!row.liked_by_me
    }));

    res.json({ entrenos });

}

communityRouter.get("/entrenos", getCommunityEntrenos);

// Detalle de UN entreno concreto, de CUALQUIER usuario -- a diferencia de
// /api/sync (siempre restringido a req.userId, ver sync.js), Comunidad ya
// es abierta por diseño: cualquiera autenticado puede consultar cualquier
// entreno con GPS, no solo el suyo. Por eso la query no filtra por
// user_id, solo por el id del entreno (columna real de la tabla, no dentro
// del JSON -- ver 001_init.sql).
//
// Exportada aparte del wiring de la ruta por el mismo motivo que
// getCommunityEntrenos -- poder testear con un pool mockeado, sin montar
// un servidor Express de verdad.
export async function getCommunityEntrenoDetail(req, res) {

    const [rows] = await pool.execute(
        `SELECT u.email AS email, u.alias_publico AS alias_publico, w.data AS data
         FROM workouts w
         JOIN users u ON u.id = w.user_id
         WHERE w.id = ?
         LIMIT 1`,
        [req.params.id]
    );

    if (rows.length === 0) {
        return res.status(404).json({ error: "No se encontró ese entreno." });
    }

    const [row] = rows;

    res.json(toPublicEntrenoDetail(resolveAlias(row), row.data));

}

communityRouter.get("/entrenos/:id", getCommunityEntrenoDetail);

async function countLikes(workoutId) {

    const [[row]] = await pool.execute(
        "SELECT COUNT(*) AS total FROM workout_likes WHERE workout_id = ?",
        [workoutId]
    );

    return row.total;

}

// Dar like a CUALQUIER entreno, de CUALQUIER usuario, incluido el propio --
// mismo criterio de apertura que el resto de esta ruta (a diferencia de
// /api/sync). La restricción real de "no duplicar" vive en la base de
// datos (UNIQUE (workout_id, user_id), ver migrations/005_workout_likes.sql),
// no aquí -- un segundo POST del mismo usuario al mismo entreno choca con
// ese UNIQUE (ER_DUP_ENTRY) y se trata como éxito idempotente, nunca como
// error: el frontend hace un update optimista y puede reintentar sin miedo
// a duplicar un like real.
export async function likeEntreno(req, res) {

    try {

        await pool.execute(
            "INSERT INTO workout_likes (workout_id, user_id) VALUES (?, ?)",
            [req.params.id, req.userId]
        );

    } catch (err) {

        if (err.code !== "ER_DUP_ENTRY") throw err;

    }

    res.json({ liked: true, likesCount: await countLikes(req.params.id) });

}

// Quitar el like propio -- DELETE explícito en vez de un toggle dentro del
// POST de arriba: dos verbos REST separados, cada uno con su propia
// semántica clara (crear/borrar), sin que el cliente tenga que saber de
// antemano en qué estado está el like para decidir qué mandar. Sin dato que
// afectar (no había like tuyo, o el entreno no existe) -- DELETE sigue
// siendo idempotente por definición, no hace falta comprobar antes de
// borrar ni devolver 404 por un like que ya no existe.
export async function unlikeEntreno(req, res) {

    await pool.execute(
        "DELETE FROM workout_likes WHERE workout_id = ? AND user_id = ?",
        [req.params.id, req.userId]
    );

    res.json({ liked: false, likesCount: await countLikes(req.params.id) });

}

communityRouter.post("/entrenos/:id/like", likeEntreno);
communityRouter.delete("/entrenos/:id/like", unlikeEntreno);
