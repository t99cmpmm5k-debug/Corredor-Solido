import { describe, it, expect } from "vitest";
import { FC_SIMILAR_THRESHOLD_PPM, isHrSimilar, compareEfficiency, findBestEfficiencyWorkout, buildEfficiencyTrend, buildFirstLastComparison, resolveRouteWorkouts } from "./referenceRouteEfficiency.js";

function workout(id, { avgPaceSecPerKm, avgHr, date, temperatureC } = {}) {
    return { id, avgPaceSecPerKm, avgHr, date, temperatureC };
}

describe("isHrSimilar — umbral fijo FC_SIMILAR_THRESHOLD_PPM", () => {

    it("dentro del umbral (≤4 ppm) es similar, en cualquier dirección", () => {
        expect(isHrSimilar(150, 154)).toBe(true);
        expect(isHrSimilar(154, 150)).toBe(true);
        expect(isHrSimilar(150, 150)).toBe(true);
    });

    it("por encima del umbral no es similar", () => {
        expect(isHrSimilar(150, 155)).toBe(false);
    });

    it("null en cualquiera de los dos nunca es similar", () => {
        expect(isHrSimilar(null, 150)).toBe(false);
        expect(isHrSimilar(150, null)).toBe(false);
    });

    it("el umbral está guardado como constante con nombre, no embebido", () => {
        expect(FC_SIMILAR_THRESHOLD_PPM).toBe(4);
    });

});

describe("compareEfficiency — regla pareja a pareja de la especificación", () => {

    it("FC similar (≤4 ppm): el de mejor ritmo es más eficiente", () => {

        const a = workout("a", { avgPaceSecPerKm: 333, avgHr: 150 }); // 5:33/km
        const b = workout("b", { avgPaceSecPerKm: 349, avgHr: 151 }); // 5:49/km

        const result = compareEfficiency(a, b);

        expect(result.comparable).toBe(true);
        expect(result.moreEfficient.id).toBe("a");
        expect(result.hrDeltaBpm).toBe(-1);

    });

    it("FC MUY distinta (>4 ppm): NO declara cuál es más eficiente", () => {

        const a = workout("a", { avgPaceSecPerKm: 333, avgHr: 150 });
        const b = workout("b", { avgPaceSecPerKm: 349, avgHr: 170 }); // 20 ppm de diferencia

        const result = compareEfficiency(a, b);

        expect(result.comparable).toBe(false);
        expect(result.reason).toBe("hr-too-different");
        expect(result.moreEfficient).toBeUndefined();
        expect(result.hrDeltaBpm).toBe(-20);

    });

    it("nunca concluye 'peor' solo por ritmo más lento sin FC real de alguno de los dos", () => {

        const a = workout("a", { avgPaceSecPerKm: 333, avgHr: 150 });
        const b = workout("b", { avgPaceSecPerKm: 349, avgHr: null });

        const result = compareEfficiency(a, b);

        expect(result.comparable).toBe(false);
        expect(result.reason).toBe("missing-data");

    });

    it("ritmo idéntico con FC similar: no revienta, cualquiera de los dos vale como 'moreEfficient'", () => {

        const a = workout("a", { avgPaceSecPerKm: 333, avgHr: 150 });
        const b = workout("b", { avgPaceSecPerKm: 333, avgHr: 152 });

        const result = compareEfficiency(a, b);

        expect(result.comparable).toBe(true);
        expect(["a", "b"]).toContain(result.moreEfficient.id);

    });

});

