import { describe, it, expect, vi, afterEach } from "vitest";
import { setState } from "../../core/state.js";

let todaySession = null;
let gymMatch = null;
const getGymDayForDateSpy = vi.fn(() => gymMatch);

vi.mock("../../data/workoutStore.js", () => ({
    getTodaySession: () => todaySession,
    getCurrentWeekSessions: () => [],
    getWorkoutForSession: () => null
}));

vi.mock("../../pages/Plan/gymTimelineBridge.js", () => ({
    getGymDayForDate: (date) => getGymDayForDateSpy(date)
}));

vi.mock("../../data/gymSessionStore.js", () => ({
    getAverageDurationForDay: () => null
}));

// Tiempo en vivo (Fase 1) -- mockeado aparte para poder controlar su
// estado sin depender de geolocalización/red reales en los tests. Por
// defecto "idle" (igual que arranca currentWeatherStore.js de verdad
// antes de que loadCurrentWeather() resuelva), así que todos los tests de
// arriba (que no lo mencionan) siguen viendo el badge oculto, como hoy.
let currentWeatherState = { status: "idle", temp: null, icon: null };

vi.mock("../../pages/Home/currentWeatherStore.js", () => ({
    getCurrentWeatherState: () => currentWeatherState
}));

const { MasterCard } = await import("./MasterCard.js");

// Corrección 2026-08-26 (coherencia Plan↔Home): "running siempre manda"
// (25 ago) se descarta -- si Plan tiene programados running Y gimnasio el
// mismo día, Inicio debe mostrar los dos apilados, no solo uno.
describe("MasterCard -- coherencia con Plan: muestra running Y gimnasio si los dos existen (corregido 2026-08-26)", () => {

    afterEach(() => {
        todaySession = null;
        gymMatch = null;
        getGymDayForDateSpy.mockClear();
        setState("selectedWorkout", null);
        setState("homeSelectedWorkout", null);
    });

    it("con running Y gimnasio programados el mismo día, apila las dos tarjetas", () => {

        todaySession = { id: "run1", title: "Rodaje", status: "pending" };
        gymMatch = { routine: { id: "r1", name: "Torso" }, day: { id: "d1", title: "Torso", exercises: [] }, finishedSession: null };

        const html = MasterCard();

        expect(html).toContain("RUNNING DE HOY");
        expect(html).toContain("GIMNASIO DE HOY");

    });

    it("solo con running, no hay hueco de gimnasio", () => {

        todaySession = { id: "run1", title: "Rodaje", status: "pending" };
        gymMatch = null;

        const html = MasterCard();

        expect(html).toContain("RUNNING DE HOY");
        expect(html).not.toContain("GIMNASIO DE HOY");

    });

    it("sin running hoy pero con gimnasio programado, muestra la tarjeta de gimnasio en el mismo hueco", () => {

        todaySession = null;
        gymMatch = { routine: { id: "r1", name: "Torso" }, day: { id: "d1", title: "Torso", exercises: [] }, finishedSession: null };

        const html = MasterCard();

        expect(html).toContain("GIMNASIO DE HOY");
        expect(html).not.toContain("session-card--empty");
        expect(html).not.toContain("RUNNING DE HOY");

    });

    it("sin running ni gimnasio hoy, muestra el aviso vacío de siempre", () => {

        todaySession = null;
        gymMatch = null;

        const html = MasterCard();

        expect(html).toContain("session-card--empty");
        expect(html).not.toContain("GIMNASIO DE HOY");
        expect(html).not.toContain("RUNNING DE HOY");

    });

    it("una selección manual de otro día en Inicio (homeSelectedWorkout, botón \"Cambiar\") con gimnasio también programado ESE día muestra las dos", () => {

        todaySession = null;
        gymMatch = { routine: { id: "r1", name: "Torso" }, day: { id: "d1", title: "Torso", exercises: [] }, finishedSession: null };
        setState("homeSelectedWorkout", { id: "other-day", title: "Descanso", status: "pending", date: "2026-08-28" });

        const html = MasterCard();

        expect(html).toContain("RUNNING DE HOY");
        expect(html).toContain("GIMNASIO DE HOY");

    });

    it("la comprobación de gimnasio usa la fecha del día seleccionado a mano, no siempre \"hoy\" -- coherente con Plan para ESE día", () => {

        setState("homeSelectedWorkout", { id: "other-day", title: "Series", status: "pending", date: "2026-08-28" });

        MasterCard();

        expect(getGymDayForDateSpy).toHaveBeenCalledWith("2026-08-28");

    });

    // Bug real 2026-08-26: Inicio y Plan compartían el mismo
    // selectedWorkout (state.js) -- tocar cualquier día en la línea
    // temporal de Plan se colaba aquí como si fuera "la sesión de hoy".
    // homeSelectedWorkout (propio de Inicio) y selectedWorkout (propio de
    // Plan, ver planStore.js) son dos claves de estado independientes
    // desde entonces -- este test confirma que MasterCard() ignora por
    // completo la de Plan.
    it("selectedWorkout (el estado de Plan) NO afecta a Inicio -- son estados independientes", () => {

        todaySession = null;
        gymMatch = null;
        setState("selectedWorkout", { id: "plan-tuesday", title: "Series", status: "pending" });

        const html = MasterCard();

        // Sin sesión hoy ni en Inicio ni en Plan, el hueco vacío de
        // siempre -- si selectedWorkout se colara, aquí aparecería
        // "Series" en su lugar.
        expect(html).toContain("session-card--empty");
        expect(html).not.toContain("Series");

    });

});

