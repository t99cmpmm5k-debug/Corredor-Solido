// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { RunningHistoryItem } from "./Running.js";

function workout(overrides) {
    return {
        id: "w1",
        date: "2026-08-20",
        distanceKm: 8,
        durationSec: 2400,
        ...overrides
    };
}

describe("RunningHistoryItem -- ciudad/pueblo real (GPX/TCX, ver reverseGeocode.js)", () => {

    it("con workout.locationCity, la muestra junto a la fecha/tipo", () => {

        const html = RunningHistoryItem(workout({ locationCity: "Ojós" }), [], [], []);

        expect(html).toContain('<span class="history-location">Ojós</span>');

    });

    it("sin workout.locationCity (OCR de Garmin, manual, o GPX/TCX sin geocoding resuelto), no pinta nada -- nunca un hueco vacío ni un nombre inventado", () => {

        const html = RunningHistoryItem(workout(), [], [], []);

        expect(html).not.toContain("history-location");

    });

});
