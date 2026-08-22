import { describe, it, expect } from "vitest";
import { buildRaceEntries, categorizeRaceEntries, filterRaceEntriesByQuery, filterRaceEntriesByRegion, groupEntriesByMonth } from "./raceEntries.js";

function futureIso(daysFromNow) {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return d.toISOString().slice(0, 10);
}

describe("buildRaceEntries", () => {

    it("solo toma workouts de tipo race, y deja los campos que no tiene a null", () => {

        const workouts = [
            { id: "w1", type: "race", date: "2026-08-01", title: "10K Local", distanceKm: 10 },
            { id: "w2", type: "easy", date: "2026-08-02", title: "Rodaje" }
        ];

        const entries = buildRaceEntries(workouts, []);

        expect(entries).toHaveLength(1);
        expect(entries[0]).toMatchObject({
            kind: "completed",
            id: "w1",
            name: "10K Local",
            distanceKm: 10,
            location: null,
            disciplineType: null,
            url: null
        });

    });

    it("mapea plannedRaces con sus campos propios", () => {

        const plannedRaces = [
            { id: "p1", date: "2026-09-01", type: "RU", name: "Carrera X", location: "Murcia", registrationDeadline: "2026-08-29T20:00:00", url: "https://x.test", region: "Murcia" }
        ];

        const entries = buildRaceEntries([], plannedRaces);

        expect(entries).toHaveLength(1);
        expect(entries[0]).toMatchObject({
            kind: "planned",
            id: "p1",
            name: "Carrera X",
            location: "Murcia",
            disciplineType: "RU",
            distanceKm: null,
            registrationDeadline: "2026-08-29T20:00:00",
            url: "https://x.test",
            region: "Murcia"
        });

    });

    it("una carrera completada nunca tiene region — no es un dato que un workout real traiga", () => {

        const entries = buildRaceEntries(
            [{ id: "w1", type: "race", date: "2026-08-01", title: "10K Local" }],
            []
        );

        expect(entries[0].region).toBeNull();

    });

    it("una carrera planificada sin region (dato de antes de la migración) queda a null, no se inventa", () => {

        const entries = buildRaceEntries([], [
            { id: "p1", date: "2026-09-01", type: "RU", name: "Carrera vieja" }
        ]);

        expect(entries[0].region).toBeNull();

    });

});

describe("categorizeRaceEntries", () => {

    it("separa próximas (planificada futura), mis carreras (completada) y pasadas (planificada vencida)", () => {

        const entries = buildRaceEntries(
            [{ id: "w1", type: "race", date: "2026-01-01", title: "Ya corrida" }],
            [
                { id: "p1", date: futureIso(5), type: "RU", name: "Futura" },
                { id: "p2", date: "2020-01-01", type: "RU", name: "Vencida sin correr" }
            ]
        );

        const { proximas, misCarreras, pasadas } = categorizeRaceEntries(entries);

        expect(proximas.map(e => e.id)).toEqual(["p1"]);
        expect(misCarreras.map(e => e.id)).toEqual(["w1"]);
        expect(pasadas.map(e => e.id)).toEqual(["p2"]);

    });

});

describe("filterRaceEntriesByQuery", () => {

    const entries = buildRaceEntries([], [
        { id: "p1", date: "2026-08-22", type: "RU", name: "Carrera de Ojós", location: "Ojós, Murcia" },
        { id: "p2", date: "2026-08-26", type: "RU", name: "Nocturna de Cieza", location: "Cieza, Murcia" }
    ]);

    it("filtra por nombre, sin distinguir mayúsculas", () => {

        expect(filterRaceEntriesByQuery(entries, "ojós").map(e => e.id)).toEqual(["p1"]);

    });

    it("filtra por ubicación", () => {

        expect(filterRaceEntriesByQuery(entries, "cieza").map(e => e.id)).toEqual(["p2"]);

    });

    it("con query vacía devuelve todo tal cual", () => {

        expect(filterRaceEntriesByQuery(entries, "  ")).toEqual(entries);

    });

});

describe("filterRaceEntriesByRegion", () => {

    const entries = buildRaceEntries(
        [{ id: "w1", type: "race", date: "2026-07-01", title: "Ya corrida" }],
        [
            { id: "p1", date: "2026-08-22", type: "RU", name: "Carrera de Ojós", region: "Murcia" },
            { id: "p2", date: "2026-08-28", type: "RU", name: "Carrera de Nívar", region: "Andalucía" },
            { id: "p3", date: "2026-08-29", type: "RU", name: "Carrera sin migrar", region: null }
        ]
    );

    it("con 'all' devuelve todo tal cual, completadas incluidas", () => {

        expect(filterRaceEntriesByRegion(entries, "all")).toEqual(entries);

    });

    it("filtra solo las de la región pedida", () => {

        expect(filterRaceEntriesByRegion(entries, "Murcia").map(e => e.id)).toEqual(["p1"]);
        expect(filterRaceEntriesByRegion(entries, "Andalucía").map(e => e.id)).toEqual(["p2"]);

    });

    it("una región concreta deja fuera lo completado y lo sin migrar — no hay region con la que coincidir", () => {

        const result = filterRaceEntriesByRegion(entries, "Murcia");

        expect(result.some(e => e.id === "w1")).toBe(false);
        expect(result.some(e => e.id === "p3")).toBe(false);

    });

});

describe("groupEntriesByMonth", () => {

    it("agrupa por mes conservando el orden de entrada", () => {

        const entries = buildRaceEntries([], [
            { id: "p1", date: "2026-08-05", type: "RU", name: "A" },
            { id: "p2", date: "2026-08-20", type: "RU", name: "B" },
            { id: "p3", date: "2026-09-02", type: "RU", name: "C" }
        ]);

        const groups = groupEntriesByMonth(entries);

        expect(groups).toHaveLength(2);
        expect(groups[0].entries.map(e => e.id)).toEqual(["p1", "p2"]);
        expect(groups[1].entries.map(e => e.id)).toEqual(["p3"]);
        expect(groups[0].monthDate.getMonth()).toBe(7);
        expect(groups[1].monthDate.getMonth()).toBe(8);

    });

});
