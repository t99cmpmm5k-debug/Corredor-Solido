import { describe, it, expect } from "vitest";
import { addDays, formatISODate, getWeekStartDate, parseISODate } from "../../utils/date.js";
import { buildHistoryGroups } from "./runningHistoryGrouping.js";

const TODAY = new Date(2026, 8, 3); // 2026-09-03, jueves
const TODAY_ISO = formatISODate(TODAY);
const THIS_WEEK_START = getWeekStartDate(TODAY_ISO);
const LAST_WEEK_START = addDays(THIS_WEEK_START, -7);

function workout(id, date, { distanceKm = null, durationSec = null } = {}) {
    return { id, date, distanceKm, durationSec };
}

describe("buildHistoryGroups", () => {

    it("con lista vacía, ningún grupo", () => {
        expect(buildHistoryGroups([], { now: TODAY })).toEqual([]);
    });

    it("separa esta semana, semana pasada y meses anteriores, en ese orden", () => {

        const workouts = [
            workout("w1", TODAY_ISO),
            workout("w2", LAST_WEEK_START),
            workout("w3", "2026-08-05"),
            workout("w4", "2026-07-10")
        ];

        const groups = buildHistoryGroups(workouts, { now: TODAY });

        expect(groups.map(g => g.key)).toEqual(["this-week", "last-week", "month-2026-7", "month-2026-6"]);
        expect(groups.map(g => g.label)).toEqual(["Esta semana", "Semana pasada", "Agosto", "Julio"]);

    });

    it("esta semana y semana pasada empiezan abiertas; los meses, colapsados", () => {

        const workouts = [
            workout("w1", TODAY_ISO),
            workout("w2", LAST_WEEK_START),
            workout("w3", "2026-08-05")
        ];

        const groups = buildHistoryGroups(workouts, { now: TODAY });

        expect(groups.find(g => g.key === "this-week").defaultOpen).toBe(true);
        expect(groups.find(g => g.key === "last-week").defaultOpen).toBe(true);
        expect(groups.find(g => g.key === "month-2026-7").defaultOpen).toBe(false);

    });

    it("un entreno de hace más de una semana pero fuera de la semana pasada cae en su mes, no en 'semana pasada'", () => {

        const twoWeeksAgo = addDays(THIS_WEEK_START, -10);
        const workouts = [workout("w1", twoWeeksAgo)];

        const groups = buildHistoryGroups(workouts, { now: TODAY });

        expect(groups).toHaveLength(1);
        expect(groups[0].key).not.toBe("last-week");
        expect(groups[0].key).toMatch(/^month-/);

    });

    it("añade el año a la etiqueta del mes solo cuando no es el año en curso", () => {

        const workouts = [
            workout("w1", "2025-08-05"),
            workout("w2", "2026-08-05")
        ];

        const groups = buildHistoryGroups(workouts, { now: TODAY });

        const labels = groups.map(g => g.label);
        expect(labels).toContain("Agosto 2025");
        expect(labels).toContain("Agosto");

    });

    it("resumen del grupo: nº de entrenos, km totales y ritmo medio ponderado por distancia (no media de medias)", () => {

        const workouts = [
            workout("w1", TODAY_ISO, { distanceKm: 10, durationSec: 3000 }), // 5:00/km
            workout("w2", TODAY_ISO, { distanceKm: 20, durationSec: 8000 })  // 6:40/km
        ];

        const groups = buildHistoryGroups(workouts, { now: TODAY });
        const summary = groups[0].summary;

        expect(summary.count).toBe(2);
        expect(summary.totalKm).toBe(30);
        // (3000+8000) / 30 = 366.67 -> redondeado a 367 s/km
        expect(summary.avgPaceSecPerKm).toBe(367);

    });

    it("un entreno sin distancia/duración cuenta en el nº total pero no rompe el ritmo medio del resto", () => {

        const workouts = [
            workout("w1", TODAY_ISO, { distanceKm: 10, durationSec: 3000 }),
            workout("w2", TODAY_ISO, { distanceKm: null, durationSec: null })
        ];

        const groups = buildHistoryGroups(workouts, { now: TODAY });
        const summary = groups[0].summary;

        expect(summary.count).toBe(2);
        expect(summary.totalKm).toBe(10);
        expect(summary.avgPaceSecPerKm).toBe(300);

    });

    it("sin ningún entreno con distancia+duración reales, ritmo medio null (nunca inventado)", () => {

        const workouts = [workout("w1", TODAY_ISO, { distanceKm: null, durationSec: null })];

        const groups = buildHistoryGroups(workouts, { now: TODAY });

        expect(groups[0].summary.avgPaceSecPerKm).toBeNull();

    });

    it("respeta el orden de inserción de `workouts` para ordenar los grupos entre sí", () => {

        // Ya vienen ordenados de más reciente a más antiguo, como los pinta
        // RunningIdleView -- el primer entreno de cada grupo decide su
        // posición relativa frente a los demás grupos.
        const workouts = [
            workout("w1", "2026-08-20"),
            workout("w2", "2026-07-15"),
            workout("w3", "2026-08-05")
        ];

        const groups = buildHistoryGroups(workouts, { now: TODAY });

        expect(groups.map(g => g.key)).toEqual(["month-2026-7", "month-2026-6"]);
        expect(groups[0].workouts.map(w => w.id)).toEqual(["w1", "w3"]);

    });

});
