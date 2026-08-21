import { describe, it, expect } from "vitest";
import { merge } from "./fusion.js";

function splitsResult(laps) {
    return { parser: "splits-v4.3", screen: { type: "splits" }, found: 0, data: {}, fields: {}, extras: { laps } };
}

describe("fusion.merge — combinación de vueltas entre varias capturas de Vueltas", () => {

    it("combina, para la misma vuelta, la distancia/ritmo de una captura con la FC de otra", () => {

        // Captura 1: vista estándar (Vuelta/Tiempo/Distancia/Ritmo).
        const standard = splitsResult([
            { lap: 1, distance_km: 1, pace_min_km: "5:30" },
            { lap: 2, distance_km: 1, pace_min_km: "5:34" }
        ]);

        // Captura 2: vista desplazada, solo FC (ver parser-splits.js).
        const hr = splitsResult([
            { lap: 1, avg_heart_rate_bpm: 140, max_heart_rate_bpm: 152 },
            { lap: 2, avg_heart_rate_bpm: 153, max_heart_rate_bpm: 157 }
        ]);

        const { laps } = merge([standard, hr]);

        expect(laps).toEqual([
            { lap: 1, distance_km: 1, pace_min_km: "5:30", avg_heart_rate_bpm: 140, max_heart_rate_bpm: 152 },
            { lap: 2, distance_km: 1, pace_min_km: "5:34", avg_heart_rate_bpm: 153, max_heart_rate_bpm: 157 }
        ]);

    });

    it("da igual el orden de las dos capturas — el resultado combinado es el mismo", () => {

        const standard = splitsResult([{ lap: 1, distance_km: 1, pace_min_km: "5:30" }]);
        const hr = splitsResult([{ lap: 1, avg_heart_rate_bpm: 140, max_heart_rate_bpm: 152 }]);

        const { laps: order1 } = merge([standard, hr]);
        const { laps: order2 } = merge([hr, standard]);

        expect(order1).toEqual(order2);

    });

    it("no pisa un campo ya leído por otra captura, se queda con el primero", () => {

        const first = splitsResult([{ lap: 1, distance_km: 1, pace_min_km: "5:30" }]);
        const second = splitsResult([{ lap: 1, distance_km: 1.05, pace_min_km: "5:31" }]);

        const { laps } = merge([first, second]);

        expect(laps).toEqual([{ lap: 1, distance_km: 1, pace_min_km: "5:30" }]);

    });

});
