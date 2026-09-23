import { describe, it, expect, vi, afterEach } from "vitest";

const executeMock = vi.fn();

vi.mock("../db.js", () => ({
    pool: { execute: (...args) => executeMock(...args) }
}));

function mockRes() {
    const res = {};
    res.json = vi.fn().mockReturnValue(res);
    res.status = vi.fn().mockReturnValue(res);
    return res;
}

function missingTableError() {
    return Object.assign(new Error("Table 'x.gym_routines' doesn't exist"), { code: "ER_NO_SUCH_TABLE" });
}

describe("/api/sync -- rutinas de gimnasio", () => {

    afterEach(() => {
        executeMock.mockReset();
        vi.restoreAllMocks();
    });

    it("gymRoutines participa en el sync con su propia tabla", async () => {

        const { SYNC_TABLES, SYNC_KEYS } = await import("../syncTables.js");

        expect(SYNC_TABLES.gymRoutines).toBe("gym_routines");
        expect(SYNC_KEYS).toContain("gymRoutines");

    });

    it("POST guarda cada rutina por id en gym_routines (upsert: un segundo push no duplica)", async () => {

        executeMock.mockResolvedValue([{}]);
        const { postSync } = await import("./sync.js");

        const routine = { id: "r1", name: "Torso", days: [] };
        const res = mockRes();

        await postSync({ userId: 7, body: { gymRoutines: [routine] } }, res);

        const call = executeMock.mock.calls.find(([sql]) => sql.includes("INSERT INTO gym_routines"));
        expect(call[0]).toContain("ON DUPLICATE KEY UPDATE");
        expect(call[1]).toEqual([7, "r1", JSON.stringify(routine)]);
        expect(res.json).toHaveBeenCalledWith({ saved: { gymRoutines: 1 } });

    });

    it("GET devuelve las rutinas del usuario bajo gymRoutines", async () => {

        executeMock.mockImplementation(sql => Promise.resolve(
            sql.includes("FROM gym_routines") ? [[{ data: { id: "r1", name: "Torso" } }]] : [[]]
        ));
        const { getSync } = await import("./sync.js");
        const res = mockRes();

        await getSync({ userId: 7 }, res);

        const body = res.json.mock.calls[0][0];
        expect(body.gymRoutines).toEqual([{ id: "r1", name: "Torso" }]);
        expect(body.workouts).toEqual([]);

    });

    it("una tombstone de gymRoutines borra la fila real de gym_routines", async () => {

        executeMock.mockResolvedValue([{}]);
        const { postSync } = await import("./sync.js");

        await postSync({ userId: 7, body: { tombstones: [{ id: "gymRoutines:r1", storeKey: "gymRoutines", recordId: "r1" }] } }, mockRes());

        const deleteCall = executeMock.mock.calls.find(([sql]) => sql.startsWith("DELETE FROM gym_routines"));
        expect(deleteCall[1]).toEqual([7, "r1"]);

    });

    // Si el código se despliega antes de aplicar migrations/007, gym_routines
    // no existe: el resto del sync de todos los usuarios no puede caerse.
    it("sin la tabla gym_routines todavía, GET y POST siguen funcionando para el resto de datos", async () => {

        vi.spyOn(console, "warn").mockImplementation(() => {});
        executeMock.mockImplementation(sql => sql.includes("gym_routines")
            ? Promise.reject(missingTableError())
            : Promise.resolve(sql.startsWith("SELECT") ? [[{ data: { id: "w1" } }]] : [{}]));

        const { getSync, postSync } = await import("./sync.js");

        const getRes = mockRes();
        await getSync({ userId: 7 }, getRes);
        expect(getRes.json.mock.calls[0][0].gymRoutines).toEqual([]);
        expect(getRes.json.mock.calls[0][0].workouts).toEqual([{ id: "w1" }]);

        const postRes = mockRes();
        await postSync({ userId: 7, body: { workouts: [{ id: "w1" }], gymRoutines: [{ id: "r1" }] } }, postRes);
        expect(postRes.json).toHaveBeenCalledWith({ saved: { workouts: 1, gymRoutines: 0 } });

    });

    it("cualquier otro error de base de datos no se oculta", async () => {

        executeMock.mockRejectedValue(Object.assign(new Error("boom"), { code: "ER_ACCESS_DENIED_ERROR" }));
        const { getSync } = await import("./sync.js");

        await expect(getSync({ userId: 7 }, mockRes())).rejects.toThrow("boom");

    });

});

describe("/api/sync -- composición corporal", () => {

    afterEach(() => {
        executeMock.mockReset();
    });

    it("bodyComposition participa en el sync con su propia tabla, upsert por id y tombstones", async () => {

        const { SYNC_TABLES } = await import("../syncTables.js");
        expect(SYNC_TABLES.bodyComposition).toBe("body_composition");

        executeMock.mockResolvedValue([{}]);
        const { postSync } = await import("./sync.js");

        const entry = { id: "b1", date: "2026-09-23", weightKg: 72.5, bodyFatPercent: null };
        await postSync({ userId: 7, body: { bodyComposition: [entry], tombstones: [{ id: "bodyComposition:b0", storeKey: "bodyComposition", recordId: "b0" }] } }, mockRes());

        const insert = executeMock.mock.calls.find(([sql]) => sql.includes("INSERT INTO body_composition"));
        expect(insert[1]).toEqual([7, "b1", JSON.stringify(entry)]);
        expect(executeMock.mock.calls.some(([sql, params]) => sql.startsWith("DELETE FROM body_composition") && params[1] === "b0")).toBe(true);

    });

});
