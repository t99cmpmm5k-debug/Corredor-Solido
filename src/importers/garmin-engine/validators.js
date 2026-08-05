function inRange(value, min, max) {
    return Number.isFinite(value) && value >= min && value <= max;
}

export function distance(value) { return inRange(value, 0.05, 300); }
export function heartRate(value) { return inRange(value, 35, 240); }
export function calories(value) { return inRange(value, 10, 10000); }
export function cadence(value) { return inRange(value, 80, 260); }
export function temperature(value) { return inRange(value, -40, 65); }
export function elevation(value) { return inRange(value, 0, 20000); }

export function pace(value) {
    if (!/^\d{1,2}:\d{2}$/.test(String(value || ""))) return false;
    const [m, s] = String(value).split(":").map(Number);
    return m >= 1 && m <= 30 && s >= 0 && s < 60;
}

export function duration(value) {
    const s = String(value || "");
    if (!/^(?:\d{1,2}:)?\d{1,3}:\d{2}$/.test(s)) return false;
    const parts = s.split(":").map(Number);
    return parts.every(Number.isFinite) && parts.at(-1) < 60;
}
