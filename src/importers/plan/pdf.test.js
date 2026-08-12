import { describe, it, expect } from "vitest";
import { parsePlanFromPdfText } from "./pdf.js";

// Texto real extraído con pdfjs-dist de un plan generado por ChatGPT
// (Plan_running_semana_Rafa_10-16_agosto_2026.pdf), verificado contra el
// archivo real antes de escribir el parser — no es una aproximación
// escrita a mano.
const REAL_PDF_TEXT = [
    "PLAN RUNNING - SEMANA 10-16 AGOSTO",
    "2026",
    "",
    "Objetivo: continuar la progresión hacia la media maratón con tres estímulos bien separados: base",
    "aeróbica, calidad controlada y tirada larga.",
    "",
    "MARTES",
    " ",
    "JUEVES",
    " ",
    "DOMINGO",
    "",
    "8 km Z2",
    "Rodaje fácil + 4 x 80 m",
    "opcionales",
    "4 x 1.000 m",
    "Calidad controlada",
    "13 km",
    "Tirada larga progresiva",
    "",
    "Martes 11 - 8 km en Zona 2",
    "",
    "Objetivo",
    " ",
    "Sumar volumen aeróbico sin fatiga y llegar fresco a la sesión de calidad.",
    "Estructura",
    " ",
    "8 km continuos en terreno cómodo. Al terminar, solo si te encuentras bien: 4 x 80",
    "m progresivos con recuperación completa caminando.",
    "Intensidad",
    " ",
    "Zona 2 estable. No persigas el ritmo; si el calor o las pulsaciones suben, afloja.",
    "Clave",
    " ",
    "Debe terminar con sensación de que podrías seguir corriendo.",
    "",
    "Jueves 13 - 4 x 1.000 m",
    "",
    "Objetivo",
    " ",
    "Mejorar umbral, economía de carrera y capacidad para mantener ritmos altos con",
    "control.",
    "Estructura",
    " ",
    "15 min suaves + movilidad + 3-4 progresivos. Después 4 x 1.000 m a",
    "4:25-4:30/km, con 2 min de trote muy suave entre repeticiones. Finaliza con",
    "10-15 min suaves.",
    "Intensidad",
    " ",
    "Los cuatro miles deben ser regulares. No salir por debajo de 4:20/km.",
    "Clave",
    " ",
    "No hace falta esprintar el último. La calidad está en mantener el ritmo, no en",
    "acabar a muerte.",
    "",
    "Domingo 16 - Tirada larga - 13 km",
    "",
    "Objetivo",
    " ",
    "Aumentar progresivamente la resistencia específica para la media maratón.",
    "Estructura",
    " ",
    "11 km en Zona 2 + 2 km finales algo más alegres únicamente si llegas con",
    "buenas sensaciones.",
    "Intensidad",
    " ",
    "Primeros 11 km controlados. Final opcional alrededor de 5:25-5:35/km.",
    "Clave",
    " ",
    "Si hace mucho calor, has dormido mal o las pulsaciones van altas, haz los 13 km",
    "completos en Zona 2 y elimina el progresivo.",
    "",
    "REGLAS DE AJUSTE",
    "",
    "• Poco sueño: si duermes menos de 6 horas o muy interrumpido, retrasa la calidad 24 horas o",
    "conviértela en rodaje suave.",
    "• Calor: prioriza primera hora y usa las pulsaciones como referencia principal.",
    "• Piernas pesadas: reduce volumen antes que forzar el ritmo.",
    "• Dolor localizado: no completes la sesión por obligación; para y revalora.",
    "Semana anterior completada: 8 km aeróbicos + 5 x 800 m + 12 km progresivos, además de un",
    "rodaje corto de descarga. No hay que recuperar sesiones perdidas: ahora toca progresar."
].join("\n");

