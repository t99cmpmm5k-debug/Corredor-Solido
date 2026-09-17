import { BUILD_ID } from "../utils/buildInfo.js";

// Resumen automático de "qué cambió" para el aviso de "Hay una versión
// nueva" (updateNotifier.js) -- sin mantenimiento manual: se lee
// directamente de los mensajes de commit de git entre lo que corre esta
// pestaña ahora mismo y lo último desplegado, nunca de un changelog escrito
// a mano.
const REPO = "t99cmpmm5k-debug/Corredor-Solido";

// Suficiente para dar una idea real de qué trae la versión nueva sin que
// el aviso se convierta en un log crudo de git.
const MAX_COMMITS_SHOWN = 6;

// Mensajes puramente técnicos (de desarrollo, no relevantes para quien usa
// la app) -- se descarta la línea entera si empieza así, en vez de
// intentar traducir jerga interna a texto de cara al usuario. La mayoría
// de los mensajes reales de este repo son ya de por sí legibles ("Running:
// mapa de ritmo...") -- se aceptan tal cual, aunque a veces suenen algo
// técnicos, mejor que inventar una traducción.
const NOISE_PREFIXES = [/^merge\b/i, /^wip\b/i, /^chore\b/i, /^revert\b/i];

function firstLine(message) {

    return message.split("\n")[0].trim();

}

// "master" (no un hash guardado en localStorage) como extremo "nuevo" --
// el propio deploy (.github/workflows/deploy.yml) construye siempre desde
// la punta de esa rama al hacer push a main/master, así que en el momento
// en que este aviso aparece "master" ES la versión que se acaba de
// desplegar. Esto evita tener que resolver el hash de la build nueva desde
// una pestaña que todavía corre la vieja -- BUILD_ID (ver buildInfo.js) es
// un valor fijado en tiempo de compilación, la propia pestaña no puede
// saber el hash de una build que aún no ha cargado.
export async function fetchReleaseNotes() {

    if (BUILD_ID === "dev") return [];

    try {

        const res = await fetch(`https://api.github.com/repos/${REPO}/compare/${BUILD_ID}...master`);
        if (!res.ok) return [];

        const data = await res.json();
        if (!Array.isArray(data.commits)) return [];

        // GitHub devuelve del commit más antiguo al más nuevo -- se
        // invierte para que el más reciente aparezca primero, más relevante
        // para quien lee el aviso.
        return data.commits
            .map(commit => firstLine(commit.commit.message))
            .filter(line => line && !NOISE_PREFIXES.some(re => re.test(line)))
            .reverse()
            .slice(0, MAX_COMMITS_SHOWN);

    } catch {

        // Sin red, repo privado momentáneamente inaccesible, límite de
        // la API sin autenticar (60 req/hora por IP) -- el aviso de
        // actualización sigue funcionando igual, solo sin el resumen.
        return [];

    }

}