// Día sin sesión con contexto real de Cumplimiento del plan (Capa 3, punto
// 3 del documento de mejoras).
describe("MasterCard -- mensaje del día vacío con contexto de Cumplimiento del plan", () => {

    afterEach(() => {
        todaySession = null;
        gymMatch = null;
        setState("selectedWorkout", null);
        setState("homeSelectedWorkout", null);
    });

    it("sin plan importado esta semana (hasPlan:false), mensaje neutro sin ningún número inventado", () => {

        const html = MasterCard({ hasPlan: false, sessionsPlanned: 0, sessionsCompleted: 0, plannedKm: 0, actualKm: 0, kmPercent: null });

        expect(html).toContain("Sin sesión planificada para hoy.");
        expect(html).not.toMatch(/\d+\/\d+/);

    });

    it("sin argumento (planCompliance no pasado), cae al mismo mensaje neutro -- nunca revienta", () => {

        const html = MasterCard();
        expect(html).toContain("Sin sesión planificada para hoy.");

    });

    it("con plan, muestra las sesiones reales completadas/planificadas de esta semana", () => {

        const html = MasterCard({ hasPlan: true, sessionsPlanned: 3, sessionsCompleted: 2, plannedKm: 20, actualKm: 15, kmPercent: 75 });

        expect(html).toContain("Día de recuperación. Llevas 2/3 sesiones completadas esta semana.");
        expect(html).not.toContain("no necesitas sumar más carga");

    });

    it("con la semana cerca de completarse (>=90%), añade el refuerzo -- por debajo del umbral, no lo añade", () => {

        const near = MasterCard({ hasPlan: true, sessionsPlanned: 3, sessionsCompleted: 3, plannedKm: 20, actualKm: 19, kmPercent: 95 });
        expect(near).toContain("Llevas 3/3 sesiones completadas esta semana. Hoy no necesitas sumar más carga.");

        const far = MasterCard({ hasPlan: true, sessionsPlanned: 3, sessionsCompleted: 1, plannedKm: 20, actualKm: 5, kmPercent: 25 });
        expect(far).toContain("Llevas 1/3 sesiones completadas esta semana.");
        expect(far).not.toContain("no necesitas sumar más carga");

    });

    it("con plan pero sin ningún km objetivo (kmPercent null), muestra las sesiones sin intentar el refuerzo por km", () => {

        const html = MasterCard({ hasPlan: true, sessionsPlanned: 2, sessionsCompleted: 2, plannedKm: 0, actualKm: 0, kmPercent: null });

        expect(html).toContain("Llevas 2/2 sesiones completadas esta semana.");
        expect(html).not.toContain("no necesitas sumar más carga");

    });

    it("solo aplica cuando NO hay running ni gimnasio hoy -- con gimnasio programado, no se pinta ningún mensaje del día vacío", () => {

        gymMatch = { routine: { id: "r1", name: "Torso" }, day: { id: "d1", title: "Torso", exercises: [] }, finishedSession: null };

        const html = MasterCard({ hasPlan: true, sessionsPlanned: 3, sessionsCompleted: 2, plannedKm: 20, actualKm: 15, kmPercent: 75 });

        expect(html).not.toContain("Día de recuperación");
        expect(html).toContain("GIMNASIO DE HOY");

    });

});

// Tiempo en vivo por geolocalización real (Fase 1 de 3, ver
// currentWeatherStore.js) -- badge discreto dentro de MasterCard, nunca
// bloquea ni cambia el resto de la tarjeta (sesión/gimnasio/vacío) esté
// como esté.
describe("MasterCard -- badge de tiempo en vivo (Fase 1)", () => {

    afterEach(() => {
        todaySession = null;
        gymMatch = null;
        setState("selectedWorkout", null);
        setState("homeSelectedWorkout", null);
        currentWeatherState = { status: "idle", temp: null, icon: null };
    });

    it("status idle (aún sin resolver), no pinta el badge", () => {

        currentWeatherState = { status: "idle", temp: null, icon: null };

        const html = MasterCard();

        expect(html).not.toContain("master-card-weather");

    });

    it("status loading, no pinta el badge -- nunca un placeholder mientras carga", () => {

        currentWeatherState = { status: "loading", temp: null, icon: null };

        const html = MasterCard();

        expect(html).not.toContain("master-card-weather");

    });

    it("status unavailable (permiso denegado, sin geolocalización, o fallo de red), no pinta el badge -- la tarjeta sigue igual que siempre", () => {

        currentWeatherState = { status: "unavailable", temp: null, icon: null };
        todaySession = { id: "run1", title: "Rodaje", status: "pending" };

        const html = MasterCard();

        expect(html).not.toContain("master-card-weather");
        expect(html).toContain("RUNNING DE HOY");

    });

    it("status ready con dato real, pinta el badge con la temperatura y el icono real de la categoría", () => {

        currentWeatherState = { status: "ready", temp: 22, icon: "sun" };

        const html = MasterCard();

        expect(html).toContain("master-card-weather");
        expect(html).toContain("22°");
        expect(html).toContain("solar:sun-2-bold-duotone");

    });

    it("el badge aparece igual con sesión de hoy, con gimnasio, o con el hueco vacío -- no depende de qué más se muestre", () => {

        currentWeatherState = { status: "ready", temp: 15, icon: "rain" };
        todaySession = null;
        gymMatch = null;

        const html = MasterCard();

        expect(html).toContain("session-card--empty");
        expect(html).toContain("master-card-weather");
        expect(html).toContain("solar:cloud-rain-bold-duotone");

    });

});
