import "./BottomSheet.css";

// Genérico a propósito (primer bottom-sheet/action-sheet de la app,
// pensado para reutilizarse fuera de Plan) -- solo pinta opciones, quien
// lo use decide qué data-action lleva cada una y qué hace cada acción.
// El backdrop cierra al tocar fuera del panel: initPlanEvents.js (o quien
// lo use) comprueba `event.target === event.currentTarget` en el propio
// backdrop, así el click que llega desde dentro del panel (que sí
// burbujea hasta aquí) no cuenta como "fuera".
export function BottomSheet({ title, options, closeAction }) {

    return `

        <div class="bottom-sheet-backdrop" data-action="${closeAction}">

            <div class="bottom-sheet-panel">

                <span class="bottom-sheet-handle"></span>

                ${title ? `<h3 class="bottom-sheet-title">${title}</h3>` : ""}

                <div class="bottom-sheet-options">

                    ${options.map(option => `

                        <button class="bottom-sheet-option" data-action="${option.action}">

                            <iconify-icon icon="${option.icon}"></iconify-icon>

                            <span>

                                ${option.label}

                                ${option.hint ? `<small>${option.hint}</small>` : ""}

                            </span>

                        </button>

                    `).join("")}

                </div>

            </div>

        </div>

    `;

}
