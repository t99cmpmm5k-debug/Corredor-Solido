import "./CarrerasHero.css";

import { themeManager } from "../../../theme/themeManager.js";
import { RACE_HERO_IMAGES } from "../../../assets/races/index.js";

// Mismo cascarón que PlanHeader.js/RunningHeader.js: <img> de fondo +
// overlay, con el truco de margin-top negativo en el CSS para que la
// foto llegue al borde superior real (detrás de la isla dinámica)
// mientras el título queda empujado por debajo por el padding-top
// interno — no reinventar esa parte, ya está resuelta ahí. La foto en sí
// sí varía por franja horaria (RACE_HERO_IMAGES), misma mecánica que
// RunningHeader.js: themeManager decide el tema, el mapa decide la foto.
export function CarrerasHero(totalCount) {

    const theme = themeManager.getTheme();

    return `

        <header class="carreras-hero">

            <img class="carreras-hero-background-image" src="${RACE_HERO_IMAGES[theme.id]}" alt="">

            <div class="carreras-hero-overlay"></div>

            <!-- "Importar carreras" ya no es un botón ancho en el flujo
                 normal (pulido de cierre: era demasiado protagonista para
                 una acción secundaria) -- mismo cascarón visual que
                 .race-detail-hero-button (RaceDetailView.css), solo que
                 aquí vive en el hero de la lista en vez del de detalle. -->
            <button class="carreras-hero-import-button" data-action="open-race-import" aria-label="Importar carreras">
                <iconify-icon icon="solar:calendar-add-bold-duotone"></iconify-icon>
            </button>

            <div class="carreras-hero-content">

                <h1>CALENDARIO DE CARRERAS</h1>

                <p>${totalCount} ${totalCount === 1 ? "carrera" : "carreras"} en tu calendario</p>

            </div>

        </header>

    `;

}
