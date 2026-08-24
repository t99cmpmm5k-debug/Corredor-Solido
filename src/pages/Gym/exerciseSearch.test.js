import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("../../data/exerciseDatabase.js", () => ({
    EXERCISE_DATABASE: [
        { id: "e1", name: "Press de banca con barra", muscleGroup: "Pecho", equipment: "Barra", level: "Intermedio" },
        { id: "e2", name: "Sentadilla con barra", muscleGroup: "Pierna", equipment: "Barra", level: "Intermedio" },
        { id: "e3", name: "Elevación lateral con mancuerna", muscleGroup: "Hombro", equipment: "Mancuerna", level: "Principiante" },
        { id: "e4", name: "Encogimiento abdominal", muscleGroup: "Core", equipment: null, level: "Principiante" },
        { id: "e5", name: "Remo con barra", muscleGroup: "Espalda", equipment: "Barra", level: "Intermedio" },
        { id: "e6", name: "Curl de bíceps con mancuerna", muscleGroup: "Brazo", equipment: "Mancuerna", level: "Principiante" }
    ]
}));

let customExercises = [];
vi.mock("../../data/customExerciseStore.js", () => ({
    getCustomExercises: () => customExercises
}));

const { searchExercises, getAllExercises, MUSCLE_GROUPS, FILTER_OPTIONS } = await import("./exerciseSearch.js");

afterEach(() => {
    customExercises = [];
});

describe("searchExercises", () => {

    it("sin filtro ni texto, devuelve todo el dataset base", () => {
        expect(searchExercises("")).toHaveLength(6);
    });

    it("filtra por grupo muscular exacto", () => {
        const results = searchExercises("", "Pierna");
        expect(results.map(e => e.id)).toEqual(["e2"]);
    });

    it("busca por texto libre, sin distinguir mayúsculas", () => {
        const results = searchExercises("BANCA");
        expect(results.map(e => e.id)).toEqual(["e1"]);
    });

    it("combina texto y grupo muscular", () => {
        expect(searchExercises("barra", "Espalda").map(e => e.id)).toEqual(["e5"]);
        expect(searchExercises("barra", "Hombro")).toHaveLength(0);
    });

    it("tren superior agrupa Pecho+Espalda+Hombro+Brazo, sin Pierna ni Core", () => {

        const results = searchExercises("", "tren-superior").map(e => e.id).sort();
        expect(results).toEqual(["e1", "e3", "e5", "e6"]);

    });

    it("tren inferior es solo Pierna", () => {
        expect(searchExercises("", "tren-inferior").map(e => e.id)).toEqual(["e2"]);
    });

    it("no ofrece 'full body' como opción de filtro -- no hay forma de derivarlo del dataset sin inventarlo", () => {

        const ids = FILTER_OPTIONS.map(o => o.id);
        expect(ids).not.toContain("full-body");
        expect(ids.some(id => id.toLowerCase().includes("full"))).toBe(false);

    });

    it("MUSCLE_GROUPS son exactamente los 6 grupos pedidos", () => {
        expect(MUSCLE_GROUPS).toEqual(["Pecho", "Espalda", "Pierna", "Hombro", "Brazo", "Core"]);
    });

});

describe("getAllExercises / búsqueda con ejercicios personalizados", () => {

    it("suma los ejercicios personalizados a la búsqueda sin mezclarlos en el dataset base", () => {

        customExercises = [{ id: "c1", name: "Mi ejercicio raro", muscleGroup: "Core", custom: true }];

        expect(getAllExercises()).toHaveLength(7);
        expect(searchExercises("raro").map(e => e.id)).toEqual(["c1"]);

        // El dataset base en sí (el módulo mockeado) no se ha tocado.
        expect(getAllExercises().filter(e => !e.custom)).toHaveLength(6);

    });

});
