// Series con datos escritos a mano pero sin ✓ al "Finalizar entrenamiento".
// Solo las series con ✓ cuentan para el historial y "Anterior"; los kg se
// rellenan solos desde la sesión anterior, así que un valor presente NO
// significa que la serie se hiciera. Lo que sí lo indica es que el usuario
// lo tocara (+/− de kg o reps): aquí se guarda, por serie, el valor que
// tenía ANTES del primer toque (el relleno automático), y una serie cuenta
// si sigue sin ✓ y su kg o sus reps ya no son ese valor.
//
// Fuera del formato guardado de la sesión (gymSessions no cambia ni se
// sincroniza): en memoria, con copia en localStorage para que una recarga
// a mitad de entreno (iOS cierra la PWA en segundo plano) no lo pierda. Si
// localStorage no está disponible, solo en memoria.
const STORAGE_KEY = "corredor-solido-gym-touched-sets";

let touches = null;

function load() {

    if (touches) return touches;

    try {
        touches = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") ?? {};
    } catch {
        touches = {};
    }

    return touches;

}

function save() {

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(touches));
    } catch {
        // Sin localStorage: se queda en memoria.
    }

}

const setKey = (exerciseId, setIndex) => `${exerciseId}|${setIndex}`;

// Llamar ANTES de cambiar kg o reps a mano, con la serie tal como está.
// Solo el primer toque guarda el valor original.
export function recordSetTouch(sessionId, exerciseId, setIndex, set) {

    const all = load();
    const sessionTouches = all[sessionId] ?? {};
    const key = setKey(exerciseId, setIndex);

    if (key in sessionTouches) return;

    sessionTouches[key] = { weight: set?.weight ?? null, reps: set?.reps ?? null };
    all[sessionId] = sessionTouches;
    save();

}

// [{ exerciseId, setIndex }] de las series sin ✓ cuyo kg o reps cambió a
// mano en esta sesión. Volver al valor de partida no cuenta.
export function getUnmarkedTouchedSets(session) {

    if (!session) return [];

    const sessionTouches = load()[session.id] ?? {};
    const result = [];

    for (const exercise of session.exercises ?? []) {

        (exercise.sets ?? []).forEach((set, setIndex) => {

            const original = sessionTouches[setKey(exercise.exerciseId, setIndex)];
            if (!original || set.done) return;

            const changed = (set.weight ?? null) !== original.weight || (set.reps ?? null) !== original.reps;
            if (changed) result.push({ exerciseId: exercise.exerciseId, setIndex });

        });

    }

    return result;

}

export function clearSetTouches(sessionId) {

    const all = load();
    if (!(sessionId in all)) return;

    delete all[sessionId];
    save();

}

// "1 serie sin marcar" / "3 series sin marcar".
export function unmarkedSetsTitle(count) {

    return `Tienes ${count} ${count === 1 ? "serie" : "series"} sin marcar`;

}

// Solo para tests.
export function resetSetTouchesForTests() {

    touches = null;

}
