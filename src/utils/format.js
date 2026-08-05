export function formatSecondsAsClock(totalSeconds) {

    if (totalSeconds == null || Number.isNaN(totalSeconds)) return "";

    const abs = Math.max(0, Math.round(totalSeconds));

    const hours = Math.floor(abs / 3600);
    const minutes = Math.floor((abs % 3600) / 60);
    const seconds = abs % 60;

    const ss = String(seconds).padStart(2, "0");

    if (hours > 0) {
        const mm = String(minutes).padStart(2, "0");
        return `${hours}:${mm}:${ss}`;
    }

    return `${minutes}:${ss}`;

}

export function parseClockToSeconds(text) {

    const trimmed = String(text ?? "").trim();
    if (!trimmed) return null;

    const parts = trimmed.split(":").map(Number);
    if (parts.some(Number.isNaN)) return null;

    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];

    return null;

}
