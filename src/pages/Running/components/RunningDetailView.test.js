import { describe, it, expect } from "vitest";
import { hrPointPercent, hrSegments, RunningDetailView } from "./RunningDetailView.js";

function workout(overrides) {
    return {
        id: "w1",
        date: "2026-08-20",
        distanceKm: 5,
        durationSec: 1500,
        avgPaceSecPerKm: 300,
        splits: [
            { lap: 1, paceSecPerKm: 295 },
            { lap: 2, paceSecPerKm: 305 },
            { lap: 3, paceSecPerKm: 300 }
        ],
        ...overrides
    };
}

describe("hrPointPercent", () => {

    it("FC igual a la referencia cae en el centro (50%)", () => {

        expect(hrPointPercent(150, 150)).toBe(50);

    });

    it("FC por encima de la referencia sube (más cerca de 100%)", () => {

        expect(hrPointPercent(160, 150)).toBeGreaterThan(50);

    });

    it("FC por debajo de la referencia baja (más cerca de 0%)", () => {

        expect(hrPointPercent(140, 150)).toBeLessThan(50);

    });

    it("se recorta a los extremos de la ventana en vez de salirse", () => {

        // Ventana de ±15 ppm — muy por encima/debajo se queda en 100/0.
        expect(hrPointPercent(300, 150)).toBe(100);
        expect(hrPointPercent(0, 150)).toBe(0);

    });

});

describe("hrSegments", () => {

    it("agrupa splits con FC contigua en un único tramo", () => {

        const splits = [
            { avgHr: 140 }, { avgHr: 145 }, { avgHr: 150 }
        ];

        const segments = hrSegments(splits);

        expect(segments.length).toBe(1);
        expect(segments[0].map(p => p.index)).toEqual([0, 1, 2]);

    });

    it("corta el tramo en vez de interpolar cuando falta la FC de un split", () => {

        const splits = [
            { avgHr: 140 }, { avgHr: null }, { avgHr: 150 }, { avgHr: 155 }
        ];

        const segments = hrSegments(splits);

        // Dos tramos: [0] antes del hueco, [2,3] después — nunca uno solo
        // que una el 0 con el 2 saltándose el hueco.
        expect(segments.length).toBe(2);
        expect(segments[0].map(p => p.index)).toEqual([0]);
        expect(segments[1].map(p => p.index)).toEqual([2, 3]);

    });

    it("splits sin avgHr (p. ej. Garmin sin la captura de FC por vuelta) no generan ningún tramo", () => {

        const splits = [
            { paceSecPerKm: 300 }, { paceSecPerKm: 310 }
        ];

        expect(hrSegments(splits)).toEqual([]);

    });

    it("un único split con FC válida entre dos huecos forma su propio tramo de 1 punto", () => {

        const splits = [
            { avgHr: null }, { avgHr: 148 }, { avgHr: null }
        ];

        const segments = hrSegments(splits);

        expect(segments.length).toBe(1);
        expect(segments[0].map(p => p.index)).toEqual([1]);

    });

});

// Extrae left/bottom/clase de cada <span class="pace-chart-hr-value...">
// del HTML renderizado, en el mismo orden que aparecen los splits.
function hrValueSpans(html) {
    return [...html.matchAll(/<span class="(pace-chart-hr-value[^"]*)" style="left:([\d.]+)%;bottom:(-?[\d.]+)%">(\d+)<\/span>/g)]
        .map(m => ({ cls: m[1], left: Number(m[2]), bottom: Number(m[3]), value: Number(m[4]) }));
}

