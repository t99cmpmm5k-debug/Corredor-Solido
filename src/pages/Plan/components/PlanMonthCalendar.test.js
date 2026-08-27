import { describe, it, expect } from "vitest";
import { buildMarkersByDate } from "./PlanMonthCalendar.js";
import { getWorkoutIcon } from "../../../components/WorkoutIcon/WorkoutIcon.js";
import { resolveDayColor } from "../planDayColor.js";

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

    // Sistema de color con significado fijo (fase 2 del pulido de Plan):
    // el color ya no es 100% por tipo -- reutiliza resolveDayColor(),
    // misma fuente de verdad que PlanTimeline, sin paleta nueva ni
    // duplicada aquí.
    it("reutiliza el color por ESTADO real de cada sesión -- mismo criterio que PlanTimeline, sin paleta nueva", () => {

        const sessions = [
            { id: "s1", date: "2026-08-10", type: "z2", status: "pending" },
            { id: "s2", date: "2026-08-11", type: "strength", status: "completed" }
        ];

        const markers = buildMarkersByDate(sessions);

        expect(markers["2026-08-10"][0]).toEqual({
            icon: getWorkoutIcon("z2"),
            color: resolveDayColor(sessions[0])
        });

        expect(markers["2026-08-11"][0]).toEqual({
            icon: getWorkoutIcon("strength"),
            color: resolveDayColor(sessions[1])
        });

        expect(markers["2026-08-10"][0].color).toBe("var(--color-primary)");
        expect(markers["2026-08-11"][0].color).toBe("var(--color-success)");

    });

    it("series (intervals) y tirada larga (longRun) mantienen su color fijo pase lo que pase con el estado", () => {

        const sessions = [
            { id: "s1", date: "2026-08-10", type: "intervals", status: "completed" },
            { id: "s2", date: "2026-08-11", type: "longRun", status: "pending" }
        ];

        const markers = buildMarkersByDate(sessions);

        expect(markers["2026-08-10"][0].color).toBe("#ff7a33");
        expect(markers["2026-08-11"][0].color).toBe("var(--color-warning)");

    });

    it("un tipo desconocido cae en el marcador genérico de icono, coloreado por estado igual que el resto", () => {

        const markers = buildMarkersByDate([{ id: "s1", date: "2026-08-10", type: "no-existe" }]);

        expect(markers["2026-08-10"][0]).toEqual({
            icon: getWorkoutIcon("no-existe"),
            color: "var(--color-primary)"
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