describe("parsePlanFromPdfText — PDF real de ChatGPT", () => {

    const result = parsePlanFromPdfText(REAL_PDF_TEXT);

    it("reconoce el nombre del plan uniendo el título partido en dos líneas", () => {
        expect(result.planName).toBe("PLAN RUNNING - SEMANA 10-16 AGOSTO 2026");
    });

    it("reconoce las 3 sesiones", () => {
        expect(result.sessions).toHaveLength(3);
    });

    it("Martes: fecha, título y distancia correctos", () => {
        const s = result.sessions[0];
        expect(s.date).toBe("2026-08-11");
        expect(s.title).toBe("8 km en Zona 2");
        expect(s.distanceKm).toBe(8);
    });

    it("Jueves: sin distanceKm porque el título es un patrón de repeticiones", () => {
        const s = result.sessions[1];
        expect(s.date).toBe("2026-08-13");
        expect(s.title).toBe("4 x 1.000 m");
        expect(s.distanceKm).toBeNull();
    });

    it("Domingo: fecha, título y distancia correctos", () => {
        const s = result.sessions[2];
        expect(s.date).toBe("2026-08-16");
        expect(s.title).toBe("Tirada larga - 13 km");
        expect(s.distanceKm).toBe(13);
    });

    it("type, durationSec, targetPaceSecPerKm y targetHrZone siempre null", () => {
        result.sessions.forEach(s => {
            expect(s.type).toBeNull();
            expect(s.durationSec).toBeNull();
            expect(s.targetPaceSecPerKm).toBeNull();
            expect(s.targetHrZone).toBeNull();
        });
    });

    it("description concatena las 4 secciones en orden fijo, incluyendo el rango de ritmo sin extraer", () => {
        const s = result.sessions[1];
        expect(s.description).toContain("Objetivo:");
        expect(s.description).toContain("Estructura:");
        expect(s.description).toContain("Intensidad:");
        expect(s.description).toContain("Clave:");
        expect(s.description).toContain("4:25-4:30/km");
        expect(s.description.indexOf("Objetivo:")).toBeLessThan(s.description.indexOf("Estructura:"));
        expect(s.description.indexOf("Estructura:")).toBeLessThan(s.description.indexOf("Intensidad:"));
        expect(s.description.indexOf("Intensidad:")).toBeLessThan(s.description.indexOf("Clave:"));
    });

    it("fieldMeta.date.confidence queda por debajo del umbral de aviso aunque la fecha se resuelva", () => {
        result.sessions.forEach(s => {
            expect(s.fieldMeta.date.confidence).toBeLessThan(0.9);
            expect(s.fieldMeta.date.confidence).not.toBeNull();
        });
    });

    it("el objetivo semanal general no queda dentro de ninguna sesión, sale como planWarning", () => {
        result.sessions.forEach(s => {
            expect(s.description).not.toContain("continuar la progresión");
        });
        expect(result.planWarnings.some(w => w.includes("continuar la progresión"))).toBe(true);
    });

    it("REGLAS DE AJUSTE no queda dentro de la sesión de Domingo, sale como planWarning", () => {
        const domingo = result.sessions[2];
        expect(domingo.description).not.toContain("REGLAS DE AJUSTE");
        expect(domingo.description).not.toContain("Poco sueño");
        expect(result.planWarnings.some(w => w.includes("REGLAS DE AJUSTE"))).toBe(true);
    });

});

