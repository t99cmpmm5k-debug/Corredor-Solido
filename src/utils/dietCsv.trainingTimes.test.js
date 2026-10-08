import { describe, it, expect } from "vitest";
import { parseDietCsv, TRAINING_TIMES } from "./dietCsv.js";

// Una comida por cada día obligatorio (si no, el parser rechaza el plan).
const REST_OF_WEEK = [
    "MARTES,09:00,1,Avena 40 g,",
    "MIERCOLES,09:00,1,Avena 40 g,",
    "JUEVES,09:00,1,Avena 40 g,",
    "VIERNES,09:00,1,Avena 40 g,",
    "TIRADA_LARGA,Pre,1,Plátano 120 g,",
    "DESCANSO,09:00,1,Huevos + pan 40 g,"
];

function csv(...mondayRows) {

    return ["dia,momento,opcion,alimento,notas", ...mondayRows, ...REST_OF_WEEK].join("\n");

}

describe("parseDietCsv -- franjas de entrenamiento", () => {

    it("exporta las cuatro franjas en orden", () => {

        expect(TRAINING_TIMES.map(t => t.id)).toEqual(["manana", "mediodia", "tarde", "descanso"]);
        expect(TRAINING_TIMES.map(t => t.prefix)).toEqual(["Mañana", "Mediodía", "Tarde", "Descanso"]);

    });

    it("«Descanso - » es la franja descanso, con el nombre sin prefijo", () => {

        const { plan, errors } = parseDietCsv(csv(
            "LUNES,Descanso - Desayuno,1,Huevos + pan 40 g,",
            "LUNES,Mañana - Desayuno,1,Avena 40 g,"
        ));

        expect(errors).toBeUndefined();
        expect(plan.days.LUNES.meals.map(m => [m.key, m.moment, m.training])).toEqual([
            ["LUNES|Descanso - Desayuno", "Desayuno", "descanso"],
            ["LUNES|Mañana - Desayuno", "Desayuno", "manana"]
        ]);

    });

    it("un prefijo de franja va a `training`; el momento queda sin prefijo y la clave conserva el original", () => {

        const { plan, errors } = parseDietCsv(csv(
            "LUNES,Mañana - Post-gym,1,Proteína 30 g,",
            "LUNES,Mediodía - Post-gym,1,Proteína 30 g + arroz 50 g,",
            "LUNES,Tarde - Post-gym,1,Batido 300 ml,",
            "LUNES,Tarde - Post-gym,2,Yogur 200 g,",
            "LUNES,21:00,1,Merluza 180 g,"
        ));

        expect(errors).toBeUndefined();

        const meals = plan.days.LUNES.meals;

        expect(meals.map(m => [m.key, m.moment, m.training])).toEqual([
            ["LUNES|Mañana - Post-gym", "Post-gym", "manana"],
            ["LUNES|Mediodía - Post-gym", "Post-gym", "mediodia"],
            ["LUNES|Tarde - Post-gym", "Post-gym", "tarde"],
            ["LUNES|21:00", "21:00", undefined]
        ]);
        // Sin franja: la propiedad ni existe.
        expect("training" in meals[3]).toBe(false);
        expect(meals[2].options.map(o => o.key)).toEqual(["LUNES|Tarde - Post-gym|1", "LUNES|Tarde - Post-gym|2"]);

    });

    it("la tilde descompuesta (NFD, p. ej. guardado desde macOS) casa igual", () => {

        const { plan } = parseDietCsv(csv("LUNES,Mañana - Desayuno,1,Avena 40 g,".normalize("NFD")));

        expect(plan.days.LUNES.meals[0]).toMatchObject({ moment: "Desayuno", training: "manana" });

    });

    it("un prefijo sin nombre de comida es un error con su línea", () => {

        const { errors } = parseDietCsv(csv("LUNES,Tarde - ,1,Batido 300 ml,"));

        expect(errors).toEqual([{ line: 2, message: expect.stringContaining("le falta el nombre de la comida") }]);

    });

    it("un plan sin prefijos queda exactamente igual que antes (sin `training`)", () => {

        const { plan } = parseDietCsv(csv("LUNES,09:00,1,Avena 40 g,", "LUNES,21:00,1,Merluza 180 g,"));

        expect(plan.days.LUNES.meals).toEqual([
            { key: "LUNES|09:00", moment: "09:00", options: [{ key: "LUNES|09:00|1", number: 1, text: "Avena 40 g" }] },
            { key: "LUNES|21:00", moment: "21:00", options: [{ key: "LUNES|21:00|1", number: 1, text: "Merluza 180 g" }] }
        ]);

    });

});
