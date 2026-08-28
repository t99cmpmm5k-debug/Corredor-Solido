import { parseISODate } from "../../utils/date.js";

function todayMidnight() {

    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());

}

// Forma común para las dos fuentes de datos (workouts type:"race" y
// plannedRaces) — cada una solo rellena los campos que de verdad tiene;
// el resto se queda a null a propósito, nunca se inventa (p. ej. un
// workout real no tiene location ni disciplina, una carrera planificada
// no tiene distanceKm todavía).
export function buildRaceEntries(workouts, plannedRaces) {

    const completed = workouts
        .filter(w => w.type === "race")
        .map(w => ({
            kind: "completed",
            id: w.id,
            date: w.date,
            name: w.title || "Carrera",
            location: null,
            disciplineType: null,
            distanceKm: w.distanceKm ?? null,
            registrationDeadline: null,
            url: null,
            region: null,
            // Una carrera ya corrida (workout real) no tiene estos 3
            // campos -- viven solo en plannedRaces (ver workoutStore.js).
            // Falso/null explícito, no undefined, para que RaceListCard.js
            // no tenga que distinguir "no aplica" de "no marcado".
            isGoal: false,
            isRegistered: false,
            linkedPlanSessionId: null
        }));

    const planned = plannedRaces.map(r => ({
        kind: "planned",
        id: r.id,
        date: r.date,
        name: r.name || "Carrera",
        location: r.location ?? null,
        disciplineType: r.type ?? null,
        distanceKm: null,
        registrationDeadline: r.registrationDeadline ?? null,
        url: r.url ?? null,
        region: r.region ?? null,
        isGoal: r.isGoal ?? false,
        isRegistered: r.isRegistered ?? false,
        linkedPlanSessionId: r.linkedPlanSessionId ?? null
    }));

    return [...completed, ...planned];

}

function byDateAsc(a, b) {
    return a.date.localeCompare(b.date);
}

function byDateDesc(a, b) {
    return b.date.localeCompare(a.date);
}

// Las 3 tabs son el mismo cruce "completada vs planificada" que ya existe
// en los datos (ver carrerasStore.js) — no una categorización nueva.
export function categorizeRaceEntries(entries) {

    const today = todayMidnight();

    const proximas = entries
        .filter(e => e.kind === "planned" && e.date && parseISODate(e.date) >= today)
        .sort(byDateAsc);

    const misCarreras = entries
        .filter(e => e.kind === "completed")
        .sort(byDateDesc);

    const pasadas = entries
        .filter(e => e.kind === "planned" && e.date && parseISODate(e.date) < today)
        .sort(byDateDesc);

    return { proximas, misCarreras, pasadas };

}

export function filterRaceEntriesByQuery(entries, query) {

    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return entries;

    return entries.filter(e =>
        e.name.toLowerCase().includes(trimmed) ||
        (e.location || "").toLowerCase().includes(trimmed)
    );

}

// "all" (o cualquier valor sin filtro real) devuelve todo tal cual — mismo
// criterio que filterRaceEntriesByQuery con una query vacía. Una carrera
// completada (workout real) nunca tiene region (ver buildRaceEntries), así
// que un filtro de región concreto siempre la deja fuera — correcto: el
// filtro es sobre el calendario importado, no sobre lo ya corrido.
export function filterRaceEntriesByRegion(entries, region) {

    if (!region || region === "all") return entries;

    return entries.filter(e => e.region === region);

}

// Mismo criterio que filterRaceEntriesByRegion, sobre disciplineType en
// vez de region — se combinan sin más porque son dos filtros
// independientes sobre el mismo array (ver Carreras.js).
export function filterRaceEntriesByType(entries, type) {

    if (!type || type === "all") return entries;

    return entries.filter(e => e.disciplineType === type);

}

// Saca la carrera marcada como "Objetivo principal" (isGoal) del resto de
// la lista, para pintarla en su propia tarjeta destacada por encima del
// listado normal de "Próximas" (ver Carreras.js) -- como mucho una
// (setPlannedRaceGoal() en workoutStore.js ya impone esa exclusividad),
// así que basta con el primer match. { featured: null, rest: entries } si
// ninguna está marcada, sin tocar el array de entrada.
export function splitFeaturedRace(entries) {

    const featured = entries.find(e => e.isGoal) ?? null;
    if (!featured) return { featured: null, rest: entries };

    return { featured, rest: entries.filter(e => e.id !== featured.id) };

}

// Reordena "Próximas" (una vez sacada la destacada, ver splitFeaturedRace)
// priorizando las que tengan algún indicador real activo -- inscrito de
// verdad (isRegistered) o ya añadida a Plan (linkedPlanSessionId) -- por
// encima de las que no tienen ninguno. Dentro de cada uno de los dos
// grupos, se conserva el orden cronológico de entrada (misma fecha
// ascendente que ya trae categorizeRaceEntries para "proximas") -- un
// sort estable, no un criterio de fecha nuevo.
export function sortByIndicatorPriority(entries) {

    return entries
        .map((entry, index) => ({ entry, index }))
        .sort((a, b) => {

            const aHasIndicator = a.entry.isRegistered || a.entry.linkedPlanSessionId ? 1 : 0;
            const bHasIndicator = b.entry.isRegistered || b.entry.linkedPlanSessionId ? 1 : 0;

            if (aHasIndicator !== bHasIndicator) return bHasIndicator - aHasIndicator;
            return a.index - b.index;

        })
        .map(({ entry }) => entry);

}

// Agrupa preservando el orden de entrada (ascendente o descendente según
// venga ya ordenado categorizeRaceEntries) — un grupo por mes, en el
// orden en que aparece su primera carrera.
export function groupEntriesByMonth(entries) {

    const groups = [];
    const groupByKey = new Map();

    entries.forEach(entry => {

        const date = parseISODate(entry.date);
        const key = `${date.getFullYear()}-${date.getMonth()}`;

        if (!groupByKey.has(key)) {
            const group = { monthDate: new Date(date.getFullYear(), date.getMonth(), 1), entries: [] };
            groupByKey.set(key, group);
            groups.push(group);
        }

        groupByKey.get(key).entries.push(entry);

    });

    return groups;

}
