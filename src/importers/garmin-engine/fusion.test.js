import { describe, it, expect } from "vitest";
import { merge } from "./fusion.js";
import { parse as parseSplits } from "./parser-splits.js";

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

describe("fusion.merge — dos capturas de la vista de FC desplazada (numeración relativa, ver parser-splits.js)", () => {

    // Un entreno con más vueltas de las que caben en una pantalla exige
    // dos capturas de esa misma vista — cada una numera sus filas por
    // orden de aparición (1, 2, 3...) porque el primer dígito real viene
    // corrompido por scroll, así que las dos "empiezan en 1" aunque
    // representen vueltas reales distintas. Antes de este fix, fusion.js
    // fusionaba por ese número relativo tal cual: la segunda captura
    // colisionaba entera con la primera (sus vueltas 1-5 "ya estaban"
    // con FC de la primera captura) y las vueltas que solo estaban en la
    // segunda (7, 8, 9) desaparecían sin más.
    function hrCapture(pairs, startLap = 1) {
        return splitsResult(pairs.map((p, i) => ({
            avg_heart_rate_bpm: p[0],
            max_heart_rate_bpm: p[1],
            lap: startLap + i,
            numberingIsRelative: true
        })));
    }

    it("Puerto Lumbreras 8k (25 ago) — dos capturas de FC solapadas en las vueltas 5-6 no pierden las vueltas 7-9", () => {

        // Captura 1: vueltas 1-6 reales, numeradas 1-6 (primera captura
        // con numeración relativa — se acepta tal cual, ver mergeLaps()).
        const capture1 = hrCapture([
            [134, 147], [151, 156], [154, 158], [153, 156], [154, 156], [153, 158]
        ]);

        // Captura 2: vueltas 5-9 reales, pero el propio parser las numera
        // 1-5 (relativas a esta captura) -- las dos primeras (154/156,
        // 153/158) coinciden EXACTAMENTE con las vueltas 5 y 6 ya
        // conocidas de la captura 1: esa es la señal de solape que ancla
        // el desplazamiento real (+4).
        const capture2 = hrCapture([
            [154, 156], [153, 158], [152, 155], [154, 156], [151, 152]
        ]);

        const { laps } = merge([capture1, capture2]);

        expect(laps).toEqual([
            { lap: 1, avg_heart_rate_bpm: 134, max_heart_rate_bpm: 147 },
            { lap: 2, avg_heart_rate_bpm: 151, max_heart_rate_bpm: 156 },
            { lap: 3, avg_heart_rate_bpm: 154, max_heart_rate_bpm: 158 },
            { lap: 4, avg_heart_rate_bpm: 153, max_heart_rate_bpm: 156 },
            { lap: 5, avg_heart_rate_bpm: 154, max_heart_rate_bpm: 156 },
            { lap: 6, avg_heart_rate_bpm: 153, max_heart_rate_bpm: 158 },
            { lap: 7, avg_heart_rate_bpm: 152, max_heart_rate_bpm: 155 },
            { lap: 8, avg_heart_rate_bpm: 154, max_heart_rate_bpm: 156 },
            { lap: 9, avg_heart_rate_bpm: 151, max_heart_rate_bpm: 152 }
        ]);

    });

    // A diferencia de "da igual el orden" en el describe de arriba (vista
    // estándar + FC: ese SÍ es order-independent porque la vista estándar
    // trae números de vuelta reales, un ancla fiable pase lo que pase),
    // con DOS capturas de numeración relativa no hay ningún ancla externa
    // — la primera que se procesa se acepta tal cual (ver comentario en
    // mergeLaps()). Documentado a propósito, no un bug: subir las capturas
    // en el mismo orden en que se hicieron (de arriba abajo en la tabla,
    // lo natural) es lo que se asume, y es lo único que se puede asumir
    // sin otra señal en la propia captura.
    it("con dos capturas de numeración relativa, subirlas en el orden real de la tabla es lo que da el resultado correcto", () => {

        const capture1 = hrCapture([
            [134, 147], [151, 156], [154, 158], [153, 156], [154, 156], [153, 158]
        ]);
        const capture2 = hrCapture([
            [154, 156], [153, 158], [152, 155], [154, 156], [151, 152]
        ]);

        const { laps } = merge([capture1, capture2]);

        expect(laps.map(l => l.lap)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);

    });

    it("sin ninguna vuelta solapada (ningún par de FC coincide), se asume que la segunda captura continúa justo tras la última vuelta conocida", () => {

        const capture1 = hrCapture([[134, 147], [151, 156], [154, 158]]); // vueltas 1-3
        const capture2 = hrCapture([[140, 150], [145, 152]]); // vueltas reales 4-5, sin ninguna coincidencia con la 1

        const { laps } = merge([capture1, capture2]);

        expect(laps.map(l => l.lap)).toEqual([1, 2, 3, 4, 5]);
        expect(laps[3]).toMatchObject({ lap: 4, avg_heart_rate_bpm: 140, max_heart_rate_bpm: 150 });
        expect(laps[4]).toMatchObject({ lap: 5, avg_heart_rate_bpm: 145, max_heart_rate_bpm: 152 });

    });

    it("una vuelta solapada que CONTRADICE (misma posición relativa, FC distinta) descarta ese desplazamiento en vez de fusionar mal", () => {

        const capture1 = hrCapture([[134, 147], [151, 156], [154, 158]]); // vueltas 1-3
        // Si se alineara con offset 0 (local1 -> vuelta1), la FC de la
        // vuelta 1 contradice (134/147 vs 200/210) -- no debe colar ese
        // desplazamiento solo porque el número de filas coincida.
        const capture2 = hrCapture([[200, 210], [151, 156], [154, 158]]);

        const { laps } = merge([capture1, capture2]);

        // Sin un desplazamiento válido por solape, cae al fallback
        // (continúa tras la última vuelta conocida, vuelta 3).
        expect(laps.map(l => l.lap)).toEqual([1, 2, 3, 4, 5, 6]);

    });

    it("con una captura ESTÁNDAR también presente (distancia/ritmo, sin FC), la primera captura de FC igualmente se acepta con su numeración local -- las vueltas de la vista estándar no cuentan como 'ya conocidas' a efectos de realineación", () => {

        // Vista estándar: 9 vueltas reales con distancia/ritmo, SIN FC.
        const standard = splitsResult(
            Array.from({ length: 9 }, (_, i) => ({ lap: i + 1, distance_km: 1, pace_min_km: "5:30" }))
        );

        const hr1 = hrCapture([
            [134, 147], [151, 156], [154, 158], [153, 156], [154, 156], [153, 158]
        ]); // vueltas 1-6

        const hr2 = hrCapture([
            [154, 156], [153, 158], [152, 155], [154, 156], [151, 152]
        ]); // vueltas 5-9 (numeradas 1-5 en la propia captura)

        const { laps } = merge([standard, hr1, hr2]);

        expect(laps).toHaveLength(9);
        expect(laps.map(l => l.lap)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        expect(laps.every(l => l.distance_km === 1)).toBe(true); // vista estándar intacta
        expect(laps.map(l => `${l.avg_heart_rate_bpm}/${l.max_heart_rate_bpm}`)).toEqual([
            "134/147", "151/156", "154/158", "153/156", "154/156", "153/158", "152/155", "154/156", "151/152"
        ]);

    });

    it("integración real parser-splits.js + fusion.js: mismas dos capturas, generadas a partir de texto OCR de la tabla desplazada", () => {

        const capture1Text = [
            "Vuelta GAP medio Frecuencia cardiaca media Frec. cardiaca max. Ascenso total",
            "min/km ppm ppm m",
            "1 5:12 134 147 5",
            "2 5:18 151 156 4",
            "3 5:20 154 158 6",
            "4 5:19 153 156 3",
            "5 5:21 154 156 5",
            "6 5:24 153 158 4"
        ].join("\n");

        const capture2Text = [
            "Vuelta GAP medio Frecuencia cardiaca media Frec. cardiaca max. Ascenso total",
            "min/km ppm ppm m",
            "5 5:21 154 156 5",
            "6 5:24 153 158 4",
            "7 5:30 152 155 3",
            "8 5:33 154 156 4",
            "9 5:36 151 152 1"
        ].join("\n");

        const { laps } = merge([parseSplits(capture1Text), parseSplits(capture2Text)]);

        expect(laps.map(l => l.lap)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        expect(laps.map(l => `${l.avg_heart_rate_bpm}/${l.max_heart_rate_bpm}`)).toEqual([
            "134/147", "151/156", "154/158", "153/156", "154/156", "153/158", "152/155", "154/156", "151/152"
        ]);

    });

});
