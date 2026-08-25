import { describe, it, expect, vi } from "vitest";

// getRoutines() se sustituye por un stub -- gymTimelineBridge.js es un
// puente de solo lectura, no le corresponde probar el CRUD real de
// gymRoutineStore.js (ya cubierto en su propio test).
let routines = [];
vi.mock("../../data/gymRoutineStore.js", () => ({
    getRoutines: () => routines
}));

const { getGymDayForDate } = await import("./gymTimelineBridge.js");

function routine(name, days) {
    return { id: `r-${name}`, name, days };
}

function day(id, title) {
    return { id, title, exercises: [] };
}

describe("getGymDayForDate", () => {

    it("sin rutinas guardadas, ningún día tiene gimnasio", () => {

        routines = [];
        expect(getGymDayForDate("2026-08-24")).toBeNull(); // lunes

    });

    it("encuentra el día cuyo título menciona el día de la semana de la fecha", () => {

        routines = [routine("Fuerza", [day("d1", "Lunes - Torso")])];

        expect(getGymDayForDate("2026-08-24")?.day.id).toBe("d1"); // lunes 24
        expect(getGymDayForDate("2026-08-25")).toBeNull(); // martes 25

    });

    it("es insensible a mayúsculas/acentos ('Miércoles' == 'miercoles')", () => {

        routines = [routine("Fuerza", [day("d1", "miércoles: pierna")])];

        expect(getGymDayForDate("2026-08-26")?.day.id).toBe("d1"); // miércoles 26

    });

    it("un título sin ningún nombre de día no coincide con nada", () => {

        routines = [routine("Fuerza", [day("d1", "Torso Completo")])];

        expect(getGymDayForDate("2026-08-24")).toBeNull();

    });

    it("con dos rutinas para el mismo día de la semana, gana la primera por orden de getRoutines()", () => {

        routines = [
            routine("A", [day("d-a", "Lunes A")]),
            routine("B", [day("d-b", "Lunes B")])
        ];

        expect(getGymDayForDate("2026-08-24")?.day.id).toBe("d-a");

    });

});
