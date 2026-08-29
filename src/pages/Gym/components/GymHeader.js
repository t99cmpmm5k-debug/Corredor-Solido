import "./GymHeader.css";

import { themeManager } from "../../../theme/themeManager.js";
import { GYM_IMAGES } from "../../../assets/gym/index.js";

// Foto-por-tema propia de Gimnasio, mismo mecanismo que PlanHeader.js/
// RunningHeader.js/CarrerasHero.js (themeManager decide el tema según la
// hora, un mapa de imágenes por tema decide la foto) -- ni una franja
// horaria nueva ni un selector propio, se reutiliza tal cual. Texto fijo
// (no dinámico como el Hero de Inicio con heroData.js) a propósito: "MÁS
// FUERTE / MÁS SÓLIDO" en vez de "CONSTRUYE FUERZA" (que Inicio ya usa
// cuando hoy toca gimnasio) para no repetir el mismo texto en dos sitios
// que el usuario puede ver en la misma sesión.
export function GymHeader() {

    const theme = themeManager.getTheme();

    return `

        <header class="gym-header">

            <img
                class="gym-background-image"
                data-theme-id="${theme.id}"
                src="${GYM_IMAGES[theme.id]}"
                alt=""
            >

            <div class="gym-header-overlay"></div>

            <div class="gym-header-glow"></div>

            <div class="gym-header-bottom-fade"></div>

            <div class="gym-header-content">

                <div class="gym-header-row">

                    <div class="gym-header-title">

                        <h1>MÁS FUERTE<br>MÁS SÓLIDO</h1>

                        <p class="gym-header-subtitle">Cada repetición suma a tu rendimiento.</p>

                    </div>

                    <!-- "+" en vez del botón grande "Nueva rutina" (mismo
                         patrón que .plan-add-button en PlanHeader.js) --
                         mismo data-action de siempre, solo cambia dónde
                         vive el botón. -->
                    <button class="gym-add-button" data-action="open-routine-builder" aria-label="Nueva rutina">

                        +

                    </button>

                </div>

            </div>

        </header>

    `;

}
