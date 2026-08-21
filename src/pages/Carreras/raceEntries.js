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
            url: null
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
        url: r.url ?? null
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
