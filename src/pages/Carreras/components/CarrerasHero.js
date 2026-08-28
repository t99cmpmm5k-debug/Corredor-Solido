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
                 una acción secundaria) -- pero tampoco un círculo de solo
                 icono como .race-detail-hero-button (RaceDetailView.css):
                 con el icono de calendario a secas se leía como "añadir
                 una carrera" (crear manualmente, algo que esta pantalla
                 ni siquiera ofrece todavía) en vez de "importar un
                 archivo" (lo único que hace). Pastilla con texto corto en
                 vez de tooltip -- un tooltip no se ve en móvil sin pulsar
                 y soltar, esto se lee de un vistazo. -->
            <button class="carreras-hero-import-button" data-action="open-race-import" aria-label="Importar carreras">
                <iconify-icon icon="solar:file-download-bold-duotone"></iconify-icon>
                Importar
            </button>

            <div class="carreras-hero-content">

                <h1>CALENDARIO DE CARRERAS</h1>

                <!-- "en tu calendario" sugería que el usuario había añadido
                     él mismo estas 151 carreras -- son el calendario
                     sembrado/importado disponible, no algo que compiló a
                     mano. -->
                <p>${totalCount} ${totalCount === 1 ? "carrera disponible" : "carreras disponibles"}</p>

            </div>

        </header>

    `;

}
