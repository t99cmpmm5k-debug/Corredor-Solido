import { describe, it, expect } from "vitest";
import { buildMarkersByDate } from "./PlanMonthCalendar.js";
import { getWorkoutIcon } from "../../../components/WorkoutIcon/WorkoutIcon.js";
import { TIMELINE_TYPE_COLOR } from "./PlanTimeline.js";

describe("buildMarkersByDate", () => {

    it("un marcador por sesión, agrupados bajo su fecha", () => {

        const sessions = [
            { id: "s1", date: "2026-08-10", type: "z2" },
            { id: "s2", date: "2026-08-12", type: "strength" }
        ];

        const markers = buildMarkersByDate(sessions);

        expect(Object.keys(markers)).toEqual(["2026-08-10", "2026-08-12"]);
        expect(markers["2026-08-10"]).toHaveLength(1);
        expect(markers["2026-08-12"]).toHaveLength(1);

    });

    it("dos sesiones el mismo día (running + gimnasio) se agrupan en el mismo array", () => {

        const sessions = [
            { id: "s1", date: "2026-08-10", type: "z2" },
            { id: "s2", date: "2026-08-10", type: "strength" }
        ];

        const markers = buildMarkersByDate(sessions);

        expect(markers["2026-08-10"]).toHaveLength(2);

    });

    it("reutiliza el icono/color real de cada tipo — mismo lenguaje visual que PlanTimeline/WorkoutIcon, sin paleta nueva", () => {

        const sessions = [
            { id: "s1", date: "2026-08-10", type: "z2" },
            { id: "s2", date: "2026-08-11", type: "strength" }
        ];

        const markers = buildMarkersByDate(sessions);

        expect(markers["2026-08-10"][0]).toEqual({
            icon: getWorkoutIcon("z2"),
            color: TIMELINE_TYPE_COLOR.z2
        });

        expect(markers["2026-08-11"][0]).toEqual({
            icon: getWorkoutIcon("strength"),
            color: TIMELINE_TYPE_COLOR.strength
        });

    });

    it("un tipo desconocido cae en el marcador genérico, igual que WorkoutIcon/PlanTimeline", () => {

        const markers = buildMarkersByDate([{ id: "s1", date: "2026-08-10", type: "no-existe" }]);

        expect(markers["2026-08-10"][0]).toEqual({
            icon: getWorkoutIcon("no-existe"),
            color: TIMELINE_TYPE_COLOR.generic
        });

    });

    it("una sesión recurrente sin fecha (date:null, tabla de gimnasio semanal) no aparece en ningún día", () => {

        const markers = buildMarkersByDate([{ id: "s1", date: null, weekday: "LUN", type: "strength" }]);

        expect(markers).toEqual({});

    });

    it("sin sesiones, no hay marcadores", () => {

        expect(buildMarkersByDate([])).toEqual({});

    });

});
