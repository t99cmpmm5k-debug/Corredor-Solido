import "./ComunidadHero.css";

import { themeManager } from "../../../theme/themeManager.js";
import { RUNNING_IMAGES } from "../../../assets/running";

// Mismo cascarón foto-de-fondo + overlay + título anclado abajo que
// CarrerasHero.js/RunningHeader.js/GymHeader.js (themeManager decide el
// tema, un mapa de imágenes por tema decide la foto) -- Comunidad no tiene
// su propio set de fotos propio (pedido explícito: no generar/descargar
// una imagen nueva sin confirmar antes), así que reutiliza tal cual el de
// Running (RUNNING_IMAGES): "imagen de running genérica" ya coherente con
// el resto de heroes de la app, sin inventar un archivo nuevo.
export function ComunidadHero() {

    const theme = themeManager.getTheme();

    return `

        <header class="comunidad-hero">

            <img class="comunidad-hero-background-image" src="${RUNNING_IMAGES[theme.id]}" alt="">

            <div class="comunidad-hero-overlay"></div>

            <div class="comunidad-hero-content">

                <p class="comunidad-hero-brand">Corredor <span>Sólido</span></p>

                <p class="comunidad-hero-eyebrow">Gente real. Kilómetros reales.</p>

                <h1>Comunidad</h1>

                <p class="comunidad-hero-subtitle">Corre, comparte, inspira.</p>

            </div>

        </header>

    `;

}