describe("RunningDetailView — posición del número de FC frente al de ritmo (evita el solape)", () => {

    // avgPaceRef=300 (ventana 255-345), avgHrRef=150 (ventana 135-165) —
    // números redondos para poder predecir a mano el % de altura exacto
    // de cada barra/punto.
    function hrPlacementWorkout(splits) {
        return workout({ avgPaceSecPerKm: 300, avgHr: 150, splits });
    }

    it("punto muy por encima de su propia barra (caso real de 21 km): se ancla debajo, recortado a la altura de la barra, no a una distancia fija del punto", () => {

        // pace=300 -> barra al 50%. avgHr=165 (máximo de ventana) -> punto al 100%.
        // Un desplazamiento fijo (~18%) desde el punto (100-18=82%) seguía
        // quedando muy por encima de la barra (50%) y tapaba el número de
        // ritmo -- por eso se recorta al 50% exacto, no a 82%.
        const html = RunningDetailView(hrPlacementWorkout([
            { lap: 1, paceSecPerKm: 300, avgHr: 165 },
            { lap: 2, paceSecPerKm: 300, avgHr: 165 }
        ]));

        const [first] = hrValueSpans(html);
        expect(first.cls).toContain("pace-chart-hr-value--below");
        expect(first.bottom).toBeCloseTo(50, 5);

    });

    it("punto algo por encima de su barra pero cerca: se ancla justo debajo del punto, no se aleja de más", () => {

        // pace=270 -> barra al 83.3%. avgHr=160 -> punto al 83.3% también
        // (mismo nivel). El hueco es pequeño, así que basta el
        // desplazamiento normal desde el punto, sin necesidad de recortar.
        const html = RunningDetailView(hrPlacementWorkout([
            { lap: 1, paceSecPerKm: 270, avgHr: 160 },
            { lap: 2, paceSecPerKm: 270, avgHr: 160 }
        ]));

        const [first] = hrValueSpans(html);
        expect(first.cls).toContain("pace-chart-hr-value--below");
        // 83.33 - (22/120*100 ≈ 18.33) ≈ 65 -- por encima del recorte a
        // la barra (83.33), así que no debería haberse recortado.
        expect(first.bottom).toBeCloseTo(65, 0);
        expect(first.bottom).toBeGreaterThan(50);

    });

    it("punto claramente por debajo de su barra: no hace falta volcarlo, se queda encima como siempre", () => {

        // pace=300 -> barra al 50%. avgHr=135 (mínimo de ventana) -> punto al 0%.
        const html = RunningDetailView(hrPlacementWorkout([
            { lap: 1, paceSecPerKm: 300, avgHr: 135 },
            { lap: 2, paceSecPerKm: 300, avgHr: 135 }
        ]));

        const [first] = hrValueSpans(html);
        expect(first.cls).not.toContain("pace-chart-hr-value--below");
        expect(first.bottom).toBe(0);

    });

    it("barra muy corta con un punto algo por encima: el recorte no se va a un 'bottom' negativo (fuera del gráfico)", () => {

        // pace=345 (el más lento de la ventana) -> barra prácticamente al 0%.
        // avgHr=140 -> punto a un 16.7% bajo, lo bastante cerca de la barra
        // como para volcarse, pero y - HR_VALUE_DROP_PCT (~16.7-18.3) sale
        // negativo -- debe recortarse a 0, no quedarse en negativo.
        const html = RunningDetailView(hrPlacementWorkout([
            { lap: 1, paceSecPerKm: 345, avgHr: 140 },
            { lap: 2, paceSecPerKm: 345, avgHr: 140 }
        ]));

        const [first] = hrValueSpans(html);
        expect(first.bottom).toBeGreaterThanOrEqual(0);

    });

});

describe("RunningDetailView — FC en el gráfico de ritmo", () => {

    it("caso Garmin (OCR): muestra el chip de FC media pero no la línea por km cuando los splits no traen FC", () => {

        const html = RunningDetailView(workout({ avgHr: 160 }));

        expect(html).toContain("pace-chart-avg-badge--hr");
        expect(html).toContain("160 ppm medio");
        expect(html).not.toContain("pace-chart-hr-overlay");
        expect(html).not.toContain("pace-chart-hr-value");

    });

    it("caso Amazfit (TCX): muestra el chip y la línea con el valor numérico de FC por km", () => {

        const html = RunningDetailView(workout({
            avgHr: 145,
            splits: [
                { lap: 1, paceSecPerKm: 295, avgHr: 140 },
                { lap: 2, paceSecPerKm: 305, avgHr: 148 },
                { lap: 3, paceSecPerKm: 300, avgHr: 150 }
            ]
        }));

        expect(html).toContain("pace-chart-avg-badge--hr");
        expect(html).toContain("pace-chart-hr-overlay");
        expect(html).toContain("pace-chart-hr-value");
        expect(html).toContain(">140<");
        expect(html).toContain(">148<");
        expect(html).toContain(">150<");

    });

    it("sin FC en absoluto (ni media ni por km): no muestra ningún elemento de FC", () => {

        const html = RunningDetailView(workout());

        expect(html).not.toContain("pace-chart-avg-badge--hr");
        expect(html).not.toContain("pace-chart-hr-overlay");
        expect(html).not.toContain("pace-chart-hr-value");

    });

});

