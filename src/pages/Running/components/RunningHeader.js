import "./RunningHeader.css";
import { themeManager } from "../../../theme/themeManager.js";
import { RUNNING_IMAGES } from "../../../assets/running";

// Foto-por-tema propia de Running, mismo mecanismo que PlanHeader.js
// (themeManager decide el tema, un mapa de imágenes por tema decide la
// foto) pero con su propio set de imágenes.
export function RunningHeader() {

    const theme = themeManager.getTheme();

    return `

    <header class="running-header">

        <img
            class="running-background-image"
            src="${RUNNING_IMAGES[theme.id]}"
            alt=""
        >

        <div class="running-overlay"></div>

        <div class="running-glow"></div>

        <div class="running-bottom-fade"></div>

        <div class="running-header-content">

            <div class="running-header-row">

                <div class="running-header-title">

                    <h1>Running</h1>

                    <p class="running-subtitle">Compara tu progreso</p>

                </div>

                <div class="running-header-actions">

                    <button class="running-import-button" data-action="open-wizard">

                        <iconify-icon icon="solar:add-circle-bold-duotone"></iconify-icon>

                        Importar

                    </button>

                </div>

            </div>

        </div>

    </header>

    `;

}
