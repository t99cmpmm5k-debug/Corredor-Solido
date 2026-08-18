import { describe, it, expect } from "vitest";
import { parseGymRoutineFromRows } from "./pdf.js";

// Filas reales extraídas con pdfjs-dist (extractPdfRows) de
// Rutina_Gym_Rafa.pdf, verificadas contra el archivo real antes de escribir
// el parser — no son una aproximación escrita a mano. Incluye las 2 filas
// donde Reps y Peso llegaron fundidos en un único ítem de PDF (Zancadas,
// Monster Walk) y el párrafo final tal cual lo separó pdf.js en 3 líneas.
const REAL_ROWS = [
    ["Rutina de Gimnasio - Rafa"],
    ["Lunes - Torso"],
    ["Ejercicio", "Series", "Reps", "Peso"],
    ["Press banca", "4", "6-8", "45 kg"],
    ["Dominadas asistidas", "4", "6-8", "Asistencia"],
    ["Remo barra", "4", "8", "45-50 kg"],
    ["Press militar", "3", "8-10", "18-20 kg"],
    ["Elevaciones laterales", "3", "15", "8 kg"],
    ["Fondos asistidos", "3", "10", "RIR 1-2"],
    ["Curl EZ", "3", "10", "25 kg"],
    ["Tríceps polea", "3", "12", "Moderado"],
    ["Miércoles - Pierna"],
    ["Ejercicio", "Series", "Reps", "Peso"],
    ["Prensa", "4", "8", "150 kg"],
    ["Peso muerto rumano", "4", "8", "60 kg"],
    ["Zancadas", "3", "10/pierna 16 kg"],
    ["Curl femoral", "3", "12", "Moderado"],
    ["Gemelos", "4", "15", "Pesado"],
    ["Tibial anterior", "3", "20", "Peso corporal"],
    ["Monster Walk", "3", "15 pasos Banda"],
    ["Core", "3", "15", "Elev. piernas"],
    ["Viernes - Full Body"],
    ["Ejercicio", "Series", "Reps", "Peso"],
    ["Goblet squat", "3", "10", "32 kg"],
    ["Press inclinado", "3", "10", "22 kg"],
    ["Jalón pecho", "3", "10", "60 kg"],
    ["Hip thrust", "3", "10", "80 kg"],
    ["Face pull", "3", "15", "Moderado"],
    ["Curl martillo", "2", "12", "14 kg"],
    ["Tríceps cuerda", "2", "15", "Moderado"],
    ["Rueda abd.", "3", "10", "-"],
    ["Progresión: deja 1-2 repeticiones en reserva. Cuando completes todas las repeticiones"],
    ["con buena técnica, aumenta 2,5 kg. Descanso: 2-3 min en básicos y 60-90 s en"],
    ["accesorios."]
];

describe("parseGymRoutineFromRows", () => {

    it("reconoce los 3 días con su weekday y título", () => {

        const { days } = parseGymRoutineFromRows(REAL_ROWS);

        expect(days.map(d => ({ weekday: d.weekday, title: d.title }))).toEqual([
            { weekday: "lunes", title: "Torso" },
            { weekday: "miercoles", title: "Pierna" },
            { weekday: "viernes", title: "Full Body" }
        ]);

    });

    it("extrae el número correcto de ejercicios por día", () => {

        const { days } = parseGymRoutineFromRows(REAL_ROWS);

        expect(days.map(d => d.exercises.length)).toEqual([8, 8, 8]);

    });

    it("parsea una fila normal en kg", () => {

        const { days } = parseGymRoutineFromRows(REAL_ROWS);
        const pressBanca = days[0].exercises[0];

        expect(pressBanca).toMatchObject({
            id: "press-banca",
            name: "Press banca",
            sets: 4,
            targetReps: "6-8",
            targetWeight: 45,
            weightUnit: "kg",
            targetLoadText: "45 kg"
        });

    });

    it("conserva el rango completo en targetLoadText aunque targetWeight sea solo el primer número", () => {

        const { days } = parseGymRoutineFromRows(REAL_ROWS);
        const remoBarra = days[0].exercises[2];

        expect(remoBarra.targetWeight).toBe(45);
        expect(remoBarra.targetLoadText).toBe("45-50 kg");

    });

    it("mapea valores cualitativos de Peso a targetLoadText sin peso numérico", () => {

        const { days } = parseGymRoutineFromRows(REAL_ROWS);
        const dominadas = days[0].exercises[1];

        expect(dominadas.targetWeight).toBeNull();
        expect(dominadas.weightUnit).toBeNull();
        expect(dominadas.targetLoadText).toBe("Asistencia");

    });

    it("mapea '-' a targetLoadText null", () => {

        const { days } = parseGymRoutineFromRows(REAL_ROWS);
        const ruedaAbd = days[2].exercises[7];

        expect(ruedaAbd.targetWeight).toBeNull();
        expect(ruedaAbd.targetLoadText).toBeNull();

    });

    it("separa Reps/Peso fundidos (Zancadas) con aviso de importación", () => {

        const { days } = parseGymRoutineFromRows(REAL_ROWS);
        const zancadas = days[1].exercises.find(e => e.name === "Zancadas");

        expect(zancadas.targetReps).toBe("10/pierna");
        expect(zancadas.targetWeight).toBe(16);
        expect(zancadas.weightUnit).toBe("kg");
        expect(zancadas.importWarnings.length).toBeGreaterThan(0);

    });

    it("separa Reps/Peso fundidos (Monster Walk) con corte por vocabulario cualitativo", () => {

        const { days } = parseGymRoutineFromRows(REAL_ROWS);
        const monsterWalk = days[1].exercises.find(e => e.name === "Monster Walk");

        expect(monsterWalk.targetReps).toBe("15 pasos");
        expect(monsterWalk.targetLoadText).toBe("Banda");
        expect(monsterWalk.importWarnings.length).toBeGreaterThan(0);

    });

    it("junta el párrafo final como routineNotes, no como ejercicio", () => {

        const { routineNotes, days } = parseGymRoutineFromRows(REAL_ROWS);

        expect(routineNotes).toContain("Progresión");
        expect(routineNotes).toContain("Descanso");
        expect(days[2].exercises).toHaveLength(8);

    });

    it("da ids deterministas por nombre, estables entre reimportaciones", () => {

        const first = parseGymRoutineFromRows(REAL_ROWS);
        const second = parseGymRoutineFromRows(REAL_ROWS);

        expect(second.days[0].exercises[0].id).toBe(first.days[0].exercises[0].id);
        expect(first.days[0].id).toBe("lunes-torso");

    });

    it("lanza si no reconoce ningún día", () => {

        expect(() => parseGymRoutineFromRows([["texto suelto"]])).toThrow();

    });

});