describe("RunningDetailView — stat 'FC media' (independiente del gráfico)", () => {

    // Caso real reportado: FC media conocida (Resumen/Estadísticas) pero
    // ningún split trae ritmo por km (solo se capturó la tabla de Vueltas
    // con FC, sin la vista estándar Vuelta/Tiempo/Distancia/Ritmo) —
    // chartSplits() filtra por paceSecPerKm y se queda vacío, así que
    // RITMO POR KILÓMETRO (con su chip) ni se pinta. El stat en
    // .detail-stats es el único sitio donde ese dato sobrevive.
    it("con FC media conocida pero sin ritmo por km en ningún split: el gráfico no se pinta, pero el stat 'FC media' sí", () => {

        const html = RunningDetailView(workout({
            avgHr: 152,
            splits: [
                { lap: 1, avgHr: 140 },
                { lap: 2, avgHr: 153 }
            ]
        }));

        expect(html).not.toContain("RITMO POR KILÓMETRO");
        expect(html).toContain("FC media");
        expect(html).toContain("152 ppm");

    });

    it("sin FC media: el stat muestra el placeholder, no la inventa", () => {

        const html = RunningDetailView(workout());

        expect(html).toContain("FC media");
        expect(html).not.toMatch(/\d+ ppm<\/span>\s*<span class="detail-stat-label">\s*FC media/);

    });

    it("con gráfico completo (ritmo + FC por km): el stat convive con el chip, no lo sustituye", () => {

        const html = RunningDetailView(workout({
            avgHr: 145,
            splits: [
                { lap: 1, paceSecPerKm: 295, avgHr: 140 },
                { lap: 2, paceSecPerKm: 305, avgHr: 148 },
                { lap: 3, paceSecPerKm: 300, avgHr: 150 }
            ]
        }));

        expect(html).toContain("RITMO POR KILÓMETRO");
        expect(html).toContain("pace-chart-avg-badge--hr");
        expect(html).toContain("145 ppm medio"); // chip del gráfico
        expect(html).toContain("145 ppm</span>"); // stat de .detail-stats (sin "medio")

    });

});

describe("RunningDetailView — acordeón de avisos de importación (retoque de cierre)", () => {

    it("sin avisos reales, no pinta nada", () => {

        const html = RunningDetailView(workout({ importWarnings: [] }));
        expect(html).not.toContain("import-warnings");

    });

    it("con avisos reales, colapsado por defecto (warningsExpanded=false): se ve el contador, no el texto de cada aviso", () => {

        const html = RunningDetailView(workout({ importWarnings: ["Falta el título del entrenamiento", "Año no detectado"] }), [], false);

        expect(html).toContain("Avisos de importación (2)");
        expect(html).not.toContain("import-warnings-list");
        expect(html).not.toContain("Falta el título");

    });

    it("expandido (warningsExpanded=true), se ve el texto real de cada aviso", () => {

        const html = RunningDetailView(workout({ importWarnings: ["Falta el título del entrenamiento"] }), [], true);

        expect(html).toContain("is-expanded");
        expect(html).toContain("import-warnings-list");
        expect(html).toContain("Falta el título del entrenamiento");

    });

});

describe("RunningDetailView — toggle de métricas del gráfico (Ritmo+FC / Ritmo / FC)", () => {

    function hrWorkout(mode) {
        return RunningDetailView(workout({
            avgHr: 145,
            splits: [
                { lap: 1, paceSecPerKm: 295, avgHr: 140 },
                { lap: 2, paceSecPerKm: 305, avgHr: 150 }
            ]
        }), [], false, mode);
    }

    it("con línea de FC real, muestra las 3 opciones del toggle", () => {

        const html = hrWorkout("both");

        expect(html).toContain('data-mode="both"');
        expect(html).toContain('data-mode="pace"');
        expect(html).toContain('data-mode="hr"');
        expect(html).not.toContain("Cadencia</button>"); // nunca una 4ª opción de cadencia -- no hay dato real por km

    });

    it("sin ninguna línea de FC real, no muestra el toggle (nada que alternar)", () => {

        const html = RunningDetailView(workout({ avgHr: 160 })); // sin FC por split

        expect(html).not.toContain("pace-chart-mode-toggle");

    });

    it("el modo activo recibe la clase is-active en su propio botón", () => {

        const html = hrWorkout("hr");

        expect(html).toMatch(/class="pace-chart-mode-button is-active" data-action="set-chart-metric-mode" data-mode="hr"/);
        expect(html).toContain("pace-chart--mode-hr");

    });

});

