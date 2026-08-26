const CORNER_RADIUS = 32;

// Proporciones de la muesca medidas sobre el mockup (referencia: tarjeta de 795px de ancho)
const NOTCH = {
    descentStart: 277 / 795,
    valleyStart: 350 / 795,
    valleyEnd: 480 / 795,
    ascentEnd: 553 / 795,
    depth: 40 / 795
};

// Silueta completa (muesca + 4 lados + 4 esquinas) en las unidades reales
// de la tarjeta. Esquinas en px fijos, muesca proporcional al ancho, lados
// verticales según el alto real medido — por eso hace falta width/height
// reales, no un viewBox fijo.
function buildOutline(width, height) {

    const r = CORNER_RADIUS;
    const notchDepth = width * NOTCH.depth;

    const x1 = width * NOTCH.descentStart;
    const x2 = width * NOTCH.valleyStart;
    const x3 = width * NOTCH.valleyEnd;
    const x4 = width * NOTCH.ascentEnd;

    const cx1 = x1 + (x2 - x1) / 2;
    const cx2 = x3 + (x4 - x3) / 2;

    return [
        `M 0,${r}`,
        `A ${r},${r} 0 0 1 ${r},0`,
        `L ${x1},0`,
        `C ${cx1},0 ${cx1},${notchDepth} ${x2},${notchDepth}`,
        `L ${x3},${notchDepth}`,
        `C ${cx2},${notchDepth} ${cx2},0 ${x4},0`,
        `L ${width - r},0`,
        `A ${r},${r} 0 0 1 ${width},${r}`,
        `L ${width},${height - r}`,
        `A ${r},${r} 0 0 1 ${width - r},${height}`,
        `L ${r},${height}`,
        `A ${r},${r} 0 0 1 0,${height - r}`,
        "Z"
    ].join(" ");

}

let observer = null;

function applyOutline(card, width, height) {

    const glass = card.querySelector(".session-glass");
    const highlight = card.querySelector(".session-highlight");
    const stroke = card.querySelector(".session-outline-stroke");

    if (!glass || !stroke) return;

    const d = buildOutline(width, height);

    glass.style.clipPath = `path("${d}")`;

    if (highlight) highlight.style.clipPath = `path("${d}")`;

    stroke.setAttribute("d", d);

}

// querySelectorAll, no querySelector -- desde que MasterCard() puede
// apilar dos tarjetas a la vez (running + gimnasio el mismo día, ver
// MasterCard.js), puede haber más de un .session-card en el DOM y cada
// una necesita su propio recorte según SU propio tamaño real (entry.target
// identifica de cuál de las dos viene cada medición del ResizeObserver).
export function initSessionCardOutline() {

    if (observer) {
        observer.disconnect();
        observer = null;
    }

    const cards = document.querySelectorAll(".session-card");
    if (!cards.length) return;

    observer = new ResizeObserver(entries => {

        for (const entry of entries) {

            const { width, height } = entry.contentRect;

            if (width === 0 || height === 0) continue;

            applyOutline(entry.target, width, height);

        }

    });

    cards.forEach(card => observer.observe(card));

}
