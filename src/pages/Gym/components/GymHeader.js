import "./GymHeader.css";

import { themeManager } from "../../../theme/themeManager.js";
import { GYM_IMAGES, GYM_NUTRITION_IMAGE } from "../../../assets/gym/index.js";

// Hero de Gimnasio: "GYM" + "Más fuerte. Más sólido." sobre una foto.
// - Rutinas y Composición corporal: la foto-por-tema propia de Gimnasio,
//   mismo mecanismo que PlanHeader.js/RunningHeader.js (themeManager decide
//   el tema según la hora, GYM_IMAGES la foto).
// - Nutrición: una foto fija de un plato de comida, a cualquier hora.
export function GymHeader(tab = "rutinas") {

    const nutrition = tab === "nutricion";
    const theme = themeManager.getTheme();

    return `

        <header class="gym-header" data-hero="${nutrition ? "nutrition" : "theme"}">

            <img
                class="gym-background-image"
                ${nutrition ? `data-hero="nutrition"` : `data-theme-id="${theme.id}"`}
                src="${nutrition ? GYM_NUTRITION_IMAGE : GYM_IMAGES[theme.id]}"
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