describe("RunningDetailView — km parcial marcado en el gráfico", () => {

    it("último split con menos de 1km real: lleva la etiqueta 'Parcial'", () => {

        const html = RunningDetailView(workout({
            splits: [
                { lap: 1, paceSecPerKm: 300, distanceKm: 1 },
                { lap: 2, paceSecPerKm: 305, distanceKm: 0.7 }
            ]
        }));

        expect(html).toContain("pace-chart-partial-tag");
        expect(html).toContain("Parcial");

    });

    it("todos los splits de 1km completo: ningún 'Parcial'", () => {

        const html = RunningDetailView(workout({
            splits: [
                { lap: 1, paceSecPerKm: 300, distanceKm: 1 },
                { lap: 2, paceSecPerKm: 305, distanceKm: 1 }
            ]
        }));

        expect(html).not.toContain("pace-chart-partial-tag");

    });

    it("un split corto que NO es el último no se marca como parcial (solo el final puede serlo)", () => {

        const html = RunningDetailView(workout({
            splits: [
                { lap: 1, paceSecPerKm: 300, distanceKm: 0.8 },
                { lap: 2, paceSecPerKm: 305, distanceKm: 1 }
            ]
        }));

        expect(html).not.toContain("pace-chart-partial-tag");

    });

});

describe("RunningDetailView — insights reales bajo el gráfico", () => {

    it("con variación real de ritmo y FC, muestra ambos insights con datos reales", () => {

        const html = RunningDetailView(workout({
            splits: [
                { lap: 1, paceSecPerKm: 310, avgHr: 140 },
                { lap: 2, paceSecPerKm: 290, avgHr: 155 },
                { lap: 3, paceSecPerKm: 300, avgHr: 148 }
            ]
        }));

        expect(html).toContain("pace-chart-insights");
        expect(html).toContain("Km más rápido: km 2");
        expect(html).toContain("FC más alta: km 2");

    });

    it("sin ninguna variación (todos los km al mismo ritmo/FC), no fuerza ningún insight", () => {

        const html = RunningDetailView(workout({
            splits: [
                { lap: 1, paceSecPerKm: 300, avgHr: 145 },
                { lap: 2, paceSecPerKm: 300, avgHr: 145 }
            ]
        }));

        expect(html).not.toContain("pace-chart-insights");

    });

});