describe("findBestEfficiencyWorkout — 'mejor eficiencia' de un recorrido con varios entrenos", () => {

    it("un solo entreno con datos es trivialmente el mejor", () => {

        const w = workout("a", { avgPaceSecPerKm: 349, avgHr: 151 });
        expect(findBestEfficiencyWorkout([w])).toBe(w);

    });

    it("sin ningún entreno con ritmo+FC reales, devuelve null", () => {

        expect(findBestEfficiencyWorkout([workout("a", {}), workout("b", { avgHr: 150 })])).toBeNull();

    });

    it("varios entrenos con FC similar entre sí: gana el de mejor ritmo", () => {

        const a = workout("a", { avgPaceSecPerKm: 349, avgHr: 151 }); // 5:49
        const b = workout("b", { avgPaceSecPerKm: 333, avgHr: 150 }); // 5:33 -- mejor ritmo, FC similar
        const c = workout("c", { avgPaceSecPerKm: 360, avgHr: 152 }); // 6:00

        expect(findBestEfficiencyWorkout([a, b, c]).id).toBe("b");

    });

    it("un entreno con FC muy distinta al resto (día caluroso/duro) queda excluido del veredicto", () => {

        // Cluster real a ~150-152 ppm (esfuerzo típico); un outlier a 175 ppm.
        const a = workout("a", { avgPaceSecPerKm: 349, avgHr: 151 });
        const b = workout("b", { avgPaceSecPerKm: 333, avgHr: 150 });
        const outlier = workout("outlier", { avgPaceSecPerKm: 300, avgHr: 175 }); // ritmo MUY rápido, pero a un esfuerzo cardíaco muy distinto

        const best = findBestEfficiencyWorkout([a, b, outlier]);

        // El outlier NUNCA gana solo por tener el ritmo más rápido en bruto --
        // su FC no es comparable al esfuerzo típico del recorrido.
        expect(best.id).not.toBe("outlier");
        expect(best.id).toBe("b");

    });

    it("con solo 2 entrenos y FC muy dispersa (ninguno cerca de la media), no fuerza un ganador", () => {

        const a = workout("a", { avgPaceSecPerKm: 333, avgHr: 140 });
        const b = workout("b", { avgPaceSecPerKm: 349, avgHr: 170 }); // media = 155, ninguno de los dos está a ≤4ppm de 155

        expect(findBestEfficiencyWorkout([a, b])).toBeNull();

    });

});

describe("resolveRouteWorkouts — route.workoutIds a objetos de entreno reales", () => {

    it("filtra allWorkouts por los ids del recorrido, en cualquier orden", () => {

        const route = { id: "r1", workoutIds: ["w2", "w1"] };
        const all = [workout("w1"), workout("w2"), workout("w3")];

        const resolved = resolveRouteWorkouts(route, all);
        expect(resolved.map(w => w.id).sort()).toEqual(["w1", "w2"]);

    });

    it("un id del recorrido que ya no existe en allWorkouts (entreno borrado) simplemente no aparece", () => {

        const route = { id: "r1", workoutIds: ["w1", "borrado"] };
        const all = [workout("w1")];

        expect(resolveRouteWorkouts(route, all)).toEqual([workout("w1")]);

    });

    it("recorrido sin entrenos asignados devuelve un array vacío", () => {

        const route = { id: "r1", workoutIds: [] };
        expect(resolveRouteWorkouts(route, [workout("w1")])).toEqual([]);

    });

});

describe("buildEfficiencyTrend — tendencia del último entreno frente al de mejor eficiencia", () => {

    it("FC similar entre último y mejor: delta real de ritmo en segundos/km", () => {

        const best = workout("best", { avgPaceSecPerKm: 333, avgHr: 150 });
        const last = workout("last", { avgPaceSecPerKm: 349, avgHr: 151 });

        const trend = buildEfficiencyTrend(last, best);

        expect(trend.comparable).toBe(true);
        expect(trend.deltaSecPerKm).toBe(16);

    });

    it("FC muy distinta entre último y mejor: no da un delta de ritmo directo", () => {

        const best = workout("best", { avgPaceSecPerKm: 333, avgHr: 150 });
        const last = workout("last", { avgPaceSecPerKm: 320, avgHr: 172 });

        const trend = buildEfficiencyTrend(last, best);

        expect(trend.comparable).toBe(false);
        expect(trend.reason).toBe("hr-too-different");
        expect(trend.deltaSecPerKm).toBeUndefined();

    });

    it("mismo entreno como último y como mejor: no hay tendencia que mostrar", () => {

        const w = workout("a", { avgPaceSecPerKm: 333, avgHr: 150 });
        expect(buildEfficiencyTrend(w, w)).toBeNull();

    });

    it("sin mejor eficiencia conocida (null), no hay tendencia", () => {

        const last = workout("last", { avgPaceSecPerKm: 333, avgHr: 150 });
        expect(buildEfficiencyTrend(last, null)).toBeNull();

    });

});

