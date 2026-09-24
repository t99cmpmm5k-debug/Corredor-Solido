import { describe, it, expect } from "vitest";
import { parseDietCsv, parseCsvRecords, buildDietCsvTemplate, PLAN_DAYS } from "./dietCsv.js";

// Extracto de la plantilla real (dieta_2500_plantilla.csv, 2026-09-24),
// completado con una comida mínima por día para que la dieta sea válida.
const REAL_EXCERPT = [
    "dia,momento,opcion,alimento,notas",
    "LUNES,HIDRATACION,1,3.0 L aprox.,",
    "LUNES,09:00,1,2 huevos + 150 ml claras + avena 35 g + plátano 120 g + nueces 15 g,",
    "LUNES,21:00,1,Merluza 180 g + verdura 250 g + aceite de oliva 10 g,",
    "LUNES,21:00,2,Pollo 160 g + verdura 250 g + aceite 10 g,",
    "LUNES,21:00,3,Tortilla de 2 huevos + 200 ml claras + verdura 250 g + aceite 5 g,",
    "LUNES,AJUSTE,1,,Mantener igual que en la dieta original.",
    "MARTES,Pre-run,1,Café + 1/2 plátano 60 g si corres al levantarte. Si pasan >60-90 min hasta correr usar plátano completo 120 g,",
    "MIERCOLES,13:30,1,Arroz 60 g en crudo + pollo 160 g + aceite 10 g + ensalada 150 g,",
    "JUEVES,Post-series,1,Proteína 30 g + crema de arroz 50 g,",
    "VIERNES,17:00,1,Pan 60 g + atún 110 g + 2 claras,",
    "VIERNES,17:00,2,Patata 300 g + 2 huevos + 2 claras,",
    "TIRADA_LARGA,Pre,1,Plátano 120 g + café,",
    "DESCANSO,09:00,1,2 huevos + 150 ml claras + pan 40 g + nueces 10 g,",
    "REGLAS_GENERALES,REGLA,1,,Mantén esta estructura 2-3 semanas antes de recortar calorías.",
    "REGLAS_GENERALES,REGLA,2,,Si el peso medio semanal y la cintura bajan no cambies nada.",
    ""
].join("\n");

function withRow(row) {
    return REAL_EXCERPT.replace("REGLAS_GENERALES,REGLA,1", `${row}\nREGLAS_GENERALES,REGLA,1`);
}

describe("parseDietCsv -- plantilla válida", () => {

    it("agrupa por día y momento, con las opciones en orden y claves deterministas", () => {

        const { plan, errors } = parseDietCsv(REAL_EXCERPT);

        expect(errors).toBeUndefined();
        expect(Object.keys(plan.days)).toEqual(PLAN_DAYS);

        const monday = plan.days.LUNES;
        expect(monday.hydration).toBe("3.0 L aprox.");
        expect(monday.adjustment).toBe("Mantener igual que en la dieta original.");
        expect(monday.meals.map(m => m.moment)).toEqual(["09:00", "21:00"]);
        expect(monday.meals[1]).toEqual({
            key: "LUNES|21:00",
            moment: "21:00",
            options: [
                { key: "LUNES|21:00|1", number: 1, text: "Merluza 180 g + verdura 250 g + aceite de oliva 10 g" },
                { key: "LUNES|21:00|2", number: 2, text: "Pollo 160 g + verdura 250 g + aceite 10 g" },
                { key: "LUNES|21:00|3", number: 3, text: "Tortilla de 2 huevos + 200 ml claras + verdura 250 g + aceite 5 g" }
            ]
        });

        expect(plan.days.MARTES.hydration).toBeNull();
        expect(plan.generalRules.map(r => r.number)).toEqual([1, 2]);

    });

    it("acepta BOM, finales de línea CRLF, separador ; (Excel en español) y campos entre comillas", () => {

        const excel = "﻿" + REAL_EXCERPT
            .replace(/,/g, ";")
            .replace("LUNES;09:00;1;2 huevos + 150 ml claras + avena 35 g + plátano 120 g + nueces 15 g;", 'LUNES;09:00;1;"2 huevos; ""caseros"" + 150 ml claras + avena 35 g + plátano 120 g + nueces 15 g";')
            .replace(/\n/g, "\r\n");

        const { plan, errors } = parseDietCsv(excel);

        expect(errors).toBeUndefined();
        expect(plan.days.LUNES.meals[0].options[0].text).toBe('2 huevos; "caseros" + 150 ml claras + avena 35 g + plátano 120 g + nueces 15 g');

    });

    it("las opciones salen ordenadas por número aunque el CSV las traiga desordenadas", () => {

        const { plan } = parseDietCsv(REAL_EXCERPT.replace("VIERNES,17:00,1,", "VIERNES,17:00,9,"));
        expect(plan.days.VIERNES.meals[0].options.map(o => o.number)).toEqual([2, 9]);

    });

});

