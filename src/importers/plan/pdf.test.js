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