describe("buildFirstLastComparison — primera vez vs última vez en un recorrido (distinto de 'último vs mejor')", () => {

    it("con menos de 2 entrenos con fecha, no hay comparación", () => {

        expect(buildFirstLastComparison([])).toBeNull();
        expect(buildFirstLastComparison([workout("a", { date: "2026-08-01", avgPaceSecPerKm: 349, avgHr: 151 })])).toBeNull();

    });

    it("FC similar y ritmo mejorado (más rápido la última vez): veredicto 'improved'", () => {

        const first = workout("first", { date: "2026-07-01", avgPaceSecPerKm: 349, avgHr: 151 }); // 5:49/km
        const improving = workout("improving", { date: "2026-08-20", avgPaceSecPerKm: 333, avgHr: 152 }); // 5:33/km, más rápido

        const result = buildFirstLastComparison([first, improving]);

        expect(result.comparable).toBe(true);
        expect(result.verdict).toBe("improved");
        expect(result.deltaSecPerKm).toBe(16); // 349 - 333
        expect(result.first.id).toBe("first");
        expect(result.last.id).toBe("improving");

    });

    it("FC similar y ritmo empeorado (más lento la última vez): veredicto 'worsened', sin alarmismo", () => {

        // Ejemplo literal de la especificación: "5:49/km @151 ppm -> 6:03/km @152 ppm".
        const first = workout("first", { date: "2026-07-01", avgPaceSecPerKm: 349, avgHr: 151 });
        const last = workout("last", { date: "2026-08-20", avgPaceSecPerKm: 363, avgHr: 152 });

        const result = buildFirstLastComparison([first, last]);

        expect(result.comparable).toBe(true);
        expect(result.verdict).toBe("worsened");
        expect(result.deltaSecPerKm).toBe(-14); // 349 - 363

    });

    it("mismo ritmo exacto con FC similar: 'unchanged', ni mejora ni empeoramiento forzado", () => {

        const first = workout("first", { date: "2026-07-01", avgPaceSecPerKm: 349, avgHr: 151 });
        const last = workout("last", { date: "2026-08-20", avgPaceSecPerKm: 349, avgHr: 153 });

        const result = buildFirstLastComparison([first, last]);

        expect(result.comparable).toBe(true);
        expect(result.verdict).toBe("unchanged");
        expect(result.deltaSecPerKm).toBe(0);

    });

    it("FC muy distinta entre la primera y la última: NO fuerza un veredicto de mejora/empeoramiento", () => {

        const first = workout("first", { date: "2026-07-01", avgPaceSecPerKm: 349, avgHr: 151, temperatureC: 18 });
        const last = workout("last", { date: "2026-08-20", avgPaceSecPerKm: 320, avgHr: 175, temperatureC: 29 }); // día mucho más duro/caluroso

        const result = buildFirstLastComparison([first, last]);

        expect(result.comparable).toBe(false);
        expect(result.reason).toBe("hr-too-different");
        expect(result.verdict).toBeUndefined();
        expect(result.first.temperatureC).toBe(18);
        expect(result.last.temperatureC).toBe(29);

    });

    it("usa el primero y el último por FECHA real, no por el orden en que llegan en el array", () => {

        const middle = workout("middle", { date: "2026-07-15", avgPaceSecPerKm: 340, avgHr: 151 });
        const last = workout("last", { date: "2026-08-20", avgPaceSecPerKm: 333, avgHr: 150 });
        const first = workout("first", { date: "2026-07-01", avgPaceSecPerKm: 349, avgHr: 151 });

        // Llegan desordenados a propósito.
        const result = buildFirstLastComparison([last, first, middle]);

        expect(result.first.id).toBe("first");
        expect(result.last.id).toBe("last");

    });

    it("con datos incompletos (falta ritmo o FC), no hay comparación que forzar", () => {

        const first = workout("first", { date: "2026-07-01", avgPaceSecPerKm: 349, avgHr: null });
        const last = workout("last", { date: "2026-08-20", avgPaceSecPerKm: 333, avgHr: 150 });

        const result = buildFirstLastComparison([first, last]);

        expect(result.comparable).toBe(false);
        expect(result.reason).toBe("missing-data");

    });

});