describe("parseDietCsv -- nunca adivina: error con línea y motivo", () => {

    const firstError = text => parseDietCsv(text).errors?.[0];

    it("cabecera distinta, vacío o comillas sin cerrar", () => {

        expect(firstError("dia,momento,alimento,opcion,notas\nLUNES,09:00,x,1,")).toMatchObject({ line: 1, message: expect.stringContaining("dia,momento,opcion,alimento,notas") });
        expect(firstError("  \n")).toMatchObject({ message: expect.stringContaining("vacío") });
        expect(firstError(withRow('LUNES,10:00,1,"sin cerrar,'))).toMatchObject({ message: expect.stringContaining("comillas") });

    });

    it("número de columnas, día, opción y momento especial mal escrito", () => {

        expect(firstError(withRow("LUNES,10:00,1,avena 35 g, extra,"))).toMatchObject({ line: 15, message: expect.stringContaining("6 columnas") });
        expect(firstError(withRow("lunes,10:00,1,avena 35 g,"))).toMatchObject({ message: expect.stringContaining("«lunes» no es válido") });
        expect(firstError(withRow("SABADO,10:00,1,avena 35 g,"))).toMatchObject({ message: expect.stringContaining("«SABADO» no es válido") });
        expect(firstError(withRow("LUNES,10:00,A,avena 35 g,"))).toMatchObject({ message: expect.stringContaining("opción «A»") });
        expect(firstError(withRow("LUNES,10:00,0,avena 35 g,"))).toMatchObject({ message: expect.stringContaining("opción «0»") });
        expect(firstError(withRow("LUNES,Ajuste,1,,texto"))).toMatchObject({ message: expect.stringContaining("exactamente «AJUSTE»") });
        expect(firstError(withRow("LUNES,Hidratación,1,3 L,"))).toMatchObject({ message: expect.stringContaining("exactamente «HIDRATACION»") });

    });

    it("filas especiales con el contenido en la columna equivocada o repetidas", () => {

        expect(firstError(withRow("MARTES,AJUSTE,1,texto,"))).toMatchObject({ message: expect.stringContaining("AJUSTE no lleva nada en «alimento»") });
        expect(firstError(withRow("LUNES,AJUSTE,2,,otro"))).toMatchObject({ message: expect.stringContaining("ya tiene una fila AJUSTE") });
        expect(firstError(withRow("MARTES,HIDRATACION,1,,3 L"))).toMatchObject({ message: expect.stringContaining("le falta la cantidad") });
        expect(firstError(withRow("MARTES,REGLA,1,,texto"))).toMatchObject({ message: expect.stringContaining("solo se usa con el día REGLAS_GENERALES") });
        expect(firstError(withRow("REGLAS_GENERALES,09:00,3,,texto"))).toMatchObject({ message: expect.stringContaining("tiene que ser REGLA") });
        expect(firstError(withRow("MARTES,10:00,1,avena,nota"))).toMatchObject({ message: expect.stringContaining("las comidas no llevan «notas»") });
        expect(firstError(withRow("MARTES,10:00,1,,"))).toMatchObject({ message: expect.stringContaining("le falta el texto en «alimento»") });
        expect(firstError(withRow("LUNES,09:00,1,otra cosa,"))).toMatchObject({ line: 15, message: expect.stringContaining("ya está en la línea 3") });

    });

    it("falta un día entero; y todos los errores se listan a la vez, sin importar nada", () => {

        const noDescanso = REAL_EXCERPT.replace("DESCANSO,09:00,1,2 huevos + 150 ml claras + pan 40 g + nueces 10 g,\n", "");
        expect(firstError(noDescanso)).toMatchObject({ line: null, message: expect.stringContaining("falta DESCANSO") });

        const result = parseDietCsv(withRow("lunes,10:00,1,x,\nLUNES,10:00,B,x,"));
        expect(result.plan).toBeUndefined();
        expect(result.errors.map(e => e.line)).toEqual([15, 16]);

    });

});

describe("parseCsvRecords / plantilla descargable", () => {

    it("salto de línea dentro de comillas: el registro empieza en su línea real", () => {

        const { records } = parseCsvRecords('a,"b\nc",d\ne,f,g\n', ",");
        expect(records).toEqual([{ line: 1, fields: ["a", "b\nc", "d"] }, { line: 3, fields: ["e", "f", "g"] }]);

    });

    it("la plantilla vacía tiene la cabecera exacta y sus filas de ejemplo son válidas en formato", () => {

        const template = buildDietCsvTemplate();
        expect(template.split("\n")[0]).toBe("dia,momento,opcion,alimento,notas");
        // Solo trae LUNES: el único error es que faltan los demás días.
        expect(parseDietCsv(template).errors.every(e => e.message.startsWith("falta "))).toBe(true);

    });

});
