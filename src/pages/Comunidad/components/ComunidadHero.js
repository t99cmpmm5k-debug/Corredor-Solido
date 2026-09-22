import "./ComunidadHero.css";

import { themeManager } from "../../../theme/themeManager.js";
import { COMUNIDAD_IMAGES } from "../../../assets/comunidad";

// Mismo cascarón foto-de-fondo + overlay + título anclado abajo que
// CarrerasHero.js/RunningHeader.js/GymHeader.js (themeManager decide el
// tema, un mapa de imágenes por tema decide la foto) -- set de fotos
// propio de Comunidad (COMUNIDAD_IMAGES), ya no las de Running usadas como
// placeholder temporal mientras no existían.
export function ComunidadHero() {

    const theme = themeManager.getTheme();

    return `

        <header class="comunidad-hero">

            <img class="comunidad-hero-background-image" src="${COMUNIDAD_IMAGES[theme.id]}" alt="">

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