// Texto real extraído con pdfjs-dist de un segundo PDF real, distinto
// formato, mismo generador (ChatGPT) — verificado contra el archivo
// real (Plan_siguientes_entrenamientos_Rafa.pdf) antes de generalizar el
// parser, no una aproximación escrita a mano.
const REAL_PDF2_TEXT = [
    "SIGUIENTES ENTRENAMIENTOS",
    "",
    "Objetivo: seguir construyendo una base sólida hacia la media maratón, asimilando primero la",
    "carga de 8 km + 5 x 800 m + 12 km progresivos.",
    "",
    "Situación actual",
    " ",
    "Prioridad inmediata",
    "",
    "Semana completada con tres estímulos: rodaje",
    "aeróbico, series y tirada larga.",
    "Recuperar bien, volver a correr suave y",
    "después introducir una sesión de calidad",
    "controlada.",
    "",
    "1",
    " ",
    "Jueves 6 de agosto - Rodaje fácil de recuperación - 7 km",
    "",
    "Objetivo",
    " ",
    "Recuperar de la tirada de 12 km y sumar volumen sin añadir fatiga.",
    "Estructura",
    " ",
    "10 min muy suaves + carrera continua hasta completar 7 km. Sin progresivo final.",
    "Intensidad",
    " ",
    "Zona 2. No perseguir ritmo: deja que las pulsaciones marquen la velocidad.",
    "Clave",
    " ",
    "Si las piernas siguen pesadas o has dormido mal, deja la sesión en 6 km.",
    "",
    "2",
    " ",
    "Domingo 9 de agosto - Calidad controlada - 4 x 1.000 m",
    "",
    "Objetivo",
    " ",
    "Mejorar el umbral aeróbico y la capacidad para mantener ritmos altos con control.",
    "Estructura",
    " ",
    "15 min suaves + movilidad + 4 progresivos cortos. Después, 4 x 1.000 m con 2",
    "min de trote muy suave. Termina con 10-15 min suaves.",
    "Intensidad",
    " ",
    "Objetivo por repetición: 4:25-4:30/km. Ritmo uniforme, sin salir por debajo de",
    "4:20/km.",
    "Clave",
    " ",
    "La última repetición no debe ser un esprint. Mejor cuatro miles regulares que uno",
    "excesivamente rápido.",
    "",
    "3",
    " ",
    "Martes 11 de agosto - Rodaje aeróbico - 8 km",
    "",
    "Objetivo",
    " ",
    "Seguir desarrollando la base aeróbica y facilitar la recuperación después de las",
    "series.",
    "Estructura",
    " ",
    "8 km continuos en terreno cómodo. Solo al terminar, 4 x 80 m progresivos si las",
    "piernas están frescas.",
    "Intensidad",
    " ",
    "Zona 2 estable. Los progresivos son ágiles, pero nunca a máxima velocidad.",
    "Clave",
    " ",
    "Si el calor eleva el pulso, reduce el ritmo. Cumplir la zona es más importante que",
    "el ritmo medio.",
    "",
    "TIRADA LARGA SIGUIENTE",
    "",
    "4",
    " ",
    "Sábado 15 o domingo 16 de agosto - Tirada larga - 13 km",
    "",
    "Objetivo",
    " ",
    "Aumentar gradualmente la resistencia para acercarnos a las demandas de la",
    "media maratón.",
    "Estructura",
    " ",
    "Primeros 11 km muy controlados. Últimos 2 km algo más alegres únicamente si",
    "llegas con buenas sensaciones y pulsaciones estables.",
    "Intensidad",
    " ",
    "Parte principal en Zona 2. Final opcional alrededor de 5:30-5:40/km, sin forzar.",
    "Clave",
    " ",
    "Con calor, poco sueño o piernas pesadas: realiza los 13 km completos en Zona 2 y",
    "elimina el final progresivo.",
    "",
    "ORGANIZACIÓN CON EL GIMNASIO",
    "",
    "Día",
    " ",
    "Trabajo recomendado",
    "Lunes",
    " ",
    "Descanso de carrera. Torso moderado si te encuentras recuperado.",
    "Miércoles",
    " ",
    "Pierna con una serie menos en prensa, peso muerto rumano y zancadas.",
    "Viernes",
    " ",
    "Full body moderado, evitando llegar al fallo antes de la tirada larga.",
    "",
    "REGLAS DE AJUSTE",
    "",
    "• Sueño: con menos de 6 horas o sueño muy interrumpido, convierte la calidad en rodaje suave o",
    "retrásala 24-48 horas.",
    "• Calor: corre temprano, lleva agua y usa las pulsaciones como referencia principal.",
    "• Fatiga: si notas piernas vacías, dolor localizado o el pulso sube de forma anormal, reduce la sesión.",
    "• Objetivo: avanzar hacia la media maratón sin aumentar a la vez la distancia y la intensidad.",
    "",
    "Importante: este bloque comienza después de haber completado 8 km, 5 x 800 m y 12 km. No",
    "hace falta repetir esa semana. Ahora toca asimilarla y progresar."
].join("\n");

