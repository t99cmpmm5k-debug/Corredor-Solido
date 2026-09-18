import { Router } from "express";
import { tileRateLimit } from "../middleware/rateLimit.js";

export const tilesRouter = Router();

// Relay puro hacia Esri World Imagery (satélite) -- NUNCA guarda ningún
// tile en este servidor (ni en disco ni en memoria más allá del propio
// ciclo petición/respuesta). Esto es deliberado, no una limitación: los
// términos de Esri ("Customer may not otherwise scrape, download, or store
// Data" -- Master Agreement E204, sección 3.2(c)) solo dejan una excepción
// explícita para llevarse basemaps offline vía Esri Content Packages, que
// no aplica aquí. Un proxy que solo reenvía en vivo cada petición (sin
// persistir nada del lado del servidor) es la lectura más defendible de
// esos términos que se pudo confirmar -- ver el hilo de decisión con el
// usuario. El único "cacheo" real de esta ruta es el normal de CUALQUIER
// respuesta HTTP: la cabecera Cache-Control de abajo le dice al NAVEGADOR
// del usuario que guarde el tile, igual que haría con cualquier imagen de
// cualquier web -- eso no cuenta contra la cuota de Esri (factura por
// petición que le llega a SU dominio, nunca por lo que ya esté en la
// caché del navegador) y tampoco es "almacenar" del lado de Esri.
//
// Sin requireAuth a propósito: Leaflet carga los tiles como <img> normales
// (L.tileLayer), que no pueden mandar un header Authorization -- no hay
// forma de que este endpoint reciba el JWT de sesión. tileRateLimit es la
// única barrera real contra abuso (ver middleware/rateLimit.js): de sobra
// para el uso normal de la app (ráfagas de un pellizco de zoom real), y
// acota el daño de un script que intente drenar la cuota gratuita de Esri
// a través de este proxy sin conocer la clave real.
const IMAGERY_TILE_URL = "https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile";

// Zoom máximo real que sirve World_Imagery -- por encima de esto Esri
// simplemente devolvería un tile en blanco o un 400; se corta aquí para no
// gastar ni una sola petición real contra la cuota en algo que ya se sabe
// que no puede ser un tile válido.
const MAX_ZOOM = 23;

export function isValidTileCoord(z, y, x) {
    return Number.isInteger(z) && Number.isInteger(y) && Number.isInteger(x)
        && z >= 0 && z <= MAX_ZOOM && y >= 0 && x >= 0;
}

// Exportado aparte del wiring de la ruta (tilesRouter.get de más abajo)
// para poder testear la lógica real (validación, 503 sin clave, reenvío
// del status de Esri, 502 sin red) con un req/res simulado, sin montar un
// servidor Express de verdad -- mismo patrón que requireAuth.test.js.
export async function handleSatelliteTile(req, res) {

    const z = Number(req.params.z), y = Number(req.params.y), x = Number(req.params.x);

    if (!isValidTileCoord(z, y, x)) {
        return res.status(400).end();
    }

    // Sin clave configurada -- degrada con un 503 claro en vez de un 500
    // genérico. A propósito NO está en REQUIRED_ENV_VARS de index.js: el
    // satélite es una capa visual opcional, no debe poder tumbar el
    // arranque entero (login/sync) solo porque todavía no se ha dado de
    // alta una cuenta de ArcGIS Location Platform.
    if (!process.env.ESRI_API_KEY) {
        return res.status(503).end();
    }

    try {

        const upstream = await fetch(`${IMAGERY_TILE_URL}/${z}/${y}/${x}?token=${process.env.ESRI_API_KEY}`);

        if (!upstream.ok) {
            return res.status(upstream.status).end();
        }

        res.set("Content-Type", upstream.headers.get("content-type") || "image/jpeg");
        // 1 día -- suficiente para que revisitar el mismo entreno en la
        // misma sesión (o al día siguiente) no vuelva a gastar cuota real
        // de Esri, sin comprometerse a una caché "para siempre" sobre un
        // recurso que no controlamos.
        res.set("Cache-Control", "public, max-age=86400");

        res.send(Buffer.from(await upstream.arrayBuffer()));

    } catch (err) {

        console.warn("No se pudo contactar con Esri para servir un tile de satélite.", err);
        res.status(502).end();

    }

}

// z/y/x -- el mismo orden que exige la URL real de Esri (MapServer/tile/
// {level}/{row}/{col}), NO el z/x/y de la plantilla XYZ habitual de
// Leaflet -- ver el comentario junto a SATELLITE_TILE_URL en
// src/components/RouteMap/RouteMap.js del frontend sobre cómo se arma la
// plantilla ahí para que cuadre con este orden.
tilesRouter.get("/satellite/:z/:y/:x", tileRateLimit, handleSatelliteTile);
