import "./GymHeader.css";

import { GYM_HERO_IMAGES } from "../../../assets/gym/index.js";

// Hero de Gimnasio (mockup de rediseño, 2026-09-24): "GYM" + "Más fuerte.
// Más sólido." sobre una foto que depende de la PESTAÑA activa, no de la
// hora -- mismo patrón de hero con foto que Comunidad/Running, cambiando
// solo qué decide la foto. Entrenamiento para Rutinas y Composición
// corporal, un plato de comida para Nutrición.
export function GymHeader(tab = "rutinas") {

    const hero = tab === "nutricion" ? "nutrition" : "training";

    return `

        <header class="gym-header" data-hero="${hero}">

            <img
                class="gym-background-image"
                data-hero="${hero}"
                src="${GYM_HERO_IMAGES[hero]}"
                alt=""
            >

            <div class="gym-header-overlay"></div>

            <div class="gym-header-bottom-fade"></div>

            <div class="gym-header-content">

                <div class="gym-header-row">

                    <div class="gym-header-title">

                        <h1>GYM</h1>

                        <p class="gym-header-subtitle">Más fuerte. Más sólido.</p>

                    </div>

                    <!-- "+" (nueva rutina) solo en Rutinas: en las otras
                         pestañas no tiene nada que ver con lo que se ve. -->
                    ${tab === "rutinas" ? `
                        <button class="gym-add-button" data-action="open-routine-builder" aria-label="Nueva rutina">

                            +

                        </button>
                    ` : ""}

                </div>

            </div>

        </header>

    `;

}
