import { describe, it, expect, vi, afterEach } from "vitest";
import { buildRestDayHero } from "./restDayHero.js";
import { formatWeekday } from "./date.js";

const TODAY = new Date(2026, 7, 23); // domingo 23 ago 2026, sin zona horaria (hora local)

afterEach(() => {
    vi.restoreAllMocks();
});

function pickFirstVariant() {
    vi.spyOn(Math, "random").mockReturnValue(0);
}

function pickLastVariant() {
    vi.spyOn(Math, "random").mockReturnValue(0.999);
}

describe("buildRestDayHero", () => {

    it("sin ningún workout, cae al mensaje neutro sin errores", () => {

        const hero = buildRestDayHero([], TODAY);

        expect(hero).toMatchObject({
            title: ["Descansa", "hoy"],
            coachTitle: "Día libre"
        });

    });

    it("con muy pocos datos y demasiado antiguos, también cae al neutro (no fabrica racha ni comparación)", () => {

        const workouts = [
            { id: "w1", date: "2026-01-05", type: "z2", distanceKm: 8 }
        ];

        const hero = buildRestDayHero(workouts, TODAY);

        expect(hero.coachTitle).toBe("Día libre");

    });

    it("con un único workout reciente (fuera de la ventana de 7 días), usa la referencia al último entreno (no inventa racha ni comparación)", () => {

        // 10 días antes de TODAY: suficientemente reciente para citarlo,
        // pero fuera de la ventana de "últimos 7 días" y de una racha (una
        // sola semana no cuenta) — así solo puede aplicar esta variante.
        const date = "2026-08-13";
        const workouts = [
            { id: "w1", date, type: "z2", distanceKm: 10.234 }
        ];

        pickFirstVariant();
        const hero = buildRestDayHero(workouts, TODAY);

        expect(hero.coachTitle).toBe("Tu último registro");
        expect(hero.coachMessages[0]).toContain("10.2 km");
        expect(hero.coachMessages[0]).toContain(formatWeekday(date));

    });

    it("detecta una racha de semanas consecutivas con entreno real", () => {

        const workouts = [
            { id: "w1", date: "2026-08-04", type: "z2", distanceKm: 8 }, // semana del 2026-08-03
            { id: "w2", date: "2026-08-11", type: "z2", distanceKm: 8 }, // semana del 2026-08-10
            { id: "w3", date: "2026-08-18", type: "z2", distanceKm: 8 }  // semana del 2026-08-17
        ];

        pickFirstVariant();
        const hero = buildRestDayHero(workouts, TODAY);

        expect(hero.title).toEqual(["Racha de", "3 semanas"]);
        expect(hero.coachMessages[0]).toBe("Llevas 3 semanas seguidas entrenando.");

    });

    it("no cuenta como racha si solo hay una semana con entreno", () => {

        const workouts = [
            { id: "w1", date: "2026-08-18", type: "z2", distanceKm: 8 }
        ];

        const variants = [];
        for (let i = 0; i < 20; i++) {
            variants.push(buildRestDayHero(workouts, TODAY).coachTitle);
        }

        expect(variants).not.toContain("Constancia");

    });

    it("calcula distancia y número de entrenos de los últimos 7 días", () => {

        const workouts = [
            { id: "w1", date: "2026-08-19", type: "z2", distanceKm: 8 },
            { id: "w2", date: "2026-08-21", type: "tempo", distanceKm: 6.4 }
        ];

        // Fuerza la selección de la variante "Esta semana" ordenando el
        // mock de random para que caiga en el segundo índice de variants
        // (racha no aplica aquí — solo 1 semana con datos).
        vi.spyOn(Math, "random").mockReturnValue(0);
        const hero = buildRestDayHero(workouts, TODAY);

        expect(["Tu semana", "Tu último registro"]).toContain(hero.coachTitle);

        if (hero.coachTitle === "Tu semana") {
            expect(hero.coachMessages[0]).toBe("2 entrenos y 14.4 km en los últimos 7 días.");
        }

    });

    it("detecta una mejora de ritmo real entre dos bloques de entrenos con pace registrado", () => {

        const workouts = [
            { id: "w1", date: "2026-07-01", type: "z2", avgPaceSecPerKm: 330 },
            { id: "w2", date: "2026-07-05", type: "z2", avgPaceSecPerKm: 328 },
            { id: "w3", date: "2026-07-10", type: "z2", avgPaceSecPerKm: 332 },
            { id: "w4", date: "2026-08-15", type: "z2", avgPaceSecPerKm: 310 },
            { id: "w5", date: "2026-08-18", type: "z2", avgPaceSecPerKm: 308 },
            { id: "w6", date: "2026-08-20", type: "z2", avgPaceSecPerKm: 312 }
        ];

        const titles = [];
        for (let i = 0; i <= 10; i++) {
            vi.spyOn(Math, "random").mockReturnValue(i / 10);
            titles.push(buildRestDayHero(workouts, TODAY).coachTitle);
        }

        expect(titles).toContain("Progreso");

    });

    it("no anuncia mejora de ritmo si el margen es demasiado pequeño para ser fiable", () => {

        const workouts = [
            { id: "w1", date: "2026-08-01", type: "z2", avgPaceSecPerKm: 330 },
            { id: "w2", date: "2026-08-05", type: "z2", avgPaceSecPerKm: 330 },
            { id: "w3", date: "2026-08-10", type: "z2", avgPaceSecPerKm: 330 },
            { id: "w4", date: "2026-08-15", type: "z2", avgPaceSecPerKm: 329 },
            { id: "w5", date: "2026-08-18", type: "z2", avgPaceSecPerKm: 330 },
            { id: "w6", date: "2026-08-20", type: "z2", avgPaceSecPerKm: 329 }
        ];

        const titles = [];
        for (let i = 0; i <= 10; i++) {
            vi.spyOn(Math, "random").mockReturnValue(i / 10);
            titles.push(buildRestDayHero(workouts, TODAY).coachTitle);
        }

        expect(titles).not.toContain("Progreso");

    });

    it("se recalcula en cada llamada — no reutiliza un resultado cacheado tras añadir un workout nuevo", () => {

        const workouts = [
            { id: "w1", date: "2026-08-13", type: "z2", distanceKm: 10 }
        ];

        pickFirstVariant();
        const before = buildRestDayHero(workouts, TODAY);
        expect(before.coachMessages[0]).toContain(formatWeekday("2026-08-13"));
        expect(before.coachMessages[0]).toContain("10 km");

        workouts.push({ id: "w2", date: "2026-08-22", type: "z2", distanceKm: 5 });

        // La variante "último registro" es siempre la última del array
        // cuando aplica — random cercano a 1 la selecciona de forma
        // determinista sin depender de cuántas otras variantes se hayan
        // vuelto disponibles con el nuevo dato.
        pickLastVariant();
        const after = buildRestDayHero(workouts, TODAY);
        expect(after.coachTitle).toBe("Tu último registro");
        expect(after.coachMessages[0]).toContain(formatWeekday("2026-08-22"));
        expect(after.coachMessages[0]).toContain("5 km");

    });

});
