import { describe, it, expect } from "vitest";
import { SEED_RACES, SEED_RACES_BATCH_ID } from "./seedRaces.js";
import { isValidIsoDate } from "../importers/plan/json.js";

describe("SEED_RACES", () => {

    it("tiene 44 carreras (26 + 18 de los dos archivos ya importados)", () => {

        expect(SEED_RACES).toHaveLength(44);

    });

    it("cada carrera tiene id único, fecha ISO válida, nombre y batch de seed", () => {

        const ids = new Set();

        SEED_RACES.forEach(race => {

            expect(isValidIsoDate(race.date)).toBe(true);
            expect(typeof race.name).toBe("string");
            expect(race.name.length).toBeGreaterThan(0);
            expect(race.importBatchId).toBe(SEED_RACES_BATCH_ID);

            expect(ids.has(race.id)).toBe(false);
            ids.add(race.id);

        });

    });

    it("no hay dos carreras con la misma fecha+nombre (mismo criterio de dedupe que importPlannedRaces)", () => {

        const keys = new Set();

        SEED_RACES.forEach(race => {

            const key = `${race.date}__${race.name}`;
            expect(keys.has(key)).toBe(false);
            keys.add(key);

        });

    });

});
