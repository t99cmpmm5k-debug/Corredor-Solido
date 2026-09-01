import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { describe, it, expect, beforeEach, vi } from "vitest";

function resetFakeIndexedDB() {
    globalThis.indexedDB = new IDBFactory();
}

describe("referenceRouteStore — recorridos de referencia (Running V1)", () => {

    beforeEach(() => {
        resetFakeIndexedDB();
        vi.resetModules();
    });

    it("crea un recorrido vacío y queda disponible en getReferenceRoutes()", async () => {

        const { hydrate, createReferenceRoute, getReferenceRoutes } = await import("./referenceRouteStore.js");
        await hydrate();

        const route = await createReferenceRoute("8K referencia");

        expect(getReferenceRoutes()).toHaveLength(1);
        expect(getReferenceRoutes()[0]).toMatchObject({ id: route.id, name: "8K referencia", workoutIds: [] });

    });

    it("un recorrido creado sobrevive a una re-hidratación (persiste de verdad en IndexedDB)", async () => {

        const { hydrate, createReferenceRoute } = await import("./referenceRouteStore.js");
        await hydrate();
        await createReferenceRoute("10K parque");

        vi.resetModules();

        const { hydrate: hydrateAgain, getReferenceRoutes } = await import("./referenceRouteStore.js");
        await hydrateAgain();

        expect(getReferenceRoutes()).toHaveLength(1);
        expect(getReferenceRoutes()[0].name).toBe("10K parque");

    });

    it("asigna un entreno a un recorrido, y aparece en workoutIds y en getReferenceRouteForWorkout()", async () => {

        const { hydrate, createReferenceRoute, assignWorkoutToRoute, getReferenceRouteForWorkout, getReferenceRouteById } = await import("./referenceRouteStore.js");
        await hydrate();

        const route = await createReferenceRoute("8K referencia");
        assignWorkoutToRoute(route.id, "workout-1");

        expect(getReferenceRouteById(route.id).workoutIds).toEqual(["workout-1"]);
        expect(getReferenceRouteForWorkout("workout-1")?.id).toBe(route.id);

    });

    it("un entreno pertenece como mucho a un recorrido -- reasignarlo lo quita del anterior", async () => {

        const { hydrate, createReferenceRoute, assignWorkoutToRoute, getReferenceRouteById } = await import("./referenceRouteStore.js");
        await hydrate();

        const routeA = await createReferenceRoute("Recorrido A");
        const routeB = await createReferenceRoute("Recorrido B");

        assignWorkoutToRoute(routeA.id, "workout-1");
        assignWorkoutToRoute(routeB.id, "workout-1");

        expect(getReferenceRouteById(routeA.id).workoutIds).toEqual([]);
        expect(getReferenceRouteById(routeB.id).workoutIds).toEqual(["workout-1"]);

    });

    it("assignWorkoutToRoute(null, workoutId) quita el entreno de cualquier recorrido, sin asignarlo a ninguno", async () => {

        const { hydrate, createReferenceRoute, assignWorkoutToRoute, getReferenceRouteForWorkout, getReferenceRouteById } = await import("./referenceRouteStore.js");
        await hydrate();

        const route = await createReferenceRoute("8K referencia");
        assignWorkoutToRoute(route.id, "workout-1");

        assignWorkoutToRoute(null, "workout-1");

        expect(getReferenceRouteForWorkout("workout-1")).toBeNull();
        expect(getReferenceRouteById(route.id).workoutIds).toEqual([]);

    });

    it("unassignWorkoutFromReferenceRoutes() saca un entreno sin tocar los demás del mismo recorrido", async () => {

        const { hydrate, createReferenceRoute, assignWorkoutToRoute, unassignWorkoutFromReferenceRoutes, getReferenceRouteById } = await import("./referenceRouteStore.js");
        await hydrate();

        const route = await createReferenceRoute("8K referencia");
        assignWorkoutToRoute(route.id, "workout-1");
        assignWorkoutToRoute(route.id, "workout-2");

        unassignWorkoutFromReferenceRoutes("workout-1");

        expect(getReferenceRouteById(route.id).workoutIds).toEqual(["workout-2"]);

    });

    it("renombra un recorrido sin tocar sus entrenos asignados", async () => {

        const { hydrate, createReferenceRoute, assignWorkoutToRoute, renameReferenceRoute, getReferenceRouteById } = await import("./referenceRouteStore.js");
        await hydrate();

        const route = await createReferenceRoute("Nombre original");
        assignWorkoutToRoute(route.id, "workout-1");

        renameReferenceRoute(route.id, "Nombre nuevo");

        const updated = getReferenceRouteById(route.id);
        expect(updated.name).toBe("Nombre nuevo");
        expect(updated.workoutIds).toEqual(["workout-1"]);

    });

    it("borra un recorrido de verdad -- desaparece de la lista y no vuelve tras re-hidratar", async () => {

        const { hydrate, createReferenceRoute, deleteReferenceRoute, getReferenceRoutes } = await import("./referenceRouteStore.js");
        await hydrate();

        const route = await createReferenceRoute("A borrar");
        deleteReferenceRoute(route.id);

        expect(getReferenceRoutes()).toHaveLength(0);

        vi.resetModules();

        const { hydrate: hydrateAgain, getReferenceRoutes: getReferenceRoutesAgain } = await import("./referenceRouteStore.js");
        await hydrateAgain();

        expect(getReferenceRoutesAgain()).toHaveLength(0);

    });

    it("borrar un recorrido no borra los entrenos reales -- solo deja de agruparlos (fuera del alcance de esta store)", async () => {

        // referenceRouteStore.js nunca importa ni toca workoutStore.js --
        // verificado aquí indirectamente: borrar un recorrido no lanza ni
        // requiere que exista ningún workout real detrás de esos ids.
        const { hydrate, createReferenceRoute, assignWorkoutToRoute, deleteReferenceRoute, getReferenceRoutes } = await import("./referenceRouteStore.js");
        await hydrate();

        const route = await createReferenceRoute("8K referencia");
        assignWorkoutToRoute(route.id, "workout-inventado-1");

        expect(() => deleteReferenceRoute(route.id)).not.toThrow();
        expect(getReferenceRoutes()).toHaveLength(0);

    });

});