describe("parsePlanFromPdfText — segundo PDF real, formato distinto (número de sesión en línea separada, mes por cabecera, sin año, fecha ambigua)", () => {

    const result = parsePlanFromPdfText(REAL_PDF2_TEXT);

    it("reconoce las 4 sesiones pese al número de sesión en línea separada", () => {
        expect(result.sessions).toHaveLength(4);
    });

    it("el nombre del plan es la primera línea, sin arrastrar el número de la primera sesión", () => {
        expect(result.planName).toBe("SIGUIENTES ENTRENAMIENTOS");
    });

    it("sesión 1 (Jueves, con mes en la cabecera): título y distancia correctos, sin fecha por falta de año", () => {
        const s = result.sessions[0];
        expect(s.title).toBe("Rodaje fácil de recuperación - 7 km");
        expect(s.distanceKm).toBe(7);
        expect(s.date).toBeNull();
        expect(s.fieldMeta.date.confidence).toBeNull();
        expect(s.importWarnings.some(w => w.includes("fecha completa"))).toBe(true);
    });

    it("sesión 2: sin distanceKm por ser un patrón de repeticiones", () => {
        const s = result.sessions[1];
        expect(s.title).toBe("Calidad controlada - 4 x 1.000 m");
        expect(s.distanceKm).toBeNull();
        expect(s.date).toBeNull();
    });

    it("sesión 3: título y distancia correctos, sin fecha", () => {
        const s = result.sessions[2];
        expect(s.title).toBe("Rodaje aeróbico - 8 km");
        expect(s.distanceKm).toBe(8);
        expect(s.date).toBeNull();
    });

    it("sesión 4 (fecha ambigua): fecha null con aviso citando el texto literal, título sin la fecha mezclada", () => {
        const s = result.sessions[3];
        expect(s.date).toBeNull();
        expect(s.title).toBe("Tirada larga - 13 km");
        expect(s.distanceKm).toBe(13);
        expect(s.importWarnings.some(w => w.includes("Sábado 15 o domingo 16 de agosto"))).toBe(true);
    });

    it("avisa de que se reconoce día y mes pero no el año, no del aviso genérico de mes/año", () => {
        expect(result.planWarnings.some(w => w.includes("no se ha encontrado el año"))).toBe(true);
        expect(result.planWarnings.some(w => w.includes("No se pudo determinar el mes y el año"))).toBe(false);
    });

    it("\"TIRADA LARGA SIGUIENTE\" (heading entre la sesión 3 y la 4) no queda dentro de la sesión 3, sale como planWarning aparte", () => {
        const sesion3 = result.sessions[2];
        expect(sesion3.description).not.toContain("TIRADA LARGA SIGUIENTE");
        expect(sesion3.description).toContain("Clave:");
        expect(result.planWarnings.some(w => w.includes("TIRADA LARGA SIGUIENTE"))).toBe(true);
    });

    it("\"ORGANIZACIÓN CON EL GIMNASIO\" y \"REGLAS DE AJUSTE\" no quedan dentro de la sesión 4, salen como planWarning aparte", () => {
        const sesion4 = result.sessions[3];
        expect(sesion4.description).not.toContain("ORGANIZACIÓN CON EL GIMNASIO");
        expect(sesion4.description).not.toContain("REGLAS DE AJUSTE");
        expect(sesion4.description).toContain("Clave:");
        expect(result.planWarnings.some(w => w.includes("ORGANIZACIÓN CON EL GIMNASIO"))).toBe(true);
    });

    it("hay dos avisos de \"contenido adicional\" distintos, no uno solo mezclando ambos bloques", () => {
        const contenidoAdicional = result.planWarnings.filter(w => w.startsWith("Contenido adicional"));
        expect(contenidoAdicional).toHaveLength(2);
    });

});

describe("parsePlanFromPdfText — casos límite", () => {

    it("lanza un error claro si no reconoce ninguna cabecera de sesión", () => {
        expect(() => parsePlanFromPdfText("Esto no tiene ninguna sesión reconocible.")).toThrow(/sesiones/);
    });

    it("lanza un error claro con texto vacío", () => {
        expect(() => parsePlanFromPdfText("   \n  \n")).toThrow();
    });

    it("deja la fecha en null en todas las sesiones si no se resuelve mes/año, con aviso", () => {

        const text = [
            "Plan sin título con fecha reconocible",
            "",
            "Martes 11 - Rodaje suave",
            "Objetivo",
            "Rodaje tranquilo."
        ].join("\n");

        const result = parsePlanFromPdfText(text);

        expect(result.sessions[0].date).toBeNull();
        expect(result.sessions[0].fieldMeta.date.confidence).toBeNull();
        expect(result.planWarnings.some(w => w.includes("mes y el año"))).toBe(true);

    });

});