describe("RunningDetailView — métricas agrupadas por categoría", () => {

    it("agrupa en Rendimiento/Condiciones/Equipamiento, con sus títulos reales", () => {

        const html = RunningDetailView(workout());

        expect(html).toContain("RENDIMIENTO");
        expect(html).toContain("CONDICIONES");
        expect(html).toContain("EQUIPAMIENTO");

    });

    it("'Hora' lleva el modificador de menor peso visual dentro de Condiciones", () => {

        const html = RunningDetailView(workout({ time: "07:15" }));

        expect(html).toMatch(/detail-stat detail-stat--minor"[\s\S]{0,400}Hora/);

    });

});

// splits con FC real por mitades -- helper propio de esta sección, no
// interfiere con el `splits` por defecto de workout() de arriba.
function hrHalvesSplits(firstHalfHr, secondHalfHr) {
    return [...firstHalfHr, ...secondHalfHr].map((avgHr, i) => ({
        lap: i + 1, paceSecPerKm: 300, avgHr
    }));
}

describe("RunningDetailView — deriva cardíaca y 'Control del esfuerzo' (ronda de insights avanzados)", () => {

    it("solo aplica a Rodaje (Z2, type='easy') -- otro tipo no muestra deriva ni conclusión, aunque tenga FC real de sobra", () => {

        const html = RunningDetailView(workout({
            type: "series",
            splits: hrHalvesSplits([140, 140, 140], [148, 148, 148])
        }));

        expect(html).not.toContain("Deriva FC");
        expect(html).not.toContain("pace-chart-conclusion");

    });

    it("con menos de 4 splits con FC real, no muestra deriva (mínimo de fiabilidad)", () => {

        const html = RunningDetailView(workout({
            type: "easy",
            splits: hrHalvesSplits([140], [148, 148])
        }));

        expect(html).not.toContain("Deriva FC");

    });

    it("deriva <5%: 'Muy bueno', signo real y valor con coma decimal", () => {

        const html = RunningDetailView(workout({
            type: "easy",
            splits: hrHalvesSplits([138, 140, 142], [144, 146, 148]) // 140 -> 146 = +4,3%
        }));

        expect(html).toContain("Deriva FC: +4,3% · Muy bueno");
        expect(html).toContain("pace-chart-drift--up");

    });

    it("deriva exactamente en 5%: cae en 'Bueno', no en 'Muy bueno' (umbral es estrictamente <5)", () => {

        const html = RunningDetailView(workout({
            type: "easy",
            splits: hrHalvesSplits([140, 140, 140], [147, 147, 147]) // exactamente +5%
        }));

        expect(html).toContain("Deriva FC: +5,0% · Bueno");
        expect(html).toContain("pace-chart-drift--flat");

    });

    it("deriva >10%: 'Mejorable'", () => {

        const html = RunningDetailView(workout({
            type: "easy",
            splits: hrHalvesSplits([140, 140, 140], [160, 160, 160]) // +14,3%
        }));

        expect(html).toContain("Mejorable");
        expect(html).toContain("pace-chart-drift--down");

    });

    it("nunca combina ritmo o temperatura en el cálculo del umbral -- misma deriva, mismo calificativo, sea cual sea el ritmo", () => {

        const withSlowPace = hrHalvesSplits([140, 140, 140], [160, 160, 160]).map(s => ({ ...s, paceSecPerKm: 500 }));
        const html = RunningDetailView(workout({ type: "easy", splits: withSlowPace, temperatureC: 10 }));

        expect(html).toContain("Deriva FC: +14,3% · Mejorable");

    });

});

describe("RunningDetailView — conclusión automática bajo el gráfico", () => {

    it("sin deriva calculable (tipo distinto de Z2), no hay conclusión", () => {

        const html = RunningDetailView(workout({ type: "race", splits: hrHalvesSplits([140, 140, 140], [148, 148, 148]) }));

        expect(html).not.toContain("pace-chart-conclusion");

    });

    it("deriva 'Muy bueno' sin temperatura real: solo la cláusula de estabilidad, sin mencionar calor", () => {

        const html = RunningDetailView(workout({
            type: "easy",
            splits: hrHalvesSplits([138, 140, 142], [144, 146, 148]),
            temperatureC: null
        }));

        expect(html).toContain("FC muy estable durante todo el entreno.");
        expect(html).not.toContain("pese a");

    });

    it("deriva 'Muy bueno' con calor real (>=27°C): añade la cláusula de eficiencia con la temperatura real", () => {

        const html = RunningDetailView(workout({
            type: "easy",
            splits: hrHalvesSplits([138, 140, 142], [144, 146, 148]),
            temperatureC: 29
        }));

        expect(html).toContain("Buena eficiencia aeróbica pese a los 29°C.");

    });

    it("deriva 'Mejorable' con calor real: el calor se plantea como posible explicación, nunca como mérito", () => {

        const html = RunningDetailView(workout({
            type: "easy",
            splits: hrHalvesSplits([140, 140, 140], [160, 160, 160]),
            temperatureC: 30
        }));

        expect(html).toContain("El calor (30°C) puede explicar parte de la subida.");
        expect(html).not.toContain("Buena eficiencia");

    });

    it("con temperatura normal (no calurosa), no menciona el clima", () => {

        const html = RunningDetailView(workout({
            type: "easy",
            splits: hrHalvesSplits([138, 140, 142], [144, 146, 148]),
            temperatureC: 15
        }));

        expect(html).not.toContain("pese a");
        expect(html).not.toContain("puede explicar parte de la subida");

    });

});

describe("RunningDetailView — margen del km parcial en el gráfico", () => {

    it("la columna del último km parcial lleva su propia clase de margen extra", () => {

        const html = RunningDetailView(workout({
            splits: [
                { lap: 1, paceSecPerKm: 300, distanceKm: 1 },
                { lap: 2, paceSecPerKm: 305, distanceKm: 0.7 }
            ]
        }));

        expect(html).toContain('class="pace-chart-column is-partial"');

    });

});
