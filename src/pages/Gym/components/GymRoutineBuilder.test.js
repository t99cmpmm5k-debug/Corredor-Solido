import { describe, it, expect } from "vitest";
import { findConflictingRoutineName } from "./GymRoutineBuilder.js";

function routine(id, name, weekday) {
    return { id, name, days: [{ id: `${id}-day`, title: name, weekday, exercises: [] }] };
}

describe("findConflictingRoutineName -- aviso no bloqueante de día ya ocupado en el constructor", () => {

    it("sin weekday elegido, no hay nada que comprobar", () => {

        const routines = [routine("r1", "Torso Completo", "lunes")];
        expect(findConflictingRoutineName(routines, null, "r2")).toBeNull();
        expect(findConflictingRoutineName(routines, "", "r2")).toBeNull();

    });

    it("ninguna otra rutina usa ese día -- sin conflicto", () => {

        const routines = [routine("r1", "Torso Completo", "lunes")];
        expect(findConflictingRoutineName(routines, "viernes", "r2")).toBeNull();

    });

    it("otra rutina ya tiene ese día -- devuelve su nombre", () => {

        const routines = [routine("r1", "Torso Completo", "lunes")];
        expect(findConflictingRoutineName(routines, "lunes", "r2")).toBe("Torso Completo");

    });

    it("la propia rutina que se está editando no cuenta como conflicto consigo misma", () => {

        const routines = [routine("r1", "Torso Completo", "lunes")];
        expect(findConflictingRoutineName(routines, "lunes", "r1")).toBeNull();

    });

    it("una rutina nueva (excludeRoutineId null) sí se compara contra todas las existentes", () => {

        const routines = [routine("r1", "Torso Completo", "lunes")];
        expect(findConflictingRoutineName(routines, "lunes", null)).toBe("Torso Completo");

    });

});
