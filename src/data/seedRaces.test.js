import { describe, it, expect } from "vitest";
import { SEED_RACES, SEED_RACES_BATCH_ID } from "./seedRaces.js";
import { isValidIsoDate } from "../importers/plan/json.js";

describe("SEED_RACES", () => {

    it("tiene 169 carreras (44 Murcia RU + 84 Andalucía RU + 9 trail Murcia + 32 trail Andalucía)", () => {

        expect(SEED_RACES).toHaveLength(169);

    });

    it("cada carrera tiene id único, fecha ISO válida, nombre, region y batch de seed", () => {

        const ids = new Set();

        SEED_RACES.forEach(race => {

            expect(isValidIsoDate(race.date)).toBe(true);
            expect(typeof race.name).toBe("string");
            expect(race.name.length).toBeGreaterThan(0);
            expect(["Murcia", "Andalucía"]).toContain(race.region);
            expect(["RU", "TRS"]).toContain(race.type);
            expect(race.importBatchId).toBe(SEED_RACES_BATCH_ID);

            expect(ids.has(race.id)).toBe(false);
            ids.add(race.id);

        });

    });

    it("tiene 44 carreras de Murcia RU, 84 de Andalucía RU, 9 de Murcia trail y 32 de Andalucía trail", () => {

        const count = (region, type) => SEED_RACES.filter(r => r.region === region && r.type === type).length;

        expect(count("Murcia", "RU")).toBe(44);
        expect(count("Andalucía", "RU")).toBe(84);
        expect(count("Murcia", "TRS")).toBe(9);
        expect(count("Andalucía", "TRS")).toBe(32);

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
